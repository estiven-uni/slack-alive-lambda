# 📋 Instrucciones para Configurar AWS Lambda (Node.js)

## ✅ Ventaja de Node.js: NO necesitas Layers!

Node.js ya incluye todas las librerías necesarias (`https` está incluido), así que es mucho más simple.

## Paso 1: Crear la Función Lambda

**En Español:**
1. En AWS Lambda, haz clic en **"Crear función"** (Create function)
2. Selecciona **"Crear desde cero"** (Author from scratch)
3. **Nombre de la función:** `slack-alive`
4. **Runtime:** Selecciona **Node.js 24.x** (o la versión más reciente disponible)
5. **Arquitectura:** x86_64
6. **Permisos:** Deja el predeterminado (Create a new role with basic Lambda permissions)
7. Haz clic en **"Crear función"** (Create function)

**In English:**
1. In AWS Lambda, click **"Create function"**
2. Select **"Author from scratch"**
3. **Function name:** `slack-alive`
4. **Runtime:** Select **Node.js 24.x** (or the latest version available)
5. **Architecture:** x86_64
6. **Permissions:** Leave default (Create a new role with basic Lambda permissions)
7. Click **"Create function"**

## Paso 2: Pegar el Código

**En Español:**
1. Una vez creada la función, verás el editor de código
2. **Borra todo el código** que viene por defecto
3. Abre el archivo `lambda_function.js` en tu Mac
4. **Copia TODO el contenido** del archivo
5. **Pega** el código en el editor de Lambda
6. Haz clic en **"Desplegar"** (Deploy) en el sidebar izquierdo

**In English:**
1. Once the function is created, you'll see the code editor
2. **Delete all** the default code
3. Open the `lambda_function.js` file on your Mac
4. **Copy ALL the content** from the file
5. **Paste** the code into the Lambda editor
6. Click **"Deploy"** in the left sidebar

## Paso 3: Configurar Variables de Entorno

**En Español:**
1. En tu función Lambda, ve a **"Configuración"** (Configuration)
2. En el menú lateral, haz clic en **"Variables de entorno"** (Environment variables)
3. Haz clic en **"Editar"** (Edit)
4. Agrega estas variables:

   **Variable 1 (Requerida):**
   - **Clave:** `SLACK_TOKEN`
   - **Valor:** Tu token de Slack (empieza con `xoxp-`)

   **Variable 2 (Opcional - para notificaciones):**
   - **Clave:** `TELEGRAM_BOT_TOKEN`
   - **Valor:** Token del bot de Telegram

   **Variable 3 (Opcional - para notificaciones):**
   - **Clave:** `TELEGRAM_CHAT_ID`
   - **Valor:** Tu Chat ID de Telegram

5. Haz clic en **"Guardar"** (Save)

**In English:**
1. In your Lambda function, go to **"Configuration"**
2. In the side menu, click **"Environment variables"**
3. Click **"Edit"**
4. Add these variables:

   **Variable 1 (Required):**
   - **Key:** `SLACK_TOKEN`
   - **Value:** Your Slack token (starts with `xoxp-`)

   **Variable 2 (Optional - for notifications):**
   - **Key:** `TELEGRAM_BOT_TOKEN`
   - **Value:** Telegram bot token

   **Variable 3 (Optional - for notifications):**
   - **Key:** `TELEGRAM_CHAT_ID`
   - **Value:** Your Telegram Chat ID

5. Click **"Save"**

## Paso 4: Configurar Trigger (CloudWatch Events)

**En Español:**
1. En tu función Lambda, ve a **"Configuración"** (Configuration)
2. En el menú lateral, haz clic en **"Disparadores"** (Triggers)
3. Haz clic en **"Agregar disparador"** (Add trigger)
4. Selecciona **"EventBridge (CloudWatch Events)"**
5. Haz clic en **"Crear una nueva regla"** (Create a new rule)
6. **Nombre de la regla:** `slack-alive-schedule`
7. **Tipo de regla:** **"Regla programada"** (Schedule rule)
8. **Expresión de cron:** `rate(1 minute)` (cada minuto)
9. **Descripción:** `Ejecuta Slack Alive cada minuto`
10. **Estado habilitado:** **Sí** (Enabled)
11. Haz clic en **"Agregar"** (Add)

**In English:**
1. In your Lambda function, go to **"Configuration"**
2. In the side menu, click **"Triggers"**
3. Click **"Add trigger"**
4. Select **"EventBridge (CloudWatch Events)"**
5. Click **"Create a new rule"**
6. **Rule name:** `slack-alive-schedule`
7. **Rule type:** **"Schedule rule"**
8. **Cron expression:** `rate(1 minute)` (every minute)
9. **Description:** `Runs Slack Alive every minute`
10. **State:** **Enabled**
11. Click **"Add"**

## Paso 5: Configurar Timeout

**En Español:**
1. Ve a **"Configuración"** (Configuration) → **"General configuration"**
2. Haz clic en **"Editar"** (Edit)
3. **Timeout:** Cambia a **30 segundos** (30 seconds)
4. **Memoria:** **128 MB** está bien
5. Haz clic en **"Guardar"** (Save)

**In English:**
1. Go to **"Configuration"** → **"General configuration"**
2. Click **"Edit"**
3. **Timeout:** Change to **30 seconds**
4. **Memory:** **128 MB** is fine
5. Click **"Save"**

## Paso 6: Probar la Función

**En Español:**
1. Ve a **"Código"** (Code)
2. Haz clic en **"Probar"** (Test)
3. Crea un evento de prueba (puede estar vacío: `{}`)
4. Haz clic en **"Probar"** (Test)
5. Revisa los logs en **"Monitor"** → **"Ver logs en CloudWatch"**

**In English:**
1. Go to **"Code"**
2. Click **"Test"**
3. Create a test event (can be empty: `{}`)
4. Click **"Test"**
5. Check logs in **"Monitor"** → **"View logs in CloudWatch"**

## ⚠️ Notas Importantes

- El código verifica automáticamente si está en horario laboral (8am-5pm, excepto 1pm-2pm, hora de Colombia)
- Solo se ejecutará en días laborales (lunes a viernes)
- Respeta días festivos de Colombia (obtenidos automáticamente de API)
- Los logs aparecerán en CloudWatch Logs
- El costo será mínimo o gratis (dentro del free tier)
- **Node.js NO necesita Layers** - todo está incluido ✅

## 🎉 ¡Listo!

Tu función Lambda está configurada y se ejecutará automáticamente cada minuto durante tu horario laboral.

