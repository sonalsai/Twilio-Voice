let deviceReady = false;

// Function to set up Twilio client
function setupTwilioDevice(token) {
    Twilio.Device.setup(token);

    Twilio.Device.ready(function () {
        console.log('Twilio Device ready to make calls');
        deviceReady = true;  // Set deviceReady to true when the device is ready
    });

    Twilio.Device.error(function (error) {
        console.log('Twilio Device error: ', error.message);
    });

    Twilio.Device.disconnect(function () {
        console.log('Call ended');
    });
}

// Fetch token from the server and initialize the Twilio client
fetch('https://b477-106-222-237-223.ngrok-free.app/token')
    .then(response => response.json())
    .then(data => {
        setupTwilioDevice(data.token);
    })
    .catch(error => console.error('Error fetching token:', error));

// Function to make a call
function makeCall() {
    if (!deviceReady) {
        console.log('Twilio Device is not ready yet. Please wait.');
        return;  // Don't proceed with making the call until the device is ready
    }

    const phoneNumber = document.getElementById('phoneNumber').value;
    console.log(phoneNumber);

    // Pass the phone number to Twilio
    const params = { number: phoneNumber };

    fetch('https://b477-106-222-237-223.ngrok-free.app/getNum', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    })
        .then(response => response.json())
        .then(data => {
            console.log(data);
        })

    const connection = Twilio.Device.connect(params);

    connection.on('accept', function () {
        console.log('Call connected');
    });

    connection.on('disconnect', function () {
        console.log('Call disconnected');
    });
}

