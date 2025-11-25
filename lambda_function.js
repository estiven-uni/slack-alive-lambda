/**
 * SLACK ALIVE - Lambda Function (Node.js ES Modules)
 * Mantén tu estado de Slack siempre activo usando solo la API
 * Adaptado para AWS Lambda con horarios de trabajo (Colombia)
 */

import https from 'https';

// Configuración
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TIMEZONE_COLOMBIA = 'America/Bogota';

// Horarios de trabajo configurables desde variables de entorno (hora de Colombia)
// Valores por defecto si no están configurados
const HORA_INICIO = parseInt(process.env.HORA_INICIO || '8');  // 8:00 AM por defecto
const HORA_FIN = parseInt(process.env.HORA_FIN || '17');        // 5:00 PM por defecto
const HORA_ALMUERZO_INICIO = parseInt(process.env.HORA_ALMUERZO_INICIO || '13');  // 1:00 PM por defecto
const HORA_ALMUERZO_FIN = parseInt(process.env.HORA_ALMUERZO_FIN || '14');       // 2:00 PM por defecto

// Cache de días festivos (para evitar múltiples llamadas a la API)
let cacheFestivos = {};
const CACHE_DURACION = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

// Días festivos de respaldo (fallback si la API falla)
const DIAS_FESTIVOS_FALLBACK = {
    '2025': [
        '2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18',
        '2025-05-01', '2025-05-12', '2025-06-02', '2025-06-23', '2025-06-30',
        '2025-07-20', '2025-08-07', '2025-08-18', '2025-10-13', '2025-11-03',
        '2025-11-17', '2025-12-08', '2025-12-25'
    ],
    '2026': [
        '2026-01-01', '2026-01-06', '2026-03-23', '2026-04-02', '2026-04-03',
        '2026-05-01', '2026-05-25', '2026-06-15', '2026-06-22', '2026-06-29',
        '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02',
        '2026-11-16', '2026-12-08', '2026-12-25'
    ]
};

/**
 * Obtiene la hora actual en zona horaria de Colombia
 */
function obtenerHoraColombia() {
    const ahora = new Date();
    // Convertir a hora de Colombia
    const horaColombia = new Date(ahora.toLocaleString('en-US', { timeZone: TIMEZONE_COLOMBIA }));
    return horaColombia;
}

/**
 * Formatea la hora en formato AM/PM
 */
function formatearHoraAMPM(fecha) {
    let horas = fecha.getHours();
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    const ampm = horas >= 12 ? 'PM' : 'AM';
    
    // Convertir a formato 12 horas
    horas = horas % 12;
    horas = horas ? horas : 12; // Si es 0, mostrar 12
    
    return `${horas}:${minutos} ${ampm}`;
}

/**
 * Formatea una fecha como YYYY-MM-DD
 */
function formatearFecha(fecha) {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

/**
 * Obtiene los días festivos de Colombia desde la API de Nager.Date
 * Usa cache para evitar múltiples llamadas
 */
async function obtenerDiasFestivos(año) {
    const añoStr = String(año);
    
    // Verificar cache
    if (cacheFestivos[añoStr] && cacheFestivos[añoStr].timestamp) {
        const ahora = Date.now();
        if (ahora - cacheFestivos[añoStr].timestamp < CACHE_DURACION) {
            return cacheFestivos[añoStr].festivos;
        }
    }
    
    try {
        const url = `https://date.nager.at/api/v3/PublicHolidays/${año}/CO`;
        
        return new Promise((resolve) => {
            const options = {
                hostname: 'date.nager.at',
                port: 443,
                path: `/api/v3/PublicHolidays/${año}/CO`,
                method: 'GET',
                timeout: 5000
            };
            
            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const festivos = JSON.parse(responseData);
                        // Extraer solo las fechas en formato YYYY-MM-DD
                        const fechas = festivos.map(f => f.date);
                        const nombres = festivos.map(f => f.localName);
                        
                        // Guardar en cache
                        cacheFestivos[añoStr] = {
                            festivos: fechas,
                            timestamp: Date.now()
                        };
                        
                        console.log(`✅ Días festivos ${año} obtenidos de API: ${fechas.length} días`);
                        console.log(`📅 Días festivos: ${nombres.join(', ')}`);
                        resolve(fechas);
                    } catch (error) {
                        console.warn(`⚠️ Error parseando respuesta API festivos: ${error.message}`);
                        // Usar fallback
                        resolve(DIAS_FESTIVOS_FALLBACK[añoStr] || []);
                    }
                });
            });
            
            req.on('error', (error) => {
                console.warn(`⚠️ Error consultando API festivos: ${error.message}`);
                // Usar fallback
                resolve(DIAS_FESTIVOS_FALLBACK[añoStr] || []);
            });
            
            req.on('timeout', () => {
                req.destroy();
                console.warn('⚠️ Timeout consultando API festivos, usando fallback');
                resolve(DIAS_FESTIVOS_FALLBACK[añoStr] || []);
            });
            
            req.end();
        });
    } catch (error) {
        console.warn(`⚠️ Error obteniendo días festivos: ${error.message}`);
        return DIAS_FESTIVOS_FALLBACK[añoStr] || [];
    }
}

/**
 * Verifica si es un día festivo de Colombia
 * Consulta la API automáticamente si es necesario
 */
async function esDiaFestivo(fecha) {
    const fechaFormato = formatearFecha(fecha);
    const año = fecha.getFullYear();
    
    // Obtener días festivos del año (con cache)
    const diasFestivos = await obtenerDiasFestivos(año);
    
    return diasFestivos.includes(fechaFormato);
}

/**
 * Verifica si estamos en horario laboral
 * Horario: 8am-5pm, excepto 1pm-2pm (almuerzo)
 * No trabaja: sábados, domingos y días festivos de Colombia
 */
async function estaEnHorarioLaboral() {
    const ahora = obtenerHoraColombia();
    const horaActual = ahora.getHours();
    const diaSemana = ahora.getDay(); // 0=Domingo, 6=Sábado
    
    // Verificar si es día festivo (consulta API automáticamente)
    if (await esDiaFestivo(ahora)) {
        return false;
    }
    
    // Verificar si es día laboral (lunes a viernes)
    if (diaSemana === 0 || diaSemana === 6) { // Domingo o Sábado
        return false;
    }
    
    // Verificar horario laboral (8am-5pm)
    if (horaActual < HORA_INICIO || horaActual >= HORA_FIN) {
        return false;
    }
    
    // Verificar horario de almuerzo (1pm-2pm)
    if (horaActual >= HORA_ALMUERZO_INICIO && horaActual < HORA_ALMUERZO_FIN) {
        return false;
    }
    
    return true;
}

/**
 * Hace una petición HTTP POST a la API de Slack
 */
function hacerPeticionSlack(endpoint, data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        
        const options = {
            hostname: 'slack.com',
            port: 443,
            path: `/api/${endpoint}`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SLACK_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 5000
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(responseData);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error(`Error parseando respuesta: ${error.message}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout en la petición'));
        });
        
        req.write(postData);
        req.end();
    });
}

/**
 * Detecta si un error es crítico y requiere notificación
 */
function esErrorCritico(errorMsg) {
    const erroresCriticos = [
        'invalid_auth',
        'token_revoked',
        'account_inactive',
        'missing_scope',
        'not_authed'
    ];
    return erroresCriticos.includes(errorMsg);
}

/**
 * Obtiene el estado actual de Slack usando la API
 * Returns: 'active', 'away', o 'error'
 */
async function obtenerEstadoSlack() {
    if (!SLACK_TOKEN) {
        const mensaje = `🔴 <b>ERROR CRÍTICO: Token de Slack no configurado</b>\n\n` +
                       `El token SLACK_TOKEN no está configurado en las variables de entorno.\n` +
                       `Configura el token en Lambda → Configuración → Variables de entorno.`;
        await enviarNotificacionTelegram(mensaje);
        console.error('ERROR: SLACK_TOKEN no configurado');
        return 'error';
    }
    
    try {
        const response = await hacerPeticionSlack('users.getPresence', {});
        
        if (response.ok) {
            const presence = response.presence || 'unknown';
            const online = response.online || false;
            const connectionCount = response.connection_count || 0;
            
            // Solo mostrar warning si no hay sesión activa
            if (!online && connectionCount === 0) {
                console.warn('⚠️ Slack NO detecta sesión activa (online=false, connections=0)');
            }
            
            return presence;
        } else {
            const errorMsg = response.error || 'unknown';
            console.error(`Error de API: ${errorMsg}`);
            
            // Si es error crítico, enviar notificación
            if (esErrorCritico(errorMsg)) {
                const ahora = obtenerHoraColombia();
                const horaFormato = formatearHoraAMPM(ahora);
                const fechaFormato = formatearFecha(ahora);
                
                let mensajeError = '';
                if (errorMsg === 'invalid_auth' || errorMsg === 'token_revoked') {
                    mensajeError = `🔴 <b>ERROR CRÍTICO: Token de Slack inválido o revocado</b>\n\n` +
                                  `Fecha: ${fechaFormato}\n` +
                                  `Hora: ${horaFormato}\n` +
                                  `Error: ${errorMsg}\n\n` +
                                  `El token de Slack ha expirado o fue revocado.\n` +
                                  `Genera un nuevo token en https://api.slack.com/apps`;
                } else if (errorMsg === 'missing_scope') {
                    mensajeError = `🔴 <b>ERROR: Token sin permisos necesarios</b>\n\n` +
                                  `Fecha: ${fechaFormato}\n` +
                                  `Hora: ${horaFormato}\n` +
                                  `Error: ${errorMsg}\n\n` +
                                  `El token necesita el scope: ${response.needed || 'users:write'}\n` +
                                  `Agrega el scope en https://api.slack.com/apps`;
                } else {
                    mensajeError = `🔴 <b>ERROR CRÍTICO en Slack API</b>\n\n` +
                                  `Fecha: ${fechaFormato}\n` +
                                  `Hora: ${horaFormato}\n` +
                                  `Error: ${errorMsg}\n\n` +
                                  `Revisa la configuración del token.`;
                }
                
                await enviarNotificacionTelegram(mensajeError);
            }
            
            return 'error';
        }
    } catch (error) {
        console.error(`Error de conexión: ${error.message}`);
        
        // Notificar errores de conexión persistentes
        const ahora = obtenerHoraColombia();
        const horaFormato = formatearHoraAMPM(ahora);
        const mensaje = `⚠️ <b>Error de conexión con Slack API</b>\n\n` +
                       `Hora: ${horaFormato}\n` +
                       `Error: ${error.message}\n\n` +
                       `Verificando conectividad...`;
        await enviarNotificacionTelegram(mensaje);
        
        return 'error';
    }
}

/**
 * Establece el estado de Slack como 'auto' (activo)
 * Returns: True si fue exitoso, False en caso contrario
 */
async function establecerEstadoActivo() {
    if (!SLACK_TOKEN) {
        console.error('ERROR: SLACK_TOKEN no configurado');
        return false;
    }
    
    try {
        const response = await hacerPeticionSlack('users.setPresence', {
            presence: 'auto'
        });
        
        if (response.ok) {
            return true;
        } else {
            const errorMsg = response.error || 'unknown';
            const needed = response.needed || '';
            
            // Si es error crítico, ya se notificó en obtenerEstadoSlack, solo loguear
            if (esErrorCritico(errorMsg)) {
                if (errorMsg === 'missing_scope') {
                    console.error(`❌ ERROR: Token sin permiso necesario: ${needed}`);
                } else {
                    console.error(`❌ Error crítico al establecer estado: ${errorMsg}`);
                }
            } else {
                console.error(`❌ Error al establecer estado: ${errorMsg}`);
            }
            
            return false;
        }
    } catch (error) {
        console.error(`❌ Error de conexión: ${error.message}`);
        return false;
    }
}

/**
 * Establece el estado de Slack como 'away' (ausente)
 * Returns: True si fue exitoso, False en caso contrario
 */
async function establecerEstadoAusente() {
    if (!SLACK_TOKEN) {
        console.error('ERROR: SLACK_TOKEN no configurado');
        return false;
    }
    
    try {
        const response = await hacerPeticionSlack('users.setPresence', {
            presence: 'away'
        });
        
        if (response.ok) {
            return true;
        } else {
            const errorMsg = response.error || 'unknown';
            const needed = response.needed || '';
            
            // Si es error crítico, ya se notificó en obtenerEstadoSlack, solo loguear
            if (esErrorCritico(errorMsg)) {
                if (errorMsg === 'missing_scope') {
                    console.error(`❌ ERROR: Token sin permiso necesario: ${needed}`);
                } else {
                    console.error(`❌ Error crítico al establecer estado ausente: ${errorMsg}`);
                }
            } else {
                console.error(`❌ Error al establecer estado ausente: ${errorMsg}`);
            }
            
            return false;
        }
    } catch (error) {
        console.error(`❌ Error de conexión: ${error.message}`);
        return false;
    }
}

/**
 * Envía un mensaje a Telegram con opciones de teclado
 */
async function enviarNotificacionTelegram(mensaje, chatId = null, replyToMessageId = null, replyKeyboard = null, inlineKeyboard = null) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.warn('⚠️ Telegram no configurado - TELEGRAM_BOT_TOKEN faltante');
        return false;
    }
    
    const targetChatId = chatId || TELEGRAM_CHAT_ID;
    if (!targetChatId) {
        console.warn('⚠️ Telegram no configurado - TELEGRAM_CHAT_ID faltante');
        return false;
    }
    
    try {
        const messageData = {
            chat_id: targetChatId,
            text: mensaje,
            parse_mode: 'HTML'
        };
        
        if (replyToMessageId) {
            messageData.reply_to_message_id = replyToMessageId;
        }
        
        if (replyKeyboard) {
            messageData.reply_markup = {
                keyboard: replyKeyboard,
                resize_keyboard: true,
                one_time_keyboard: false
            };
        }
        
        if (inlineKeyboard) {
            messageData.reply_markup = {
                inline_keyboard: inlineKeyboard
            };
        }
        
        const postData = JSON.stringify(messageData);
        
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 5000
        };
        
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(responseData);
                        if (jsonData.ok) {
                            console.log('✅ Notificación Telegram enviada');
                            resolve(true);
                        } else {
                            console.error(`❌ Error Telegram: ${jsonData.description || 'unknown'}`);
                            resolve(false);
                        }
                    } catch (error) {
                        console.error(`❌ Error parseando respuesta Telegram: ${error.message}`);
                        resolve(false);
                    }
                });
            });
            
            req.on('error', (error) => {
                console.error(`❌ Error de conexión Telegram: ${error.message}`);
                resolve(false);
            });
            
            req.on('timeout', () => {
                req.destroy();
                console.error('❌ Timeout en petición Telegram');
                resolve(false);
            });
            
            req.write(postData);
            req.end();
        });
    } catch (error) {
        console.error(`❌ Error enviando notificación Telegram: ${error.message}`);
        return false;
    }
}

/**
 * Detecta momentos clave, envía notificaciones y cambia el estado automáticamente
 * Retorna el tipo de acción realizada o null si no hay acción
 */
async function verificarMomentosClave(fecha) {
    const hora = fecha.getHours();
    const minuto = fecha.getMinutes();
    const diaSemana = fecha.getDay();
    
    // Solo verificar en días laborales (lunes a viernes) y que no sea día festivo
    if (diaSemana === 0 || diaSemana === 6 || await esDiaFestivo(fecha)) {
        return null;
    }
    
    const horaFormato = formatearHoraAMPM(fecha);
    const fechaFormato = formatearFecha(fecha);
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const nombreDia = diasSemana[diaSemana];
    let mensaje = null;
    let accion = null;
    
    // Verificar si estamos en un momento clave (solo en el minuto 0 exacto)
    if (minuto === 0) {
        if (hora === HORA_INICIO) {
            // 8:00 AM - Inicio de trabajo: Establecer estado ACTIVO
            console.log(`🌅 Hora de entrada (${horaFormato}) - Estableciendo estado ACTIVO`);
            
            const estadoAntes = await obtenerEstadoSlack();
            
            if (await establecerEstadoActivo()) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const estadoDespues = await obtenerEstadoSlack();
                
                mensaje = `🌅 <b>Inicio de jornada laboral</b>\n\n` +
                         `Fecha: ${fechaFormato} (${nombreDia})\n` +
                         `Hora: ${horaFormato}\n\n` +
                         `✅ Estado establecido como ACTIVO`;
                
                console.log(`✅ Estado establecido como ACTIVO en hora de entrada (${horaFormato})`);
                accion = 'establecido_activo_entrada';
            } else {
                mensaje = `🌅 <b>Inicio de jornada laboral</b>\n\n` +
                         `Fecha: ${fechaFormato} (${nombreDia})\n` +
                         `Hora: ${horaFormato}\n\n` +
                         `⚠️ Error al establecer estado ACTIVO`;
                
                console.error(`❌ Error al establecer estado ACTIVO en hora de entrada (${horaFormato})`);
                accion = 'error_entrada';
            }
            
        } else if (hora === HORA_ALMUERZO_INICIO) {
            // 1:00 PM - Hora de almuerzo: Establecer estado AUSENTE
            console.log(`🍽️ Hora de almuerzo (${horaFormato}) - Estableciendo estado AUSENTE`);
            
            const estadoAntes = await obtenerEstadoSlack();
            
            if (await establecerEstadoAusente()) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const estadoDespues = await obtenerEstadoSlack();
                
                mensaje = `🍽️ <b>Hora de almuerzo</b>\n\n` +
                         `Fecha: ${fechaFormato} (${nombreDia})\n` +
                         `Hora: ${horaFormato}\n` +
                         `Regreso: ${HORA_ALMUERZO_FIN}:00 PM\n\n` +
                         `✅ Estado establecido como AUSENTE`;
                
                console.log(`✅ Estado establecido como AUSENTE en hora de almuerzo (${horaFormato})`);
                accion = 'establecido_ausente_almuerzo';
            } else {
                mensaje = `🍽️ <b>Hora de almuerzo</b>\n\n` +
                         `Fecha: ${fechaFormato} (${nombreDia})\n` +
                         `Hora: ${horaFormato}\n\n` +
                         `⚠️ Error al establecer estado AUSENTE`;
                
                console.error(`❌ Error al establecer estado AUSENTE en hora de almuerzo (${horaFormato})`);
                accion = 'error_almuerzo';
            }
            
        } else if (hora === HORA_ALMUERZO_FIN) {
            // 2:00 PM - Vuelta del almuerzo: Establecer estado ACTIVO
            console.log(`⏰ Vuelta del almuerzo (${horaFormato}) - Estableciendo estado ACTIVO`);
            
            const estadoAntes = await obtenerEstadoSlack();
            
            if (await establecerEstadoActivo()) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const estadoDespues = await obtenerEstadoSlack();
                
                mensaje = `⏰ <b>Vuelta del almuerzo</b>\n\n` +
                         `Fecha: ${fechaFormato} (${nombreDia})\n` +
                         `Hora: ${horaFormato}\n\n` +
                         `✅ Estado establecido como ACTIVO`;
                
                console.log(`✅ Estado establecido como ACTIVO en vuelta del almuerzo (${horaFormato})`);
                accion = 'establecido_activo_vuelta_almuerzo';
            } else {
                mensaje = `⏰ <b>Vuelta del almuerzo</b>\n\n` +
                         `Fecha: ${fechaFormato} (${nombreDia})\n` +
                         `Hora: ${horaFormato}\n\n` +
                         `⚠️ Error al establecer estado ACTIVO`;
                
                console.error(`❌ Error al establecer estado ACTIVO en vuelta del almuerzo (${horaFormato})`);
                accion = 'error_vuelta_almuerzo';
            }
            
        } else if (hora === HORA_FIN) {
            // 5:00 PM - Fin de trabajo: Establecer estado AUSENTE
            console.log(`🏠 Hora de salida (${horaFormato}) - Estableciendo estado AUSENTE`);
            
            const estadoAntes = await obtenerEstadoSlack();
            
            if (await establecerEstadoAusente()) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const estadoDespues = await obtenerEstadoSlack();
                
                mensaje = `🏠 <b>Fin de jornada laboral</b>\n\n` +
                         `Fecha: ${fechaFormato} (${nombreDia})\n` +
                         `Hora: ${horaFormato}\n\n` +
                         `✅ Estado establecido como AUSENTE`;
                
                console.log(`✅ Estado establecido como AUSENTE en hora de salida (${horaFormato})`);
                accion = 'establecido_ausente_salida';
            } else {
                mensaje = `🏠 <b>Fin de jornada laboral</b>\n\n` +
                         `Fecha: ${fechaFormato} (${nombreDia})\n` +
                         `Hora: ${horaFormato}\n\n` +
                         `⚠️ Error al establecer estado AUSENTE`;
                
                console.error(`❌ Error al establecer estado AUSENTE en hora de salida (${horaFormato})`);
                accion = 'error_salida';
            }
        }
    }
    
    if (mensaje) {
        await enviarNotificacionTelegram(mensaje);
        console.log(`📱 Notificación de momento clave enviada: ${horaFormato}`);
    }
    
    return accion;
}

/**
 * Crea el teclado principal con botones
 */
function crearTecladoPrincipal() {
    return [
        [
            { text: '📊 Estado' },
            { text: '⚙️ Configuración' }
        ],
        [
            { text: '🟢 Activo' },
            { text: '🟡 Ausente' }
        ],
        [
            { text: 'ℹ️ Info' },
            { text: '🕐 Horario' }
        ],
        [
            { text: '🧪 Test' },
            { text: '❓ Ayuda' }
        ]
    ];
}

/**
 * Crea teclado inline para acciones rápidas
 */
function crearTecladoInline() {
    return [
        [
            { text: '🟢 Activo', callback_data: 'set_active' },
            { text: '🟡 Ausente', callback_data: 'set_away' }
        ],
        [
            { text: '📊 Ver Estado', callback_data: 'get_status' },
            { text: 'ℹ️ Info', callback_data: 'get_info' }
        ],
        [
            { text: '🕐 Horario', callback_data: 'get_horario' },
            { text: '🧪 Test', callback_data: 'test_connection' }
        ]
    ];
}

/**
 * Configura los comandos del bot en Telegram para autocompletado
 */
async function configurarComandosBot(chatId = null) {
    if (!TELEGRAM_BOT_TOKEN) {
        return false;
    }
    
    const comandos = [
        {
            command: 'start',
            description: 'Iniciar el bot y ver el menú principal'
        },
        {
            command: 'status',
            description: 'Ver el estado actual de Slack'
        },
        {
            command: 'setactive',
            description: 'Establecer estado ACTIVO en Slack'
        },
        {
            command: 'setaway',
            description: 'Establecer estado AUSENTE en Slack'
        },
        {
            command: 'info',
            description: 'Ver información del sistema'
        },
        {
            command: 'horario',
            description: 'Ver horario laboral configurado'
        },
        {
            command: 'sethorario',
            description: 'Configurar nuevos horarios'
        },
        {
            command: 'test',
            description: 'Probar conexión con Slack'
        },
        {
            command: 'help',
            description: 'Ver ayuda y comandos disponibles'
        }
    ];
    
    try {
        const postData = JSON.stringify({
            commands: comandos,
            scope: chatId ? {
                type: 'chat',
                chat_id: chatId
            } : { type: 'default' }
        });
        
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 5000
        };
        
        return new Promise((resolve) => {
            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(responseData);
                        if (jsonData.ok) {
                            console.log('✅ Comandos configurados en Telegram');
                            resolve(true);
                        } else {
                            console.warn(`⚠️ Error configurando comandos: ${jsonData.description || 'unknown'}`);
                            resolve(false);
                        }
                    } catch (error) {
                        console.warn(`⚠️ Error parseando respuesta: ${error.message}`);
                        resolve(false);
                    }
                });
            });
            
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            
            req.write(postData);
            req.end();
        });
    } catch (error) {
        console.warn(`⚠️ Error configurando comandos: ${error.message}`);
        return false;
    }
}

/**
 * Responde a un callback de botón inline
 */
async function responderCallback(callbackId) {
    if (!TELEGRAM_BOT_TOKEN) {
        return false;
    }
    
    try {
        const postData = JSON.stringify({
            callback_query_id: callbackId
        });
        
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 5000
        };
        
        return new Promise((resolve) => {
            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(responseData);
                        resolve(jsonData.ok || false);
                    } catch (error) {
                        resolve(false);
                    }
                });
            });
            
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            
            req.write(postData);
            req.end();
        });
    } catch (error) {
        return false;
    }
}

/**
 * Procesa comandos de Telegram y mensajes de texto
 */
async function procesarComandoTelegram(comando, chatId, messageId, esTexto = false, textoCompleto = '') {
    const ahora = obtenerHoraColombia();
    const horaFormato = formatearHoraAMPM(ahora);
    const fechaFormato = formatearFecha(ahora);
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const nombreDia = diasSemana[ahora.getDay()];
    
    // Mapeo de textos a comandos
    const textoAComando = {
        '📊 estado': '/status',
        'estado': '/status',
        '⚙️ configuración': '/horario',
        'configuración': '/horario',
        '🟢 activo': '/setactive',
        'activo': '/setactive',
        '🟡 ausente': '/setaway',
        'ausente': '/setaway',
        'ℹ️ info': '/info',
        'info': '/info',
        '🕐 horario': '/horario',
        'horario': '/horario',
        '🧪 test': '/test',
        'test': '/test',
        '❓ ayuda': '/help',
        'ayuda': '/help'
    };
    
    // Si es texto y está en el mapeo, convertir a comando
    if (esTexto && textoAComando[comando.toLowerCase()]) {
        comando = textoAComando[comando.toLowerCase()];
    }
    
    switch (comando) {
        case '/start':
        case '/help':
            // Configurar comandos del bot automáticamente al iniciar
            await configurarComandosBot(chatId);
            
            const teclado = crearTecladoPrincipal();
            return await enviarNotificacionTelegram(
                `🤖 <b>Slack Alive Bot</b>\n\n` +
                `¡Bienvenido! Usa los botones de abajo para controlar tu estado de Slack.\n\n` +
                `💡 <i>También puedes escribir "/" para ver comandos con autocompletado o usar los botones.</i>`,
                chatId,
                messageId,
                teclado
            );
        
        case '/status':
            const estadoActual = await obtenerEstadoSlack();
            const enHorarioLaboral = await estaEnHorarioLaboral();
            const esFestivo = await esDiaFestivo(ahora);
            
            let estadoTexto = '';
            if (estadoActual === 'active') {
                estadoTexto = '🟢 ACTIVO';
            } else if (estadoActual === 'away') {
                estadoTexto = '🟡 AUSENTE';
            } else {
                estadoTexto = '🔴 ERROR';
            }
            
            let horarioTexto = '';
            if (esFestivo) {
                horarioTexto = '📅 Día festivo';
            } else if (enHorarioLaboral) {
                horarioTexto = '✅ En horario laboral';
            } else {
                horarioTexto = '⏸️ Fuera de horario laboral';
            }
            
            const tecladoEstado = crearTecladoInline();
            return await enviarNotificacionTelegram(
                `📊 <b>Estado Actual de Slack</b>\n\n` +
                `Estado: ${estadoTexto}\n` +
                `Horario: ${horarioTexto}\n\n` +
                `📅 Fecha: ${fechaFormato} (${nombreDia})\n` +
                `🕐 Hora: ${horaFormato}\n` +
                `🌍 Zona horaria: Colombia (America/Bogota)`,
                chatId,
                messageId,
                null,
                tecladoEstado
            );
        
        case '/setactive':
            const resultadoActivo = await establecerEstadoActivo();
            if (resultadoActivo) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const estadoDespues = await obtenerEstadoSlack();
                const tecladoAccion = crearTecladoInline();
                return await enviarNotificacionTelegram(
                    `✅ <b>Estado establecido como ACTIVO</b>\n\n` +
                    `Estado actual: ${estadoDespues === 'active' ? '🟢 ACTIVO' : '⚠️ ' + estadoDespues}\n` +
                    `Hora: ${horaFormato}`,
                    chatId,
                    messageId,
                    null,
                    tecladoAccion
                );
            } else {
                return await enviarNotificacionTelegram(
                    `❌ <b>Error al establecer estado ACTIVO</b>\n\n` +
                    `Revisa los logs de Lambda para más detalles.`,
                    chatId,
                    messageId
                );
            }
        
        case '/setaway':
            const resultadoAusente = await establecerEstadoAusente();
            if (resultadoAusente) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const estadoDespues = await obtenerEstadoSlack();
                const tecladoAccion = crearTecladoInline();
                return await enviarNotificacionTelegram(
                    `🏠 <b>Estado establecido como AUSENTE</b>\n\n` +
                    `Estado actual: ${estadoDespues === 'away' ? '🟡 AUSENTE' : '⚠️ ' + estadoDespues}\n` +
                    `Hora: ${horaFormato}`,
                    chatId,
                    messageId,
                    null,
                    tecladoAccion
                );
            } else {
                return await enviarNotificacionTelegram(
                    `❌ <b>Error al establecer estado AUSENTE</b>\n\n` +
                    `Revisa los logs de Lambda para más detalles.`,
                    chatId,
                    messageId
                );
            }
        
        case '/info':
            const enHorario = await estaEnHorarioLaboral();
            const esFestivoInfo = await esDiaFestivo(ahora);
            const estadoInfo = await obtenerEstadoSlack();
            
            return await enviarNotificacionTelegram(
                `ℹ️ <b>Información del Sistema</b>\n\n` +
                `<b>Estado Slack:</b> ${estadoInfo === 'active' ? '🟢 ACTIVO' : estadoInfo === 'away' ? '🟡 AUSENTE' : '🔴 ERROR'}\n` +
                `<b>Horario laboral:</b> ${enHorario ? '✅ Activo' : '⏸️ Inactivo'}\n` +
                `<b>Día festivo:</b> ${esFestivoInfo ? '📅 Sí' : '❌ No'}\n\n` +
                `<b>Configuración:</b>\n` +
                `Inicio: ${HORA_INICIO}:00 AM\n` +
                `Fin: ${HORA_FIN}:00 PM\n` +
                `Almuerzo: ${HORA_ALMUERZO_INICIO}:00 PM - ${HORA_ALMUERZO_FIN}:00 PM\n\n` +
                `<b>Fecha/Hora:</b>\n` +
                `${fechaFormato} (${nombreDia})\n` +
                `${horaFormato} (Colombia)`,
                chatId,
                messageId
            );
        
        case '/horario':
            return await enviarNotificacionTelegram(
                `🕐 <b>Horario Laboral Configurado</b>\n\n` +
                `<b>Horario de trabajo:</b>\n` +
                `Inicio: ${HORA_INICIO}:00 ${HORA_INICIO < 12 ? 'AM' : 'PM'}\n` +
                `Fin: ${HORA_FIN}:00 ${HORA_FIN < 12 ? 'AM' : 'PM'}\n\n` +
                `<b>Horario de almuerzo:</b>\n` +
                `${HORA_ALMUERZO_INICIO}:00 ${HORA_ALMUERZO_INICIO < 12 ? 'AM' : 'PM'} - ${HORA_ALMUERZO_FIN}:00 ${HORA_ALMUERZO_FIN < 12 ? 'AM' : 'PM'}\n\n` +
                `<b>Días laborales:</b> Lunes a Viernes\n` +
                `<b>Días no laborales:</b> Sábados, Domingos y días festivos de Colombia\n\n` +
                `💡 Usa /sethorario para cambiar estos horarios`,
                chatId,
                messageId
            );
        
        case '/sethorario':
            // Parsear parámetros del comando
            // Formato: /sethorario inicio=8 fin=17 almuerzo_inicio=13 almuerzo_fin=14
            const partes = textoCompleto.split(' ').slice(1);
            const parametros = {};
            
            partes.forEach(parte => {
                const [key, value] = parte.split('=');
                if (key && value) {
                    parametros[key.toLowerCase()] = parseInt(value);
                }
            });
            
            if (Object.keys(parametros).length === 0) {
                return await enviarNotificacionTelegram(
                    `⚙️ <b>Configurar Horarios</b>\n\n` +
                    `<b>Formato:</b>\n` +
                    `/sethorario inicio=8 fin=17 almuerzo_inicio=13 almuerzo_fin=14\n\n` +
                    `<b>Parámetros:</b>\n` +
                    `• inicio: Hora de inicio (0-23)\n` +
                    `• fin: Hora de fin (0-23)\n` +
                    `• almuerzo_inicio: Inicio de almuerzo (0-23)\n` +
                    `• almuerzo_fin: Fin de almuerzo (0-23)\n\n` +
                    `<b>Ejemplo:</b>\n` +
                    `/sethorario inicio=9 fin=18 almuerzo_inicio=13 almuerzo_fin=14\n\n` +
                    `<b>Horarios actuales:</b>\n` +
                    `Inicio: ${HORA_INICIO}:00\n` +
                    `Fin: ${HORA_FIN}:00\n` +
                    `Almuerzo: ${HORA_ALMUERZO_INICIO}:00 - ${HORA_ALMUERZO_FIN}:00\n\n` +
                    `⚠️ <i>Nota: Los cambios se aplicarán después de actualizar las variables de entorno en AWS Lambda.</i>`,
                    chatId,
                    messageId
                );
            }
            
            // Validar parámetros
            const nuevoInicio = parametros.inicio !== undefined ? parametros.inicio : HORA_INICIO;
            const nuevoFin = parametros.fin !== undefined ? parametros.fin : HORA_FIN;
            const nuevoAlmuerzoInicio = parametros.almuerzo_inicio !== undefined ? parametros.almuerzo_inicio : HORA_ALMUERZO_INICIO;
            const nuevoAlmuerzoFin = parametros.almuerzo_fin !== undefined ? parametros.almuerzo_fin : HORA_ALMUERZO_FIN;
            
            if (nuevoInicio < 0 || nuevoInicio > 23 || nuevoFin < 0 || nuevoFin > 23 ||
                nuevoAlmuerzoInicio < 0 || nuevoAlmuerzoInicio > 23 || nuevoAlmuerzoFin < 0 || nuevoAlmuerzoFin > 23) {
                return await enviarNotificacionTelegram(
                    `❌ <b>Error: Horarios inválidos</b>\n\n` +
                    `Las horas deben estar entre 0 y 23.\n` +
                    `Usa /sethorario para ver el formato correcto.`,
                    chatId,
                    messageId
                );
            }
            
            // Intentar actualizar variables de entorno usando AWS SDK
            // Por ahora, mostrar instrucciones para actualizar manualmente
            return await enviarNotificacionTelegram(
                `⚙️ <b>Nueva Configuración de Horarios</b>\n\n` +
                `<b>Horarios propuestos:</b>\n` +
                `Inicio: ${nuevoInicio}:00 ${nuevoInicio < 12 ? 'AM' : 'PM'}\n` +
                `Fin: ${nuevoFin}:00 ${nuevoFin < 12 ? 'AM' : 'PM'}\n` +
                `Almuerzo: ${nuevoAlmuerzoInicio}:00 ${nuevoAlmuerzoInicio < 12 ? 'AM' : 'PM'} - ${nuevoAlmuerzoFin}:00 ${nuevoAlmuerzoFin < 12 ? 'AM' : 'PM'}\n\n` +
                `📝 <b>Para aplicar estos cambios:</b>\n` +
                `1. Ve a AWS Lambda Console\n` +
                `2. Selecciona tu función "slack-alive"\n` +
                `3. Ve a Configuration → Environment variables\n` +
                `4. Agrega/edita estas variables:\n` +
                `   • HORA_INICIO = ${nuevoInicio}\n` +
                `   • HORA_FIN = ${nuevoFin}\n` +
                `   • HORA_ALMUERZO_INICIO = ${nuevoAlmuerzoInicio}\n` +
                `   • HORA_ALMUERZO_FIN = ${nuevoAlmuerzoFin}\n` +
                `5. Guarda los cambios\n\n` +
                `💡 <i>Los cambios se aplicarán automáticamente en la próxima ejecución.</i>`,
                chatId,
                messageId
            );
        
        case '/test':
            const estadoTest = await obtenerEstadoSlack();
            const conexionOk = estadoTest !== 'error';
            
            return await enviarNotificacionTelegram(
                `🧪 <b>Prueba de Conexión</b>\n\n` +
                `Conexión Slack: ${conexionOk ? '✅ OK' : '❌ ERROR'}\n` +
                `Estado actual: ${estadoTest === 'active' ? '🟢 ACTIVO' : estadoTest === 'away' ? '🟡 AUSENTE' : '🔴 ERROR'}\n\n` +
                `${conexionOk ? '✅ La conexión con Slack está funcionando correctamente.' : '❌ Hay un problema con la conexión. Revisa los logs.'}`,
                chatId,
                messageId
            );
        
        default:
            const tecladoDefault = crearTecladoPrincipal();
            return await enviarNotificacionTelegram(
                `❓ <b>Comando no reconocido</b>\n\n` +
                `Usa los botones de abajo o escribe /help para ver la lista de comandos disponibles.`,
                chatId,
                messageId,
                tecladoDefault
            );
    }
}

/**
 * Handler para webhooks de Telegram
 * Se ejecuta cuando Telegram envía un mensaje al bot
 */
export const telegramHandler = async (event, context) => {
    try {
        console.log('📱 Evento recibido de Telegram:', JSON.stringify(event));
        
        // Parsear el body del evento (Lambda Function URL envía el body como string)
        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseError) {
            console.error('❌ Error parseando body:', parseError.message);
            return {
                statusCode: 200,
                body: JSON.stringify({ ok: true, message: 'Error parseando body' })
            };
        }
        
        // Manejar callbacks de botones inline
        if (body.callback_query) {
            const callback = body.callback_query;
            const chatId = callback.message.chat.id;
            const messageId = callback.message.message_id;
            const callbackData = callback.data;
            const callbackId = callback.id;
            
            console.log(`🔘 Callback recibido: ${callbackData} de chat ${chatId}`);
            
            // Verificar autorización
            if (TELEGRAM_CHAT_ID && String(chatId) !== String(TELEGRAM_CHAT_ID)) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ ok: true })
                };
            }
            
            // Responder al callback primero (para quitar el "loading" del botón)
            await responderCallback(callbackId);
            
            // Procesar el callback como si fuera un comando
            const comandoMap = {
                'set_active': '/setactive',
                'set_away': '/setaway',
                'get_status': '/status',
                'get_info': '/info',
                'get_horario': '/horario',
                'test_connection': '/test'
            };
            
            const comando = comandoMap[callbackData] || callbackData;
            await procesarComandoTelegram(comando, chatId, messageId, false, comando);
            
            return {
                statusCode: 200,
                body: JSON.stringify({ ok: true })
            };
        }
        
        // Verificar que sea un mensaje válido
        if (!body || !body.message) {
            console.log('⚠️ No es un mensaje válido');
            return {
                statusCode: 200,
                body: JSON.stringify({ ok: true, message: 'No es un mensaje válido' })
            };
        }
        
        const message = body.message;
        
        // Verificar que tenga texto (puede ser un comando o mensaje normal)
        if (!message.text) {
            console.log('⚠️ Mensaje sin texto');
            return {
                statusCode: 200,
                body: JSON.stringify({ ok: true, message: 'Mensaje sin texto' })
            };
        }
        
        const chatId = message.chat.id;
        const messageId = message.message_id;
        const text = message.text.trim();
        
        console.log(`📱 Mensaje recibido de chat ${chatId}: ${text}`);
        
        // Verificar que el comando venga del chat autorizado (si está configurado)
        // Si TELEGRAM_CHAT_ID no está configurado, acepta mensajes de cualquier chat
        if (TELEGRAM_CHAT_ID && String(chatId) !== String(TELEGRAM_CHAT_ID)) {
            console.warn(`⚠️ Mensaje de chat no autorizado: ${chatId} (esperado: ${TELEGRAM_CHAT_ID})`);
            return {
                statusCode: 200,
                body: JSON.stringify({ ok: true, message: 'Chat no autorizado' })
            };
        }
        
        // Procesar texto (puede ser comando o texto de botón)
        let comando = text;
        let esTexto = false;
        
        // Si no empieza con /, es texto de botón
        if (!text.startsWith('/')) {
            esTexto = true;
            comando = text;
        } else {
            // Extraer el comando (puede tener parámetros)
            comando = text.split(' ')[0].toLowerCase();
        }
        
        console.log(`📱 Procesando: ${comando} (${esTexto ? 'texto' : 'comando'}) de chat ${chatId}`);
        
        // Procesar el comando o texto
        await procesarComandoTelegram(comando, chatId, messageId, esTexto, text);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ ok: true })
        };
        
    } catch (error) {
        console.error(`❌ Error procesando comando Telegram: ${error.message}`);
        console.error(`❌ Stack trace: ${error.stack}`);
        return {
            statusCode: 200, // Retornar 200 para que Telegram no siga reintentando
            body: JSON.stringify({ ok: false, error: error.message })
        };
    }
};

/**
 * Handler principal de Lambda
 * Detecta el tipo de evento y ejecuta el handler correspondiente
 */
export const handler = async (event, context) => {
    try {
        // Detectar si es un webhook de Telegram (Lambda Function URL)
        // Los eventos de Telegram vienen con body.message o body.callback_query
        if (event.body) {
            let body;
            try {
                body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            } catch (e) {
                // Si no se puede parsear, probablemente no es Telegram
                body = event.body;
            }
            
            if (body && (body.message || body.callback_query)) {
                console.log('📱 Detectado evento de Telegram');
                return await telegramHandler(event, context);
            }
        }
        
        // Si no es Telegram, es el evento programado de CloudWatch
        console.log('⏰ Detectado evento de CloudWatch');
        return await cloudWatchHandler(event, context);
    } catch (error) {
        console.error(`❌ Error en handler principal: ${error.message}`);
        console.error(`❌ Stack trace: ${error.stack}`);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

/**
 * Handler para eventos programados de CloudWatch
 * Se ejecuta cuando CloudWatch Events dispara la función
 */
async function cloudWatchHandler(event, context) {
    const ahora = obtenerHoraColombia();
    const horaFormato = formatearHoraAMPM(ahora);
    const horaActual = ahora.getHours();
    const minutosActuales = ahora.getMinutes();
    
    // Verificar momentos clave y cambiar estado automáticamente (solo en minuto 0)
    // Si es un momento clave (8am, 1pm, 2pm, 5pm), el cambio de estado ya se hizo
    const accionMomentoClave = await verificarMomentosClave(ahora);
    
    // Si se ejecutó una acción en momento clave, retornar inmediatamente
    if (accionMomentoClave) {
        const estadoDespues = await obtenerEstadoSlack();
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Momento clave procesado',
                hora: horaFormato,
                accion: accionMomentoClave,
                estado_despues: estadoDespues
            })
        };
    }
    
    // Verificar si estamos en horario laboral
    if (!(await estaEnHorarioLaboral())) {
        const diaSemana = ahora.getDay();
        const esDiaLaboral = diaSemana !== 0 && diaSemana !== 6; // Lunes a Viernes
        const esDiaFestivo = await esDiaFestivo(ahora);
        const esHorarioAlmuerzo = horaActual >= HORA_ALMUERZO_INICIO && horaActual < HORA_ALMUERZO_FIN;
        const esDespuesHorarioLaboral = horaActual >= HORA_FIN;
        
        // Si es horario de almuerzo (1pm-2pm) en día laboral, establecer estado como ausente
        // (Solo si no es el minuto exacto de inicio, que ya se procesó en verificarMomentosClave)
        if (esHorarioAlmuerzo && esDiaLaboral && !esDiaFestivo && minutosActuales !== 0) {
            console.log(`🍽️ Horario de almuerzo (${horaFormato}) - Estableciendo estado AUSENTE`);
            
            const estadoAntes = await obtenerEstadoSlack();
            
            if (await establecerEstadoAusente()) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const estadoDespues = await obtenerEstadoSlack();
                
                console.log(`✅ Estado establecido como AUSENTE durante almuerzo (${horaFormato})`);
                
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Estado establecido como ausente (almuerzo)',
                        hora: horaFormato,
                        estado_antes: estadoAntes,
                        estado_despues: estadoDespues,
                        accion: 'establecido_ausente_almuerzo'
                    })
                };
            }
        }
        
        // Si es después de las 5pm (17:00) en día laboral, establecer estado como ausente
        // (Solo si no es el minuto exacto de las 5pm, que ya se procesó en verificarMomentosClave)
        if (esDespuesHorarioLaboral && esDiaLaboral && !esDiaFestivo && minutosActuales !== 0) {
            console.log(`🏠 Fuera de horario laboral (${horaFormato}) - Estableciendo estado AUSENTE`);
            
            const estadoAntes = await obtenerEstadoSlack();
            
            if (await establecerEstadoAusente()) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const estadoDespues = await obtenerEstadoSlack();
                
                console.log(`✅ Estado establecido como AUSENTE (${horaFormato})`);
                
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Estado establecido como ausente',
                        hora: horaFormato,
                        estado_antes: estadoAntes,
                        estado_despues: estadoDespues,
                        accion: 'establecido_ausente'
                    })
                };
            } else {
                console.error('❌ Error al establecer estado AUSENTE');
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        message: 'Error al establecer estado ausente',
                        hora: horaFormato,
                        accion: 'error'
                    })
                };
            }
        }
        
        console.log(`⏸️ Fuera de horario laboral (${horaFormato})`);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Fuera de horario laboral',
                hora: horaFormato,
                accion: 'ninguna'
            })
        };
    }
    
    // CASO 4: En horario laboral (8am-5pm, excepto almuerzo) - Verificar y establecer ACTIVO
    // Solo procesar si NO es el minuto exacto de inicio (8am) o vuelta del almuerzo (2pm),
    // ya que esos momentos clave ya se procesaron en verificarMomentosClave
    const esMinutoExactoInicio = horaActual === HORA_INICIO && minutosActuales === 0;
    const esMinutoExactoVueltaAlmuerzo = horaActual === HORA_ALMUERZO_FIN && minutosActuales === 0;
    
    if (esMinutoExactoInicio || esMinutoExactoVueltaAlmuerzo) {
        // Ya se procesó en verificarMomentosClave, solo retornar
        const estadoActual = await obtenerEstadoSlack();
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Momento clave ya procesado',
                hora: horaFormato,
                estado_actual: estadoActual,
                accion: 'momento_clave_procesado'
            })
        };
    }
    
    console.log(`✅ Horario laboral (${horaFormato}) - Verificando estado...`);
    
    // Obtener estado actual
    const estadoAntes = await obtenerEstadoSlack();
    console.log(`🔍 Estado actual de Slack: ${estadoAntes}`);
    
    // DETECCIÓN DE AUSENTE: Si está ausente durante horario laboral, enviar notificación INMEDIATAMENTE
    if (estadoAntes === 'away') {
        const fechaFormato = formatearFecha(ahora);
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const nombreDia = diasSemana[ahora.getDay()];
        
        // Notificación normal de ausente detectado
        const mensaje = `⚠️ <b>Estado AUSENTE detectado en Slack</b>\n\n` +
                       `Fecha: ${fechaFormato} (${nombreDia})\n` +
                       `Hora: ${horaFormato}\n` +
                       `Estado: AUSENTE\n\n` +
                       `Abre Slack para mantenerte activo.`;
        await enviarNotificacionTelegram(mensaje);
    }
    
    // Establecer estado activo
    console.log(`🔄 Intentando establecer estado ACTIVO...`);
    if (await establecerEstadoActivo()) {
        // Esperar un poco para que Slack procese
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verificar estado después
        const estadoDespues = await obtenerEstadoSlack();
        console.log(`🔍 Estado después de establecer activo: ${estadoDespues}`);
        
        if (estadoAntes === 'away' && estadoDespues === 'active') {
            console.log('✅ Estado corregido: AUSENTE → ACTIVO');
        } else if (estadoDespues === 'active') {
            console.log('✅ Estado: ACTIVO');
        } else if (estadoDespues === 'away') {
            console.warn('⚠️ Estado sigue AUSENTE - Slack requiere sesión activa');
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Estado actualizado exitosamente',
                hora: horaFormato,
                estado_antes: estadoAntes,
                estado_despues: estadoDespues,
                accion: 'establecido_activo'
            })
        };
    } else {
        console.error('❌ Error al establecer estado ACTIVO');
        
        // Enviar notificación de error
        const fechaFormato = formatearFecha(ahora);
        const mensajeError = `❌ <b>Error al establecer estado ACTIVO</b>\n\n` +
                           `Hora: ${horaFormato}\n` +
                           `Revisa los logs de Lambda para más detalles.`;
        
        await enviarNotificacionTelegram(mensajeError);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error al establecer estado',
                hora: horaFormato,
                estado_antes: estadoAntes,
                accion: 'error'
            })
        };
    }
};

