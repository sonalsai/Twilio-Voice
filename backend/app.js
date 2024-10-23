require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
let phoneNumber;

app.use(cors());
app.use(bodyParser.json());

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;  // Replace with your Twilio Phone Number
const client = twilio(accountSid, authToken);

// Endpoint to generate Twilio token
app.get('/token', (req, res) => {
    const capability = new twilio.jwt.ClientCapability({
        accountSid: accountSid,
        authToken: authToken,
    });

    capability.addScope(
        new twilio.jwt.ClientCapability.OutgoingClientScope({
            applicationSid: process.env.TWILIO_TWIML_APP_SID  // Replace with your TwiML App SID
        })
    );

    const token = capability.toJwt();
    res.json({ token });
});

app.post('/getNum', (req, res) => {
    const { number } = req.body;
    phoneNumber = number;
    res.send({ status: "Ok" });
});

// Endpoint to handle the outgoing call
app.post('/makeCall', (req, res) => {
    const to = phoneNumber;

    if (!to) {
        return res.status(400).send('Phone number is required.');
    }

    // Create a TwiML response
    const twiml = new twilio.twiml.VoiceResponse();

    // Start streaming audio to the WebSocket
    const start = twiml.start();
    start.stream({
        url: "wss://6506-106-222-237-223.ngrok-free.app", // WebSocket URL where the audio stream will be sent
        name: 'Call Audio Stream', // Optional: Name of the stream
        track: 'both' // Stream both inbound and outbound audio
    });

    // Dial the phone number
    twiml.dial({ callerId: twilioPhoneNumber }, to);

    // Log TwiML and response to check correctness
    console.log('Generated TwiML:', twiml.toString());

    // Send the generated TwiML as the response
    res.type('text/xml');
    res.send(twiml.toString());
});

// Server listening
const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
