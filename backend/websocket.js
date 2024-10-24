const WebSocket = require('ws');
const { spawn } = require('child_process');

// WebSocket server to handle PCM audio stream from Twilio
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Received connection from Twilio');

    // Setup FFmpeg to convert PCMU (G.711 µ-law) to WebM Opus
    const ffmpegProcess = spawn('ffmpeg', [
        '-loglevel', 'error',  // Log only errors (can change to 'info' for more details)
        '-f', 'mulaw',         // Input format: PCMU (µ-law)
        '-ar', '8000',         // Sampling rate: 8000 Hz (typical for PCMU)
        '-ac', '1',            // Audio channels: mono
        '-i', '-',             // Input from stdin (Twilio's WebSocket stream)
        '-c:a', 'libopus',     // Encode to Opus audio codec
        '-f', 'webm',          // Output format: WebM
        '-content_type', 'audio/webm',
        'pipe:1'               // Output to stdout (WebSocket to aiscribe)
    ]);

    // Capture FFmpeg error output
    ffmpegProcess.stderr.on('data', (data) => {
        console.error(`FFmpeg Error: ${data.toString()}`);
    });

    // Capture FFmpeg exit events
    ffmpegProcess.on('exit', (code, signal) => {
        console.error(`FFmpeg process exited with code ${code} and signal ${signal}`);
    });

    // Forward the converted WebM Opus stream to the aiscribe WebSocket
    const targetWs = new WebSocket(process.env.WS_URL);

    // Handle connection to aiscribe WebSocket
    targetWs.on('open', () => {
        console.log('Connected to aiscribe WebSocket');

        // Send WebM Opus data from FFmpeg to aiscribe
        ffmpegProcess.stdout.on('data', (chunk) => {
            targetWs.send(chunk);
            console.log("Chunk sended")
        });

        // Receive PCM (PCMU) audio data from Twilio and forward to FFmpeg
        ws.on('message', (message) => {
            // console.log('Received PCM data from Twilio, forwarding to FFmpeg');
            ffmpegProcess.stdin.write(message);
        });

        // Handle WebSocket close event
        ws.on('close', () => {
            console.log('Twilio WebSocket closed');
            ffmpegProcess.stdin.end();  // Close FFmpeg process input
            targetWs.close();           // Close target WebSocket
        });

        // Handle WebSocket errors (Twilio)
        ws.on('error', (err) => {
            console.error('Error in Twilio WebSocket:', err);
            ffmpegProcess.stdin.end();
            targetWs.close();
        });
    });

    targetWs.on('message', (message) => {
        console.log("Transcription text >> ", message);
    });

    // Handle aiscribe WebSocket errors
    targetWs.on('error', (err) => {
        console.error('Error connecting to aiscribe WebSocket:', err);
        ws.close();  // Close Twilio WebSocket in case of aiscribe connection failure
    });

    // Handle aiscribe WebSocket close
    targetWs.on('close', () => {
        console.log('aiscribe WebSocket closed');
        ws.close();  // Close Twilio WebSocket if aiscribe WebSocket is closed
    });

    // Handle FFmpeg errors on start
    ffmpegProcess.on('error', (err) => {
        console.error('Failed to start FFmpeg process:', err);
        ws.close();  // Close WebSocket in case of FFmpeg start failure
    });
});

console.log('WebSocket server listening on ws://localhost:8080');
