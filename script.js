let deviceReady = false;
let backendURL = "https://twilio-voice-call-backend.onrender.com";
let currentConnection = null;
let isMuted = false;  // Track mute state

// Function to set up Twilio client
function setupTwilioDevice(token) {
    updateButtonState({ callButton: true, hangupButton: false, muteButton: true });
    Twilio.Device.setup(token);

    Twilio.Device.ready(() => {
        console.log('Twilio Device ready to make calls');
        deviceReady = true;
        document.getElementById('callButton').disabled = false;
    });

    Twilio.Device.error(error => {
        console.error('Twilio Device error:', error.message);
    });

    Twilio.Device.disconnect(() => {
        console.log('Call ended');
        updateButtonState({ callButton: false, hangupButton: true, muteButton: true });
        currentConnection = null;
    });
}

// Fetch token from the server and initialize the Twilio client
fetch(`${backendURL}/token`)
    .then(response => response.json())
    .then(data => setupTwilioDevice(data.token))
    .catch(error => {
        console.error('Error fetching token:', error);
        alert('Failed to fetch token from the server.');
    });

// Function to make a call
function makeCall() {
    if (!deviceReady) {
        console.log('Twilio Device is not ready yet. Please wait.');
        return;
    }

    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    if (!phoneNumber) {
        alert('Please enter a valid phone number.');
        return;
    }

    const params = { number: phoneNumber };

    // First, send the phone number to the server to initiate the call
    fetch(`${backendURL}/getNum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    })
        .then(() => {
            currentConnection = Twilio.Device.connect(params);
            console.log('Call connected');
            currentConnection.on('accept', () => {
                console.log('Call connected');
                updateButtonState({ callButton: true, hangupButton: false, muteButton: false });
            });
            currentConnection.on('disconnect', () => {
                console.log('Call disconnected');
                updateButtonState({ callButton: false, hangupButton: true, muteButton: true });
            });
        })
        .catch(error => {
            console.error('Error during call process:', error);
            alert('Failed to initiate call. Please check the configuration.');
            updateButtonState({ callButton: false, hangupButton: true, muteButton: true });
        });
}

// Function to hang up the call
function hangupCall() {
    if (currentConnection) {
        currentConnection.disconnect();
        updateButtonState({ callButton: false, hangupButton: true, muteButton: true });
        console.log('Call disconnected by user');
    } else {
        console.log('No active call to disconnect.');
    }
}

// Function to toggle mute/unmute
function toggleMute() {
    if (currentConnection) {
        isMuted = !isMuted;
        currentConnection.mute(isMuted);
        document.getElementById('muteButton').textContent = isMuted ? 'Unmute' : 'Mute';
        console.log(isMuted ? 'Microphone muted' : 'Microphone unmuted');
    }
}

// Utility to manage button states
function updateButtonState({ callButton, hangupButton, muteButton }) {
    document.getElementById('callButton').disabled = callButton;
    document.getElementById('hangupButton').disabled = hangupButton;
    document.getElementById('muteButton').disabled = muteButton;
}
