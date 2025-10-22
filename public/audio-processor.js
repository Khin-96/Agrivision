// audio-processor.js
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(4096);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputChannel = input[0];
      
      for (let i = 0; i < inputChannel.length; i++) {
        // Convert float32 to int16
        this.buffer[this.bufferIndex++] = Math.max(-32768, Math.min(32767, inputChannel[i] * 32767));
        
        // Send buffer when full
        if (this.bufferIndex >= this.buffer.length) {
          this.port.postMessage(this.buffer);
          this.buffer = new Int16Array(4096);
          this.bufferIndex = 0;
        }
      }
    }
    
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);