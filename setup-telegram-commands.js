/**
 * Script para configurar los comandos del bot en Telegram
 * Esto permite que aparezcan en el autocompletado cuando escribes "/"
 * 
 * Ejecuta este script una vez para configurar los comandos:
 * node setup-telegram-commands.js
 */

import https from 'https';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7981328403:AAFgq8xD25K3wfGmYyV1x8d1OqRGQLYjwZY';

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

const postData = JSON.stringify({
    commands: comandos
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

const req = https.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
        responseData += chunk;
    });
    
    res.on('end', () => {
        try {
            const jsonData = JSON.parse(responseData);
            if (jsonData.ok) {
                console.log('✅ Comandos configurados exitosamente en Telegram');
                console.log('📱 Ahora cuando escribas "/" en Telegram verás los comandos con autocompletado');
            } else {
                console.error('❌ Error:', jsonData.description);
            }
        } catch (error) {
            console.error('❌ Error parseando respuesta:', error.message);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Error de conexión:', error.message);
});

req.on('timeout', () => {
    req.destroy();
    console.error('❌ Timeout en la petición');
});

req.write(postData);
req.end();

