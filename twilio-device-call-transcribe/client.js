// client.js

// Backend URL for fetching token
const backendURL = "https://e41c-106-222-237-223.ngrok-free.app";
const WS_URL = "wss://424d-106-222-237-223.ngrok-free.app";

let device;
let isDeviceReady = false;
let mediaRecorder;
let ws;

// Function to fetch Twilio Access Token from your server
async function fetchToken() {
    try {
        const response = await fetch(`${backendURL}/token`);
        if (!response.ok) throw new Error('Failed to fetch token');
        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error('Error fetching token:', error);
        return null;
    }
}

// Function to initialize the Twilio Device
async function initializeDevice() {
    const token = await fetchToken();
    if (!token) {
        console.error("Could not retrieve token");
        return;
    }

    try {
        device = new Twilio.Device(token);
        device.on('ready', () => {
            console.log('Twilio Device is ready for calls.');
            isDeviceReady = true;
            document.getElementById('status').innerText = 'Device Ready';
            document.getElementById('start-call').disabled = false;
        });

        device.on('error', (error) => {
            console.error('Twilio Device Error:', error);
            document.getElementById('status').innerText = 'Device Error';
        });
    } catch (error) {
        console.error('Error initializing Twilio Device:', error);
    }
}

// Function to start a call and set up recording
async function makeCall() {
    if (!isDeviceReady) {
        console.error('Device is not ready.');
        alert("Device is not ready. Please wait.");
        return;
    }

    const phoneNumber = document.getElementById('phone-number').value;
    if (!phoneNumber) {
        alert("Please enter a phone number.");
        return;
    }

    try {
        const params = { To: phoneNumber };
        const connection = device.connect(params);

        connection.on('accept', (call) => {
            const mediaStream = call.getLocalStream();
            if (mediaStream instanceof MediaStream) {
                startRecording(mediaStream);
                connectWebSocket();
            } else {
                console.error("MediaStream is not available.");
            }
        });

        connection.on('disconnect', () => {
            console.log('Call disconnected. Stopping audio recording...');
            stopRecording();
            closeWebSocket();
        });
    } catch (error) {
        console.error('Error while making the call:', error);
    }
}

// Function to start recording using the Web Audio API
// Function to start recording using the Web Audio API
function startRecording(mediaStream) {
    if (!mediaStream || !(mediaStream instanceof MediaStream)) {
        console.error("Invalid MediaStream for recording.");
        return;
    }

    const options = {
        mimeType: "audio/webm; codecs=opus",
        audioBitsPerSecond: 16000
    };

    mediaRecorder = new MediaRecorder(mediaStream, options);

    mediaRecorder.ondataavailable = (event) => {
        console.log("ondataavailable event triggered"); // Check if triggered frequently
        if (event.data.size > 0) {
            sendToWebSocket(event.data);
            console.log("Sending audio chunk to WebSocket:", event.data);
        }
    };

    mediaRecorder.start(100); // Ensure timeslice is passed in ms

    console.log("Recording started...");
}

// Function to stop recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
}

// Function to set up the WebSocket
function connectWebSocket() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log('Connected to WebSocket server');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.transcript) {
                console.log('Transcription:', data.transcript);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed');
    };
}

// Function to close the WebSocket
function closeWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
}

// Function to send audio chunks to WebSocket
function sendToWebSocket(chunk) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        // const blob = new Blob([chunk], { type: "audio/webm" });
        // console.log("Sending WebM blob to WebSocket:", blob);
        console.log("Sending >>>>>>>>>>",chunk)
        ws.send(chunk);
    } else {
        console.warn("WebSocket is not open. Could not send chunk.");
    }
}

// Initialize device and set up call button
document.addEventListener('DOMContentLoaded', async () => {
    await initializeDevice();
    document.getElementById('start-call').addEventListener('click', makeCall);
});
