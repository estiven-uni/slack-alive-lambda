# 🔐 Permisos IAM para Actualización Automática de Horarios

Para que el bot pueda actualizar los horarios automáticamente desde Telegram, necesitas agregar permisos adicionales al rol IAM de tu función Lambda.

---

## 📋 Pasos para Agregar Permisos

### Paso 1: Ir a IAM Console

1. Ve a AWS Console: https://console.aws.amazon.com/
2. Busca y abre **IAM** (Identity and Access Management)
3. En el menú lateral, haz clic en **Roles**

### Paso 2: Encontrar el Rol de tu Lambda

1. En la lista de roles, busca el rol de tu función Lambda
   - Normalmente se llama algo como: `slack-alive-role-xxxxx`
   - O busca por el nombre de tu función: `slack-alive`

2. Haz clic en el nombre del rol para abrirlo

### Paso 3: Agregar el Permiso

1. En la página del rol, ve a la pestaña **"Permissions"**
2. Haz clic en **"Add permissions"** → **"Create inline policy"**
3. Selecciona la pestaña **"JSON"**
4. Pega la siguiente política:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:GetFunctionConfiguration",
        "lambda:UpdateFunctionConfiguration"
      ],
      "Resource": "arn:aws:lambda:*:*:function:slack-alive"
    }
  ]
}
```

5. Haz clic en **"Review policy"**
6. Nombre de la política: `slack-alive-self-update-policy`
7. Haz clic en **"Create policy"**

---

## ✅ Verificar que Funciona

1. Ve a Telegram
2. Envía `/sethorario`
3. Selecciona un horario (ej: Hora de Entrada)
4. Selecciona una hora
5. Deberías ver: **"✅ Hora de Entrada Actualizado Automáticamente"**

Si ves este mensaje, ¡todo funciona! 🎉

---

## ⚠️ Si NO tienes permisos

Si no puedes editar el rol IAM (porque no tienes permisos de administrador), el sistema seguirá funcionando pero:

- Los cambios de horario NO se aplicarán automáticamente
- Recibirás un mensaje con instrucciones para actualizar manualmente
- Tendrás que ir a Lambda Console y cambiar las variables de entorno manualmente

---

## 🔍 Troubleshooting

### Error: "Access Denied"
- Asegúrate de haber agregado la política al rol correcto
- Verifica que el ARN en la política coincida con tu función Lambda
- Si tu función está en otra región, actualiza el ARN

### Error: "Resource not found"
- Verifica que el nombre de la función sea exactamente `slack-alive`
- Si tu función tiene otro nombre, actualiza el ARN en la política

### Los cambios no se aplican
- Espera al menos 1 minuto después de cambiar el horario
- Verifica que la variable de entorno se haya actualizado en Lambda Console
- Revisa los logs de CloudWatch para ver si hay errores

---

## 📝 Política IAM Completa (Opcional)

Si prefieres tener una política más completa con todos los permisos necesarios, usa esta:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:GetFunctionConfiguration",
        "lambda:UpdateFunctionConfiguration"
      ],
      "Resource": "arn:aws:lambda:*:*:function:slack-alive"
    }
  ]
}
```

Esta política incluye también los permisos para escribir logs en CloudWatch.

