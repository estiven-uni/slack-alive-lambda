# 🚀 Configuración de Despliegue Automático con GitHub Actions

Este proyecto está configurado para desplegarse automáticamente a AWS Lambda cada vez que hagas push a la rama `main`.

## 📋 Requisitos Previos

1. **AWS CLI instalado** (solo para verificación local, no necesario en GitHub Actions)
2. **Credenciales de AWS** con permisos para actualizar funciones Lambda
3. **Nombre de tu función Lambda** en AWS

## 🔧 Configuración en GitHub

### Paso 1: Configurar Secrets en GitHub

1. Ve a tu repositorio en GitHub: `https://github.com/estiven-uni/slack-alive-lambda`
2. Haz clic en **Settings** (Configuración)
3. En el menú lateral, haz clic en **Secrets and variables** → **Actions**
4. Haz clic en **New repository secret** y agrega los siguientes secrets:

   **Secret 1: AWS_ACCESS_KEY_ID**
   - **Name:** `AWS_ACCESS_KEY_ID`
   - **Value:** Tu Access Key ID de AWS
   - Cómo obtenerlo: AWS Console → IAM → Users → Security credentials → Create access key

   **Secret 2: AWS_SECRET_ACCESS_KEY**
   - **Name:** `AWS_SECRET_ACCESS_KEY`
   - **Value:** Tu Secret Access Key de AWS
   - ⚠️ **IMPORTANTE:** Mantén esto privado, nunca lo compartas

   **Secret 3: LAMBDA_FUNCTION_NAME**
   - **Name:** `LAMBDA_FUNCTION_NAME`
   - **Value:** El nombre de tu función Lambda (ej: `slack-alive`)

   **Secret 4: AWS_REGION** (Opcional)
   - **Name:** `AWS_REGION`
   - **Value:** La región donde está tu Lambda (ej: `us-east-1`, `us-west-2`)
   - Si no lo configuras, usará `us-east-1` por defecto

### Paso 2: Verificar Permisos IAM

Tu usuario de AWS necesita estos permisos:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction"
      ],
      "Resource": "arn:aws:lambda:*:*:function:slack-alive"
    }
  ]
}
```

## 🎯 Cómo Funciona

1. **Haces push a `main`** → GitHub Actions se activa automáticamente
2. **El workflow:**
   - Descarga el código
   - Crea un archivo ZIP con `lambda_function.js` y `package.json`
   - Actualiza el código de la función Lambda en AWS
   - Verifica que la actualización fue exitosa

## 📝 Uso

### Despliegue Automático
Simplemente haz push a la rama `main`:

```bash
git add .
git commit -m "Actualizar código"
git push origin main
```

El despliegue comenzará automáticamente. Puedes ver el progreso en:
- **GitHub:** Tu repositorio → **Actions** tab

### Despliegue Manual
También puedes ejecutar el workflow manualmente desde GitHub:
1. Ve a **Actions** en tu repositorio
2. Selecciona **Deploy to AWS Lambda**
3. Haz clic en **Run workflow**

## 🔍 Verificar el Despliegue

Después del despliegue, puedes verificar en AWS:
1. Ve a AWS Lambda Console
2. Selecciona tu función
3. Ve a **Code** → Verifica la fecha de "Last modified"

## ⚠️ Notas Importantes

- **Variables de entorno:** Las variables de entorno (`SLACK_TOKEN`, etc.) deben estar configuradas en AWS Lambda, no se actualizan con este workflow
- **Timeout y memoria:** Los cambios de configuración (timeout, memoria) deben hacerse manualmente en AWS Console
- **Triggers:** Los triggers (CloudWatch Events) no se modifican con este workflow

## 🐛 Troubleshooting

### Error: "Access Denied"
- Verifica que las credenciales de AWS sean correctas
- Verifica que el usuario tenga permisos para `lambda:UpdateFunctionCode`

### Error: "Function not found"
- Verifica que `LAMBDA_FUNCTION_NAME` sea el nombre exacto de tu función
- Verifica que la función exista en la región especificada

### El código se actualiza pero no funciona
- Verifica las variables de entorno en Lambda
- Revisa los logs de CloudWatch para ver errores

