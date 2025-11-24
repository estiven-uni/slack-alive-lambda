# 🤖 Comandos Interactivos de Telegram

Este bot de Telegram te permite controlar y consultar el estado de Slack directamente desde Telegram.

## 📋 Comandos Disponibles

### Comandos de Estado
- `/status` - Ver el estado actual de Slack (activo/ausente) y horario laboral
- `/setactive` - Establecer estado ACTIVO manualmente en Slack
- `/setaway` - Establecer estado AUSENTE manualmente en Slack

### Comandos de Configuración
- `/horario` - Ver el horario laboral configurado
- `/sethorario` - Configurar nuevos horarios (ej: `/sethorario inicio=9 fin=18 almuerzo_inicio=13 almuerzo_fin=14`)

### Comandos de Información
- `/info` - Ver información completa del sistema (estado, horario, configuración)
- `/help` o `/start` - Mostrar la lista de comandos disponibles

### Comandos de Prueba
- `/test` - Probar la conexión con Slack y verificar que todo funciona

## 🚀 Configuración del Webhook de Telegram

Para que los comandos funcionen, necesitas configurar un webhook de Telegram que apunte a tu función Lambda.

### Paso 1: Crear Lambda Function URL

1. Ve a AWS Lambda Console: https://console.aws.amazon.com/lambda/
2. Selecciona tu función `slack-alive`
3. Ve a la pestaña **"Configuration"** → **"Function URL"**
4. Haz clic en **"Create function URL"**
5. Configura:
   - **Auth type:** `NONE` (o `AWS_IAM` si prefieres más seguridad)
   - **CORS:** Opcional, puedes dejarlo desactivado
6. Haz clic en **"Save"**
7. **Copia la URL** que se genera (ej: `https://xxxxx.lambda-url.us-east-2.on.aws/`)

### Paso 2: Configurar Webhook en Telegram

1. Abre Telegram y busca tu bot (el que creaste con `TELEGRAM_BOT_TOKEN`)
2. Envía un mensaje a tu bot para iniciarlo
3. Usa esta URL para configurar el webhook:

```
https://api.telegram.org/bot<TU_BOT_TOKEN>/setWebhook?url=<TU_LAMBDA_FUNCTION_URL>
```

**Ejemplo:**
```
https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/setWebhook?url=https://xxxxx.lambda-url.us-east-2.on.aws/
```

4. Abre esa URL en tu navegador o usa curl:

```bash
curl "https://api.telegram.org/bot<TU_BOT_TOKEN>/setWebhook?url=<TU_LAMBDA_FUNCTION_URL>"
```

5. Deberías recibir una respuesta JSON con `"ok": true`

### Paso 3: Verificar el Webhook

Para verificar que el webhook está configurado correctamente:

```bash
curl "https://api.telegram.org/bot<TU_BOT_TOKEN>/getWebhookInfo"
```

Deberías ver la URL de tu Lambda Function URL en la respuesta.

### Paso 4: Probar los Comandos

1. Abre Telegram y busca tu bot
2. Envía `/help` para ver todos los comandos
3. Prueba `/status` para ver el estado actual
4. Prueba `/setactive` o `/setaway` para cambiar el estado manualmente

## 🔒 Seguridad

- El bot solo responderá a comandos del chat configurado en `TELEGRAM_CHAT_ID`
- Si no configuras `TELEGRAM_CHAT_ID`, el bot responderá a cualquier chat (menos seguro)
- Para mayor seguridad, puedes usar `AWS_IAM` como auth type en la Function URL

## 📝 Notas

- Los comandos funcionan en tiempo real
- Los cambios de estado se aplican inmediatamente en Slack
- El bot responde con información formateada usando HTML
- Si hay un error, recibirás un mensaje de error explicativo

## 🐛 Troubleshooting

### El bot no responde
1. Verifica que el webhook esté configurado: `curl "https://api.telegram.org/bot<TU_BOT_TOKEN>/getWebhookInfo"`
2. Verifica los logs de CloudWatch para ver si hay errores
3. Asegúrate de que `TELEGRAM_BOT_TOKEN` esté configurado en las variables de entorno

### Error "Chat no autorizado"
- Verifica que `TELEGRAM_CHAT_ID` esté configurado correctamente
- Obtén tu Chat ID enviando un mensaje a @userinfobot en Telegram

### Los comandos no funcionan
- Verifica que el handler principal detecte correctamente los eventos de Telegram
- Revisa los logs de Lambda para ver qué está pasando

## ⚙️ Configuración de Horarios

### Comportamiento Automático

- **Durante el almuerzo (1pm-2pm):** El bot automáticamente establece tu estado como AUSENTE
- **A las 2pm:** El bot automáticamente vuelve a establecer tu estado como ACTIVO
- **A las 5pm:** El bot automáticamente establece tu estado como AUSENTE (fin de jornada)

### Configurar Horarios desde Telegram

Usa el comando `/sethorario` con los parámetros deseados:

**Formato:**
```
/sethorario inicio=8 fin=17 almuerzo_inicio=13 almuerzo_fin=14
```

**Parámetros:**
- `inicio`: Hora de inicio laboral (0-23)
- `fin`: Hora de fin laboral (0-23)
- `almuerzo_inicio`: Inicio del horario de almuerzo (0-23)
- `almuerzo_fin`: Fin del horario de almuerzo (0-23)

**Ejemplo:**
```
/sethorario inicio=9 fin=18 almuerzo_inicio=13 almuerzo_fin=14
```

Esto configuraría:
- Inicio: 9:00 AM
- Fin: 6:00 PM
- Almuerzo: 1:00 PM - 2:00 PM

**Nota:** El comando te mostrará instrucciones para actualizar las variables de entorno en AWS Lambda. Los cambios se aplicarán automáticamente después de actualizar las variables.

### Configurar Horarios Manualmente en AWS

1. Ve a AWS Lambda Console
2. Selecciona tu función `slack-alive`
3. Ve a **Configuration** → **Environment variables**
4. Agrega o edita estas variables:
   - `HORA_INICIO` = 8 (ejemplo)
   - `HORA_FIN` = 17 (ejemplo)
   - `HORA_ALMUERZO_INICIO` = 13 (ejemplo)
   - `HORA_ALMUERZO_FIN` = 14 (ejemplo)
5. Guarda los cambios

Los cambios se aplicarán automáticamente en la próxima ejecución del Lambda.

## 💡 Ejemplos de Uso

```
/status
→ Muestra el estado actual de Slack

/setactive
→ Cambia tu estado a ACTIVO inmediatamente

/setaway
→ Cambia tu estado a AUSENTE inmediatamente

/horario
→ Muestra los horarios configurados

/sethorario inicio=9 fin=18
→ Configura nuevos horarios (te mostrará instrucciones)

/info
→ Muestra información completa del sistema

/test
→ Prueba la conexión con Slack
```

