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
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

// Endpoint to generate Twilio token
app.get('/token', (req, res) => {
    const capability = new twilio.jwt.ClientCapability({
        accountSid: accountSid,
        authToken: authToken,
    });

    capability.addScope(
        new twilio.jwt.ClientCapability.OutgoingClientScope({
            applicationSid: process.env.TWILIO_TWIML_APP_SID
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

// Endpoint to handle the outgoing call with TwiML response
app.post('/makeCall', (req, res) => {
    const to = phoneNumber;

    if (!to) {
        return res.status(400).send('Phone number is required.');
    }

    // Create a TwiML response to dial the phone number and start the stream
    const twiml = new twilio.twiml.VoiceResponse();

    // Start streaming audio to the WebSocket
    const start = twiml.start();
    start.stream({
        url: "wss://5bfc-202-88-244-71.ngrok-free.app", // WebSocket URL where the audio stream will be sent
        name: 'Call Audio Stream',
        track: 'both_tracks' // Stream both inbound and outbound audio
    });

    // Dial the phone number with the specified caller ID
    twiml.dial({ callerId: twilioPhoneNumber }, to);

    // Log the generated TwiML
    console.log('Generated TwiML:', twiml.toString());

    // Send the TwiML response to the client
    res.type('text/xml');
    res.send(twiml.toString());
});

// Server listening
const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
