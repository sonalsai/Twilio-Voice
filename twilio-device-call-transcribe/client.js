// StreamAudioProcessor class definition
// class StreamAudioProcessor {
//     constructor(deepgramSocket) {
//         this.deepgramSocket = deepgramSocket; // WebSocket for Deepgram API
//     }

//     async createProcessedStream(stream) {
//         const audioContext = new AudioContext();
//         const [audioTrack] = stream.getAudioTracks();
//         const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
//         const processor = audioContext.createScriptProcessor(2048, 1, 1);

//         processor.onaudioprocess = (audioEvent) => {
//             const inputData = audioEvent.inputBuffer.getChannelData(0);
//             const int16Data = new Int16Array(inputData.length);
//             for (let i = 0; i < inputData.length; i++) {
//                 int16Data[i] = inputData[i] * 0x7FFF;
//             }
//             if (this.deepgramSocket.readyState === WebSocket.OPEN) {
//                 this.deepgramSocket.send(int16Data.buffer);
//             }
//         };

//         source.connect(processor);
//         processor.connect(audioContext.destination);
//         return new MediaStream([audioTrack]);
//     }

//     async destroyProcessedStream() {
//         if (this.deepgramSocket.readyState === WebSocket.OPEN) {
//             this.deepgramSocket.close();
//         }
//     }
// }

// Backend URL for fetching token
const backendURL = "https://db3f-106-222-237-223.ngrok-free.app";

let device;
let isDeviceReady = false;
let mediaRecorder;
let recordedChunks = [];
let audioContext;

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
            console.log("Call object:", call);
            console.log("MediaStream:", call.getLocalStream());

            const mediaStream = call.getLocalStream();
            if (mediaStream instanceof MediaStream) {
                startRecording(mediaStream);
            } else {
                console.error("MediaStream is not available.");
            }
        });

        connection.on('disconnect', () => {
            console.log('Call disconnected. Stopping audio recording...');
            stopRecording();
        });
    } catch (error) {
        console.error('Error while making the call:', error);
    }
}

// Function to start recording using the Web Audio API
function startRecording(mediaStream) {
    if (!mediaStream || !(mediaStream instanceof MediaStream)) {
        console.error("Invalid MediaStream for recording.");
        return;
    }

    if (typeof MediaRecorder === 'undefined') {
        console.error("MediaRecorder is not supported in this browser.");
        return;
    }

    mediaRecorder = new MediaRecorder(mediaStream);
    recordedChunks = [];

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        saveRecording();
    };

    mediaRecorder.start();
    console.log("Recording started...");
}

// Function to stop recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
}

// Function to save recording as a downloadable file
function saveRecording() {
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    recordedChunks = [];

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'recorded_call.webm';
    document.body.appendChild(a);
    a.click();

    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    console.log("Recording saved as 'recorded_call.webm'");
}

// Initialize device and set up call button
document.addEventListener('DOMContentLoaded', async () => {
    await initializeDevice();
    document.getElementById('start-call').addEventListener('click', makeCall);
});
