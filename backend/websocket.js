const WebSocket = require('ws');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');

// WebSocket to handle PCM audio stream from Twilio
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Received connection from Twilio');

    // Setup FFmpeg to convert PCM to WebM Opus
    const ffmpegProcess = spawn(ffmpeg, [
        '-f', 's16le', // PCM input format
        '-ar', '16000', // Sampling rate (from Twilio)
        '-ac', '1', // Mono channel (from Twilio)
        '-i', '-', // Input from stdin
        '-c:a', 'libopus', // Encode as Opus
        '-f', 'webm', // Output format
        '-content_type', 'audio/webm',
        'pipe:1' // Output to stdout (WebSocket to target server)
    ]);

    ffmpegProcess.stderr.on('data', (data) => {
        console.error(`FFmpeg error: ${data}`);
    });

    // Forward the converted stream to the WebSocket endpoint (aiscribe)
    const targetWs = new WebSocket('wss://api.aiscribe.quipohealth.com/ws');

    targetWs.on('open', () => {
        console.log('Connected to aiscribe WebSocket');

        ffmpegProcess.stdout.on('data', (chunk) => {
            targetWs.send(chunk); // Send converted WebM Opus data to the WebSocket server
        });

        ws.on('message', (message) => {
            ffmpegProcess.stdin.write(message); // Send PCM data from Twilio to FFmpeg
        });

        ws.on('close', () => {
            console.log('Twilio WebSocket closed');
            ffmpegProcess.stdin.end(); // End FFmpeg process
            targetWs.close();
        });
    });

    targetWs.on('error', (err) => {
        console.error('Error connecting to aiscribe WebSocket:', err);
    });
});

console.log('WebSocket server listening on ws://localhost:8080');
