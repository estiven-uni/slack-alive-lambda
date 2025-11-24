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

// Horarios de trabajo (hora de Colombia)
const HORA_INICIO = 8;  // 8:00 AM
const HORA_FIN = 17;    // 5:00 PM
const HORA_ALMUERZO_INICIO = 13;  // 1:00 PM
const HORA_ALMUERZO_FIN = 14;     // 2:00 PM

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
 * Envía un mensaje a Telegram
 */
async function enviarNotificacionTelegram(mensaje) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('⚠️ Telegram no configurado - TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID faltantes');
        return false;
    }
    
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const postData = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: mensaje,
            parse_mode: 'HTML'
        });
        
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
 * Detecta momentos clave y envía notificaciones
 */
async function verificarMomentosClave(fecha) {
    const hora = fecha.getHours();
    const minuto = fecha.getMinutes();
    const diaSemana = fecha.getDay();
    
    // Solo verificar en días laborales (lunes a viernes) y que no sea día festivo
    if (diaSemana === 0 || diaSemana === 6 || await esDiaFestivo(fecha)) {
        return;
    }
    
    const horaFormato = formatearHoraAMPM(fecha);
    let mensaje = null;
    
    // Verificar si estamos en un momento clave (solo en el minuto 0 exacto)
    if (minuto === 0) {
        const fechaFormato = formatearFecha(fecha);
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const nombreDia = diasSemana[diaSemana];
        
        if (hora === HORA_INICIO) {
            // 8:00 AM - Inicio de trabajo
            mensaje = `🌅 <b>Inicio de jornada laboral</b>\n\n` +
                     `Fecha: ${fechaFormato} (${nombreDia})\n` +
                     `Hora: ${horaFormato}`;
        } else if (hora === HORA_ALMUERZO_INICIO) {
            // 1:00 PM - Hora de almuerzo
            mensaje = `🍽️ <b>Hora de almuerzo</b>\n\n` +
                     `Fecha: ${fechaFormato} (${nombreDia})\n` +
                     `Hora: ${horaFormato}\n` +
                     `Regreso: 2:00 PM`;
        } else if (hora === HORA_ALMUERZO_FIN) {
            // 2:00 PM - Vuelta del almuerzo
            mensaje = `⏰ <b>Vuelta del almuerzo</b>\n\n` +
                     `Fecha: ${fechaFormato} (${nombreDia})\n` +
                     `Hora: ${horaFormato}`;
        } else if (hora === HORA_FIN) {
            // 5:00 PM - Fin de trabajo
            mensaje = `🏠 <b>Fin de jornada laboral</b>\n\n` +
                     `Fecha: ${fechaFormato} (${nombreDia})\n` +
                     `Hora: ${horaFormato}`;
        }
    }
    
    if (mensaje) {
        await enviarNotificacionTelegram(mensaje);
        console.log(`📱 Notificación de momento clave enviada: ${horaFormato}`);
    }
}

/**
 * Handler principal de Lambda
 * Se ejecuta cuando CloudWatch Events dispara la función
 */
export const handler = async (event, context) => {
    const ahora = obtenerHoraColombia();
    const horaFormato = formatearHoraAMPM(ahora);
    
    // Verificar momentos clave y enviar notificaciones
    await verificarMomentosClave(ahora);
    
    // Verificar si estamos en horario laboral
    if (!(await estaEnHorarioLaboral())) {
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
    
    console.log(`✅ Horario laboral (${horaFormato}) - Verificando estado...`);
    
    // Obtener estado actual
    const estadoAntes = await obtenerEstadoSlack();
    
    // Si está ausente, enviar notificación a Telegram
    if (estadoAntes === 'away') {
        const fechaFormato = formatearFecha(ahora);
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const nombreDia = diasSemana[ahora.getDay()];
        
        const mensaje = `⚠️ <b>Estado AUSENTE detectado en Slack</b>\n\n` +
                       `Fecha: ${fechaFormato} (${nombreDia})\n` +
                       `Hora: ${horaFormato}\n` +
                       `Estado: AUSENTE\n\n` +
                       `Abre Slack para mantenerte activo.`;
        
        await enviarNotificacionTelegram(mensaje);
    }
    
    // Establecer estado activo
    if (await establecerEstadoActivo()) {
        // Esperar un poco para que Slack procese
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verificar estado después
        const estadoDespues = await obtenerEstadoSlack();
        
        // Solo mostrar logs importantes
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

