let deviceReady = false;
let ngrok = "https://e678-106-222-237-223.ngrok-free.app";
let currentConnection = null; // To track the active connection

// Function to set up Twilio client
function setupTwilioDevice(token) {
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
fetch(`${ngrok}/token`)
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
        return;  // Don't proceed with making the call until the device is ready
    }

    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    if (!phoneNumber) {
        alert('Please enter a valid phone number.');
        return;
    }

    // Disable call button, enable hangup button
    document.getElementById('callButton').disabled = true;
    document.getElementById('hangupButton').disabled = false;

    const params = { number: phoneNumber };

    fetch(`${ngrok}/getNum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    })
        .then(response => response.json())
        .then(data => {
            console.log('Call initiated:', data);
        })
        .catch(error => {
            console.error('Error initiating call:', error);
            alert('Failed to initiate call.');
            document.getElementById('callButton').disabled = false;
            document.getElementById('hangupButton').disabled = true;
        });

    // Establish Twilio connection
    try {
        currentConnection = Twilio.Device.connect(params)

        currentConnection.on('accept', function () {
            console.log('Call connected');
        });

        currentConnection.on('disconnect', function () {
            console.log('Call disconnected');
        });
    } catch (error) {
        console.log(error)
    }
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
