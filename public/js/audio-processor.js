/**
 * AudioProcessor - Captures raw 16kHz mono PCM from the microphone
 * and streams base64-encoded chunks over a callback.
 *
 * Uses ScriptProcessorNode for broad browser compatibility.
 * The mic runs at the browser's native sample rate and is
 * down-sampled to 16 kHz before sending.
 */
export class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.stream = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.analyser = null;
    this.isCapturing = false;
    this.onChunkCallback = null;
    this.onLevelCallback = null;
  }

  async init() {
    // AudioContext is created lazily in startCapture to respect autoplay policy
    console.log('AudioProcessor initialized (lazy)');
  }

  /**
   * Start capturing mic audio and streaming PCM chunks.
   * @param {WebSocket} ws - WebSocket to send chunks on (or null)
   * @param {Function} onChunk - Called with base64 PCM string for each chunk
   * @param {Function} onLevel - Called with audio level 0-100
   */
  async startCapture(onChunk, onLevel) {
    if (this.isCapturing) return;

    this.onChunkCallback = onChunk;
    this.onLevelCallback = onLevel;

    // Get mic stream
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000  // hint, browser may ignore
      }
    });

    // Create audio context at whatever sample rate the browser gives us
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const nativeSampleRate = this.audioContext.sampleRate;
    console.log(`Mic native sample rate: ${nativeSampleRate} Hz`);

    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

    // Analyser for level metering
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.sourceNode.connect(this.analyser);

    // ScriptProcessor to get raw Float32 samples
    // bufferSize 4096 at 48kHz ~ 85ms chunks
    const BUFFER_SIZE = 4096;
    this.processorNode = this.audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isCapturing) return;

      const inputData = e.inputBuffer.getChannelData(0);

      // Downsample to 16kHz
      const pcm16k = this._downsample(inputData, nativeSampleRate, 16000);

      // Convert Float32 -> Int16
      const int16 = this._float32ToInt16(pcm16k);

      // Convert to base64
      const base64 = this._arrayBufferToBase64(int16.buffer);

      if (this.onChunkCallback) {
        this.onChunkCallback(base64);
      }
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination); // required for ScriptProcessor

    this.isCapturing = true;

    // Start level monitoring
    if (this.onLevelCallback) {
      this._monitorLevels();
    }

    console.log('Mic capture started (16kHz PCM streaming)');
  }

  stopCapture() {
    this.isCapturing = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.onChunkCallback = null;
    this.onLevelCallback = null;

    console.log('Mic capture stopped');
  }

  // --- Internal helpers ---

  _downsample(float32Array, fromRate, toRate) {
    if (fromRate === toRate) return float32Array;
    const ratio = fromRate / toRate;
    const newLength = Math.round(float32Array.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const low = Math.floor(srcIndex);
      const high = Math.min(low + 1, float32Array.length - 1);
      const frac = srcIndex - low;
      result[i] = float32Array[low] * (1 - frac) + float32Array[high] * frac;
    }
    return result;
  }

  _float32ToInt16(float32Array) {
    const int16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  }

  _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  _monitorLevels() {
    if (!this.analyser || !this.isCapturing) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const check = () => {
      if (!this.analyser || !this.isCapturing) return;

      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const level = Math.min(100, (average / 128) * 100);

      if (this.onLevelCallback) {
        this.onLevelCallback(level);
      }

      requestAnimationFrame(check);
    };

    check();
  }

  cleanup() {
    this.stopCapture();
  }
}
