let deviceReady = false;
let backendURL = "https://localhost:3000";
let currentConnection = null; // To track the active connection

let device
// Function to set up Twilio client
function setupTwilioDevice(token) {
    device = Twilio.Device
    console.log("Device >>> ", device)
    Twilio.Device.setup(token);

    Twilio.Device.ready(function () {
        console.log('Twilio Device ready to make calls');
        deviceReady = true;  // Set deviceReady to true when the device is ready
        document.getElementById('callButton').disabled = false; // Enable call button
    });

    Twilio.Device.error(function (error) {
        console.log('Twilio Device error: ', error.message);
        alert(`Device Error: ${error.message}`);
    });

    Twilio.Device.disconnect(function () {
        console.log('Call ended');
        document.getElementById('hangupButton').disabled = true; // Disable hangup button
        document.getElementById('callButton').disabled = false; // Re-enable call button
        currentConnection = null;
    });
}

// Fetch token from the server and initialize the Twilio client
fetch(`${backendURL}/token`)
    .then(response => response.json())
    .then(data => {
        setupTwilioDevice(data.token);
    })
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

    // Disable call button, enable hangup button
    document.getElementById('callButton').disabled = true;
    document.getElementById('hangupButton').disabled = false;

    // Make the call using the Twilio Device
    currentConnection = device.connect({
        number: phoneNumber
    });

    console.log(currentConnection)

    currentConnection.on('accept', function () {
        console.log('Call connected');
    });

    currentConnection.on('disconnect', function () {
        console.log('Call disconnected');
        document.getElementById('callButton').disabled = false;
        document.getElementById('hangupButton').disabled = true;
        currentConnection = null;
    });
}

// Function to hang up the call
function hangupCall() {
    if (currentConnection) {
        currentConnection.disconnect(); // Disconnect the call
        document.getElementById('callButton').disabled = false; // Enable call button
        document.getElementById('hangupButton').disabled = true; // Disable hangup button
        console.log('Call disconnected by user');
    } else {
        console.log('No active call to disconnect.');
    }
}
