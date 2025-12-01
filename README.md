# 🚀 Slack Alive - AWS Lambda

Mantén tu estado de Slack siempre activo usando AWS Lambda con notificaciones por Telegram.

## ✨ Características

- ✅ Mantiene tu estado de Slack como "active" automáticamente
- ✅ **Comandos interactivos de Telegram** para controlar el estado manualmente
- ✅ Notificaciones por Telegram cuando detecta ausente
- ✅ Notificaciones en momentos clave (inicio, almuerzo, vuelta, fin)
- ✅ Respeta días festivos de Colombia (consulta API automática)
- ✅ Horario laboral configurable desde variables de entorno o Telegram
- ✅ **Estado ausente automático durante el almuerzo (1pm-2pm)** y vuelta a activo a las 2pm
- ✅ Establece estado ausente automáticamente a las 5pm
- ✅ Alertas de errores cuando el token expira o hay problemas
- ✅ Logs optimizados y formato de hora AM/PM

## 📋 Requisitos

- Cuenta de AWS
- Token de Slack con permisos `users:read` y `users:write`
- Bot de Telegram (opcional, para notificaciones)

## 🚀 Instalación Rápida

1. **Crear función Lambda:**
   - Runtime: Node.js 24.x
   - Arquitectura: x86_64

2. **Pegar código:**
   - Copia el contenido de `lambda_function.js`
   - Pégalo en el editor de Lambda

3. **Configurar variables de entorno:**
   - `SLACK_TOKEN`: Tu token de Slack
   - `TELEGRAM_BOT_TOKEN`: Token del bot de Telegram (opcional)
   - `TELEGRAM_CHAT_ID`: Tu Chat ID de Telegram (opcional)

4. **Configurar trigger:**
   - EventBridge (CloudWatch Events)
   - Schedule: `rate(1 minute)`

5. **Configurar timeout:**
   - 30 segundos

## 📖 Documentación Completa

- **Instalación:** Ver `INSTRUCCIONES_LAMBDA.md` para instrucciones detalladas paso a paso
- **Comandos de Telegram:** Ver `TELEGRAM_COMMANDS.md` para configurar y usar comandos interactivos
- **Despliegue automático:** Ver `DEPLOY.md` para configurar GitHub Actions

## 🔔 Notificaciones

### Momentos Clave:
- **8:00 AM** - Inicio de jornada laboral
- **1:00 PM** - Hora de almuerzo
- **2:00 PM** - Vuelta del almuerzo
- **5:00 PM** - Fin de jornada laboral

### Alertas:
- Estado ausente detectado
- Token expirado o inválido
- Errores de conexión

### Comandos de Telegram:
- `/status` - Ver estado actual de Slack
- `/setactive` - Establecer estado ACTIVO manualmente
- `/setaway` - Establecer estado AUSENTE manualmente
- `/horario` - Ver horario laboral configurado
- `/sethorario` - Configurar nuevos horarios desde Telegram
- `/info` - Ver información del sistema
- `/test` - Probar conexión con Slack
- `/help` - Ver todos los comandos disponibles

Ver `TELEGRAM_COMMANDS.md` para más detalles sobre cómo configurar los comandos.

## ⚙️ Configuración

### Horarios (configurables):
- **Por defecto:** Inicio 8:00 AM, Fin 5:00 PM, Almuerzo 1:00 PM - 2:00 PM
- **Configuración:** Puedes cambiar los horarios desde:
  - Variables de entorno en AWS Lambda (`HORA_INICIO`, `HORA_FIN`, `HORA_ALMUERZO_INICIO`, `HORA_ALMUERZO_FIN`)
  - Comando `/sethorario` en Telegram (te mostrará instrucciones)
- **Comportamiento durante almuerzo:** Automáticamente establece estado AUSENTE durante el horario de almuerzo y vuelve a ACTIVO al finalizar

### Días Festivos:
- Se obtienen automáticamente de la API de Nager.Date
- Incluye fallback para años 2025-2026

## 💰 Costos

- **Gratis** dentro del free tier de AWS Lambda
- ~35,640 ejecuciones/mes (cada minuto, horario laboral)
- Muy bajo costo si excede free tier (<$0.50 USD/mes)

## 📝 Logs

Los logs aparecen en CloudWatch Logs con información detallada:
- Estado de Slack
- Días festivos obtenidos
- Notificaciones enviadas
- Errores y advertencias

## 🔧 Troubleshooting

- **Token expirado:** Recibirás notificación en Telegram
- **Sin notificaciones:** Verifica que Telegram esté configurado
- **No detecta días festivos:** Usa fallback automáticamente

## 📄 Licencia

ISC

