# 📋 Funcionalidades del Sistema Slack Alive

Este documento lista todas las funcionalidades del sistema organizadas por categorías.

---

## 🔵 1. Gestión de Estado de Slack

### 1.1. Obtener Estado Actual
- Consulta el estado actual de presencia en Slack usando la API `users.getPresence`
- Retorna: 'active', 'away', o 'error'
- Detecta si hay sesión activa (online) y número de conexiones
- Muestra advertencias si no hay sesión activa detectada

### 1.2. Establecer Estado Activo
- Establece el estado de Slack como 'auto' (activo) usando `users.setPresence`
- Verifica el estado después de establecerlo (con delay de 1.5 segundos)
- Retorna confirmación de éxito o error

### 1.3. Establecer Estado Ausente
- Establece el estado de Slack como 'away' (ausente) usando `users.setPresence`
- Verifica el estado después de establecerlo (con delay de 1.5 segundos)
- Retorna confirmación de éxito o error

### 1.4. Detección Automática de Ausente
- Detecta cuando el estado está en 'away' durante horario laboral
- Envía notificación inmediata cuando detecta ausente
- Intenta corregir automáticamente estableciendo estado activo

### 1.5. Verificación Post-Cambio
- Verifica el estado después de cada cambio
- Compara estado antes y después de la operación
- Registra logs detallados del proceso

---

## 🕐 2. Gestión de Horarios

### 2.1. Verificación de Horario Laboral
- Verifica si está en horario laboral configurado (por defecto: 8am-5pm)
- Excluye horario de almuerzo (por defecto: 1pm-2pm)
- Respeta días no laborales (sábados, domingos y días festivos)
- Usa zona horaria de Colombia (America/Bogota)

### 2.2. Configuración de Horarios
- Horarios configurables desde variables de entorno:
  - `HORA_INICIO` (por defecto: 8)
  - `HORA_FIN` (por defecto: 17)
  - `HORA_ALMUERZO_INICIO` (por defecto: 13)
  - `HORA_ALMUERZO_FIN` (por defecto: 14)
- Configuración desde Telegram con comando `/sethorario`
- Validación de parámetros (horas entre 0-23)

### 2.3. Cambios Automáticos de Estado en Momentos Clave
El sistema realiza cambios automáticos de estado mediante requests a la API de Slack en momentos específicos:

- **8:00 AM (Hora de Entrada)**
  - Al iniciar el horario laboral, automáticamente envía request para establecer estado como **ACTIVO/DISPONIBLE**
  - Solo en días laborales (lunes a viernes) y que no sean días festivos
  - Verifica el estado después del cambio

- **1:00 PM (Hora de Almuerzo)**
  - Al entrar al horario de almuerzo, automáticamente envía request para establecer estado como **AUSENTE**
  - Solo en días laborales (lunes a viernes) y que no sean días festivos
  - Verifica el estado después del cambio

- **2:00 PM (Vuelta del Almuerzo)**
  - Al finalizar el horario de almuerzo, automáticamente envía request para establecer estado como **ACTIVO/DISPONIBLE**
  - Solo en días laborales (lunes a viernes) y que no sean días festivos
  - Verifica el estado después del cambio
  - Envía notificación especial de regreso del almuerzo

- **5:00 PM (Hora de Salida)**
  - Al finalizar el horario laboral, automáticamente envía request para establecer estado como **AUSENTE**
  - Solo en días laborales (lunes a viernes) y que no sean días festivos
  - Verifica el estado después del cambio

**Nota:** Todos estos cambios se realizan automáticamente mediante requests HTTP POST a la API de Slack (`users.setPresence`) sin necesidad de intervención manual.

### 2.4. Manejo de Horario de Almuerzo
- Detecta automáticamente horario de almuerzo
- Establece estado AUSENTE durante el almuerzo (1pm-2pm)
- Vuelve a establecer estado ACTIVO al finalizar el almuerzo (2pm)
- Notificaciones especiales para regreso del almuerzo

### 2.5. Manejo de Fin de Jornada
- Detecta cuando es después del horario laboral (después de las 5pm)
- Establece automáticamente estado AUSENTE al finalizar jornada
- Solo en días laborales (lunes a viernes)

### 2.6. Manejo de Días Festivos
- Consulta automática de días festivos de Colombia desde API Nager.Date
- Cache de días festivos (24 horas de duración)
- Fallback con días festivos predefinidos para 2025-2026
- Respeta días festivos y no ejecuta acciones automáticas

### 2.7. Detección de Días de Semana
- Identifica días laborales (lunes a viernes)
- Excluye sábados y domingos
- Combina con verificación de días festivos

---

## 📱 3. Notificaciones por Telegram

### 3.1. Notificaciones de Momentos Clave
- **8:00 AM** - Notificación de inicio de jornada laboral
- **1:00 PM** - Notificación de hora de almuerzo
- **2:00 PM** - Notificación de vuelta del almuerzo
- **5:00 PM** - Notificación de fin de jornada laboral
- Solo se envían en días laborales y en el minuto exacto (minuto 0)

### 3.2. Notificaciones de Estado
- Notificación cuando detecta estado AUSENTE durante horario laboral
- Notificación de confirmación cuando se establece estado ACTIVO
- Notificación especial para regreso del almuerzo

### 3.3. Alertas de Errores
- Notificación de token de Slack inválido o revocado
- Notificación de token sin permisos necesarios
- Notificación de errores de conexión con Slack API
- Notificación de errores críticos del sistema
- Notificación cuando no se puede establecer estado

### 3.4. Formato de Mensajes
- Mensajes formateados con HTML
- Incluye emojis para mejor visualización
- Formato de fecha y hora legible (AM/PM)
- Información contextual (día de la semana, zona horaria)

### 3.5. Envío de Mensajes
- Soporte para mensajes con teclados de respuesta
- Soporte para botones inline
- Respuesta a mensajes específicos (reply)
- Manejo de errores de envío

### 3.6. Silenciar Notificaciones de Estado Ausente
- Silencia temporalmente las notificaciones de "estado ausente detectado"
- Opciones de tiempo: 15 minutos, 30 minutos, 1 hora
- Botones rápidos de silenciar directamente en la notificación de ausente
- Comando `/silenciar` para configurar o ver estado del silencio
- Posibilidad de desactivar el silencio antes de que expire
- **NO afecta** las notificaciones de momentos clave (entrada, almuerzo, salida)
- El silencio se mantiene mientras la instancia de Lambda esté activa

---

## 🤖 4. Comandos de Telegram

### 4.1. Comandos de Estado
- `/status` - Ver estado actual de Slack y horario laboral
- `/setactive` - Establecer estado ACTIVO manualmente
- `/setaway` - Establecer estado AUSENTE manualmente

### 4.2. Comandos de Configuración
- `/horario` - Ver horario laboral configurado
- `/sethorario` - Configurar nuevos horarios con parámetros
  - Formato: `/sethorario inicio=8 fin=17 almuerzo_inicio=13 almuerzo_fin=14`
  - Muestra instrucciones para actualizar variables de entorno

### 4.3. Comandos de Información
- `/info` - Ver información completa del sistema
  - Estado de Slack
  - Horario laboral activo/inactivo
  - Si es día festivo
  - Configuración de horarios
  - Fecha y hora actual
- `/help` o `/start` - Mostrar lista de comandos disponibles y menú principal

### 4.4. Comandos de Prueba
- `/test` - Probar conexión con Slack
  - Verifica estado de conexión
  - Muestra estado actual
  - Confirma que todo funciona correctamente

### 4.5. Comando de Silenciar Notificaciones
- `/silenciar` - Silenciar notificaciones de estado ausente temporalmente
  - Muestra menú con opciones de tiempo (15min, 30min, 1hr)
  - Si ya está silenciado, muestra tiempo restante y opción de desactivar
  - Botones inline para selección rápida de tiempo
  - Solo silencia notificaciones de "ausente detectado"
  - Las notificaciones de momentos clave (8am, 1pm, 2pm, 5pm) NO se silencian

### 4.6. Procesamiento de Comandos
- Soporte para comandos con "/" (ej: `/status`)
- Soporte para texto de botones (ej: "📊 Estado")
- Mapeo automático de texto a comandos
- Validación de chat autorizado (si está configurado `TELEGRAM_CHAT_ID`)

### 4.7. Interfaz de Usuario
- Teclado principal con botones de acceso rápido
- Botones inline para acciones rápidas
- Autocompletado de comandos en Telegram
- Configuración automática de comandos del bot

### 4.8. Manejo de Callbacks
- Respuesta a callbacks de botones inline
- Eliminación de estado "loading" en botones
- Procesamiento de acciones desde botones
- Callbacks para silenciar notificaciones (silenciar_15, silenciar_30, silenciar_60, silenciar_desactivar)

---

## 🔌 5. Integración con APIs Externas

### 5.1. API de Slack
- Endpoint: `users.getPresence` - Obtener estado actual
- Endpoint: `users.setPresence` - Establecer estado
- Autenticación con Bearer token
- Manejo de errores de API
- Detección de errores críticos (invalid_auth, token_revoked, etc.)

### 5.2. API de Telegram
- Endpoint: `sendMessage` - Enviar mensajes
- Endpoint: `setMyCommands` - Configurar comandos del bot
- Endpoint: `answerCallbackQuery` - Responder callbacks
- Autenticación con bot token
- Soporte para webhooks (Lambda Function URL)

### 5.3. API de Días Festivos (Nager.Date)
- Consulta automática de días festivos de Colombia
- Endpoint: `https://date.nager.at/api/v3/PublicHolidays/{año}/CO`
- Cache de resultados (24 horas)
- Fallback con datos predefinidos si la API falla
- Manejo de timeouts y errores de conexión

---

## ⚠️ 6. Manejo de Errores

### 6.1. Detección de Errores Críticos
- `invalid_auth` - Token inválido
- `token_revoked` - Token revocado
- `account_inactive` - Cuenta inactiva
- `missing_scope` - Permisos faltantes
- `not_authed` - No autenticado

### 6.2. Manejo de Errores de Conexión
- Timeouts en peticiones HTTP (5 segundos)
- Errores de red
- Errores de parsing de respuestas JSON
- Reintentos automáticos (en algunos casos)

### 6.3. Notificaciones de Errores
- Notificación inmediata de errores críticos
- Mensajes descriptivos con instrucciones
- Logs detallados en CloudWatch
- Manejo graceful de errores no críticos

### 6.4. Validación de Configuración
- Verificación de variables de entorno requeridas
- Advertencias cuando faltan configuraciones opcionales
- Validación de parámetros de comandos
- Validación de horarios (0-23)

---

## 🛠️ 7. Utilidades y Helpers

### 7.1. Manejo de Fechas y Horas
- `obtenerHoraColombia()` - Obtiene hora actual en zona horaria de Colombia
- `formatearHoraAMPM()` - Formatea hora en formato 12 horas con AM/PM
- `formatearFecha()` - Formatea fecha como YYYY-MM-DD
- Conversión automática de zona horaria

### 7.2. Cache de Días Festivos
- Cache en memoria de días festivos por año
- Duración de cache: 24 horas
- Evita múltiples llamadas a la API
- Actualización automática cuando expira

### 7.3. Peticiones HTTP
- Función genérica para peticiones HTTPS a Slack
- Función genérica para peticiones HTTPS a Telegram
- Manejo de timeouts
- Manejo de errores de red
- Parsing automático de respuestas JSON

### 7.4. Control de Silencio de Notificaciones
- `estanNotificacionesSilenciadas()` - Verifica si las notificaciones están silenciadas
- `silenciarNotificaciones(minutos)` - Silencia notificaciones por un tiempo determinado
- `obtenerTiempoRestanteSilencio()` - Obtiene minutos restantes de silencio
- `desactivarSilencio()` - Desactiva el silencio manualmente
- Variable global `silencioNotificacionesHasta` para almacenar timestamp de expiración

### 7.5. Logs y Debugging
- Logs detallados en CloudWatch
- Mensajes informativos con emojis
- Logs de estado antes y después de cambios
- Logs de errores con stack traces
- Logs de eventos de Telegram

---

## ⚙️ 8. Configuración del Sistema

### 8.1. Variables de Entorno
- `SLACK_TOKEN` - Token de Slack (requerido)
- `TELEGRAM_BOT_TOKEN` - Token del bot de Telegram (opcional)
- `TELEGRAM_CHAT_ID` - Chat ID de Telegram (opcional)
- `HORA_INICIO` - Hora de inicio laboral (opcional, default: 8)
- `HORA_FIN` - Hora de fin laboral (opcional, default: 17)
- `HORA_ALMUERZO_INICIO` - Inicio de almuerzo (opcional, default: 13)
- `HORA_ALMUERZO_FIN` - Fin de almuerzo (opcional, default: 14)

### 8.2. Configuración de Lambda
- Runtime: Node.js 24.x
- Arquitectura: x86_64
- Timeout: 30 segundos
- Memoria: 128 MB (recomendado)
- Trigger: EventBridge (CloudWatch Events) cada 1 minuto

### 8.3. Configuración de Webhook
- Lambda Function URL para recibir webhooks de Telegram
- Autenticación: NONE o AWS_IAM
- Manejo de eventos de Telegram (mensajes y callbacks)

---

## 🔄 9. Flujos Automáticos

### 9.1. Flujo de Hora de Entrada (8:00 AM)
1. Verificar si es día laboral (lunes a viernes)
2. Verificar si es día festivo
3. Si es día laboral y no es festivo:
   - Enviar request HTTP POST a Slack API (`users.setPresence`) para establecer estado ACTIVO
   - Obtener estado actual antes del cambio
   - Verificar estado después del cambio (con delay de 1.5 segundos)
   - Registrar en logs el resultado
   - Enviar notificación de inicio de jornada (si está configurado Telegram)

### 9.2. Flujo de Hora de Almuerzo (1:00 PM)
1. Verificar si es día laboral (lunes a viernes)
2. Verificar si es día festivo
3. Si es día laboral y no es festivo:
   - Enviar request HTTP POST a Slack API (`users.setPresence`) para establecer estado AUSENTE
   - Obtener estado actual antes del cambio
   - Verificar estado después del cambio (con delay de 1.5 segundos)
   - Registrar en logs el resultado
   - Enviar notificación de hora de almuerzo (si está configurado Telegram)

### 9.3. Flujo de Vuelta del Almuerzo (2:00 PM)
1. Verificar si es día laboral (lunes a viernes)
2. Verificar si es día festivo
3. Si es día laboral y no es festivo:
   - Enviar request HTTP POST a Slack API (`users.setPresence`) para establecer estado ACTIVO
   - Obtener estado actual antes del cambio
   - Verificar estado después del cambio (con delay de 1.5 segundos)
   - Registrar en logs el resultado
   - Enviar notificación especial de regreso del almuerzo (si está configurado Telegram)

### 9.4. Flujo de Hora de Salida (5:00 PM)
1. Verificar si es día laboral (lunes a viernes)
2. Verificar si es día festivo
3. Si es día laboral y no es festivo:
   - Enviar request HTTP POST a Slack API (`users.setPresence`) para establecer estado AUSENTE
   - Obtener estado actual antes del cambio
   - Verificar estado después del cambio (con delay de 1.5 segundos)
   - Registrar en logs el resultado
   - Enviar notificación de fin de jornada (si está configurado Telegram)

### 9.5. Flujo de Horario Laboral Continuo (8am-5pm, excepto almuerzo)
1. Verificar si está en horario laboral
2. Verificar si es día festivo
3. Si está en horario laboral y no es festivo:
   - Obtener estado actual de Slack
   - Si está ausente, enviar notificación
   - Enviar request HTTP POST para establecer estado ACTIVO
   - Verificar estado después

### 9.6. Flujo de Comando de Telegram
1. Recibir evento de Telegram
2. Parsear mensaje o callback
3. Verificar autorización (si está configurado)
4. Procesar comando
5. Ejecutar acción correspondiente
6. Enviar respuesta

---

## 📊 10. Monitoreo y Logs

### 10.1. Logs de Estado
- Estado antes y después de cambios
- Hora y fecha de cada operación
- Resultado de cada operación (éxito/error)

### 10.2. Logs de Eventos
- Eventos recibidos de Telegram
- Comandos procesados
- Callbacks procesados
- Momentos clave detectados

### 10.3. Logs de Errores
- Errores de API de Slack
- Errores de API de Telegram
- Errores de conexión
- Errores de parsing
- Stack traces completos

### 10.4. Logs Informativos
- Días festivos obtenidos
- Notificaciones enviadas
- Configuraciones aplicadas
- Cache hits/misses

---

## 🔒 11. Seguridad

### 11.1. Autenticación
- Tokens almacenados en variables de entorno
- Autenticación Bearer para Slack API
- Autenticación con bot token para Telegram

### 11.2. Autorización
- Validación de chat ID de Telegram (opcional)
- Rechazo de mensajes de chats no autorizados
- Validación de tokens antes de usar

### 11.3. Manejo Seguro de Datos
- No almacenamiento de datos sensibles en logs
- Timeouts en todas las peticiones HTTP
- Validación de respuestas antes de procesar

---

## 📝 Notas Adicionales

- El sistema está diseñado para ejecutarse cada minuto durante horario laboral
- Respeta automáticamente días festivos de Colombia
- Las notificaciones son opcionales (requieren configuración de Telegram)
- Los comandos de Telegram requieren configuración de webhook
- El sistema es tolerante a fallos y continúa funcionando aunque Telegram no esté configurado

