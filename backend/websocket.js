require('dotenv').config();
const WebSocket = require('ws');
const { spawn } = require('child_process');
const Buffer = require('buffer').Buffer;

// WebSocket server to handle PCM audio stream from Twilio
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Received connection from Twilio');

    // Setup FFmpeg to convert PCMU (G.711 µ-law) to WebM Opus
    const ffmpegProcess = spawn('ffmpeg', [
        '-loglevel', 'error',  // Log only errors
        '-f', 'mulaw',         // Input format: PCMU (µ-law)
        '-ar', '8000',         // Sampling rate: 8000 Hz (for PCMU)
        '-ac', '1',            // Audio channels: mono
        '-i', '-',             // Input from stdin (Twilio's WebSocket stream)
        '-c:a', 'libopus',     // Encode to Opus codec
        '-f', 'webm',          // Output format: WebM
        '-content_type', 'audio/webm',
        'pipe:1'               // Output to stdout (WebSocket to transcribe socket)
    ]);

    // Capture FFmpeg error output
    ffmpegProcess.stderr.on('data', (data) => {
        console.error(`FFmpeg Error: ${data.toString()}`);
    });

    // Capture FFmpeg exit events
    ffmpegProcess.on('exit', (code, signal) => {
        console.error(`FFmpeg process exited with code ${code} and signal ${signal}`);
    });

    // Forward the converted WebM Opus stream to the transcribe socket WebSocket
    const targetWs = new WebSocket(process.env.WS_URL);

    targetWs.on('open', () => {
        console.log('Connected to transcribe socket WebSocket');

        // Send WebM Opus data from FFmpeg to transcribe socket
        ffmpegProcess.stdout.on('data', (chunk) => {
            targetWs.send(chunk);
        });

        // Handle incoming PCMU data from Twilio
        ws.on('message', (message) => {
            const data = JSON.parse(message.toString());
            if (data.event === 'media' && data.media && data.media.payload) {
                const pcmuBuffer = Buffer.from(data.media.payload, 'base64'); // Decode base64-encoded PCMU payload
                ffmpegProcess.stdin.write(pcmuBuffer); // Send PCMU data to FFmpeg
            }
        });

        ws.on('close', () => {
            console.log('Twilio WebSocket closed');
            ffmpegProcess.stdin.end();
            targetWs.close();
        });

        ws.on('error', (err) => {
            console.error('Error in Twilio WebSocket:', err);
            ffmpegProcess.stdin.end();
            targetWs.close();
        });
    });

    targetWs.on('message', (message) => {
        if (Buffer.isBuffer(message)) {
            // Convert buffer to string
            const transcription = message.toString('utf8');
            console.log("Transcription text >> ", transcription);
        } else {
            console.log("Non-buffer message received:", message);
        }
    });

    targetWs.on('error', (err) => {
        console.error('Error connecting to transcribe socket WebSocket:', err);
        ws.close();
    });

    targetWs.on('close', () => {
        console.log('transcribe socket WebSocket closed');
        ws.close();
    });

    ffmpegProcess.on('error', (err) => {
        console.error('Failed to start FFmpeg process:', err);
        ws.close();
    });
});

console.log('WebSocket server listening on ws://localhost:8080');