const WebSocket = require('ws');
const { Blob } = require('buffer'); // Allows Blob usage in Node.js environment
require('dotenv').config();

const CONFIG = {
    PORT: 8080,
    SAMPLE_RATE: 48000,
    ENCODING: 'opus',
    CHANNELS: 1
};

const wss = new WebSocket.Server({ port: CONFIG.PORT });
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

// Setup Deepgram WebSocket URL
const deepgramSocketUrl = `wss://api.deepgram.com/v1/listen?encoding=${CONFIG.ENCODING}&sample_rate=${CONFIG.SAMPLE_RATE}&channels=${CONFIG.CHANNELS}`;

wss.on('connection', (clientWs) => {
    console.log('Received connection from Twilio');
    let deepgramWs;

    function connectDeepgram() {
        deepgramWs = new WebSocket(deepgramSocketUrl, {
            headers: {
                Authorization: `Token ${deepgramApiKey}`,
            },
        });

        deepgramWs.on('open', () => {
            console.log('Connected to Deepgram WebSocket for transcription');
        });

        deepgramWs.on('message', (message) => {
            const transcription = JSON.parse(message)?.channel?.alternatives[0]?.transcript;
            if (transcription) {
                console.log("Transcription text:", transcription);
                clientWs.send(JSON.stringify({ transcript: transcription }));
            }
        });

        deepgramWs.on('close', () => {
            console.log("Deepgram WebSocket closed");
        });

        deepgramWs.on('error', (err) => {
            console.error("Error in Deepgram WebSocket:", err);
        });
    }

    connectDeepgram();

    // Process each chunk from Twilio and forward to Deepgram
    clientWs.on('message', (data) => {
        console.log("Received audio chunk from client");

        // Convert data to WebM Blob
        const audioBlob = new Blob([data], { type: "audio/webm" });
        const arrayBuffer = audioBlob.arrayBuffer();

        arrayBuffer.then((buffer) => {
            if (deepgramWs.readyState === WebSocket.OPEN) {
                deepgramWs.send(buffer);
            } else {
                console.warn("Deepgram WebSocket is not open. Retrying connection.");
                connectDeepgram();
                deepgramWs.send(buffer);
            }
        }).catch((err) => console.error("Error converting audio chunk to buffer:", err));
    });

    clientWs.on('close', () => {
        console.log('Twilio WebSocket closed');
        if (deepgramWs) deepgramWs.close();
    });
});

console.log(`WebSocket server listening on ws://localhost:${CONFIG.PORT}`);
