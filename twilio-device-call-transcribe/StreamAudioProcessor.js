import { AudioProcessor } from '@twilio/voice-sdk';

class StreamAudioProcessor {
    constructor(deepgramSocket) {
        this.deepgramSocket = deepgramSocket; // WebSocket for Deepgram API
    }

    async createProcessedStream(stream) {
        // Setup an AudioContext to process the audio data
        const audioContext = new AudioContext();
        const [audioTrack] = stream.getAudioTracks();
        const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));

        // Set up a ScriptProcessorNode to capture raw audio data
        const processor = audioContext.createScriptProcessor(2048, 1, 1);

        processor.onaudioprocess = (audioEvent) => {
            const inputData = audioEvent.inputBuffer.getChannelData(0);

            // Convert the audio buffer from Float32 to Int16 format (required by Deepgram)
            const int16Data = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                int16Data[i] = inputData[i] * 0x7FFF; // Convert Float32 [-1,1] to Int16 [-32768, 32767]
            }

            // Send the audio data to Deepgram via WebSocket
            if (this.deepgramSocket.readyState === WebSocket.OPEN) {
                this.deepgramSocket.send(int16Data.buffer);
            }
        };

        source.connect(processor);
        processor.connect(audioContext.destination); // Required to keep the processor running

        // Return the original MediaStream to Twilio for further processing
        return new MediaStream([audioTrack]);
    }

    async destroyProcessedStream() {
        // Close the Deepgram WebSocket connection when done
        if (this.deepgramSocket.readyState === WebSocket.OPEN) {
            this.deepgramSocket.close();
        }
    }
}

export default StreamAudioProcessor;
