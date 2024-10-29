require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const { v4: uuidv4 } = require('uuid');  // Import the UUID generator

// Replace these values with your Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const appSid = process.env.TWILIO_TWIML_APP_SID;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/token', (req, res) => {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Generate a unique identity using UUID
    const identity = uuidv4();  // This generates a random UUID (e.g., 'a3f0e8c9-9f27-4261-b4b1-bbfb99f85b07')

    // Create an access token which we will sign and return to the client
    const token = new AccessToken(accountSid, apiKey, apiSecret, {
        identity: identity,
        ttl: 3600,  // Optional: Token expires in 1 hour
    });

    // Grant the access token Twilio Voice capabilities
    const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: appSid,
        incomingAllow: true, // Optional: Allow incoming calls
    });

    token.addGrant(voiceGrant);

    // Serialize the token to a JWT string and send it to the client
    res.send({
        identity: identity,  // Return the identity so the frontend knows which identity is used
        token: token.toJwt(),  // Return the token for the frontend to use
    });
});

app.post('/outgoing-call', (req, res) => {
    // const { To } = req.body;  // The number to dial
    const To = +918078206009
    const twilioPhoneNumber = "+13344215037";
    const twiml = new twilio.twiml.VoiceResponse();
    if (To) {
        twiml.dial({ callerId: twilioPhoneNumber }, To);
    } else {
        twiml.say("Thank you for calling. Please wait while we connect your call.");
    }

    res.type('text/xml');
    res.send(twiml.toString());
});


app.get('/', (req, res) => {
    res.send('Status OK')
})

app.listen(3000, () => {
    console.log('server listening on port 3000');
});
