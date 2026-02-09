export class AudioProcessor {
  constructor() {
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.chunks = [];
    this.stream = null;
  }
  
  async init() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log('Audio processor initialized');
  }
  
  async startRecording(onDataCallback, onLevelCallback) {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Check for supported mime types - prefer WAV or formats compatible with OpenAI Whisper
      let mimeType;
      const preferredTypes = [
        'audio/wav',
        'audio/wave',
        'audio/mp4',
        'audio/mpeg',
        'audio/webm;codecs=pcm',
        'audio/webm'
      ];
      
      for (const type of preferredTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      if (!mimeType) {
        throw new Error('No supported audio format found in your browser');
      }
      
      console.log('🎤 Using audio format:', mimeType);
      
      const options = { 
        mimeType,
        audioBitsPerSecond: 128000 // 128kbps for better quality
      };
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      
      this.chunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('📦 Audio chunk received:', event.data.size, 'bytes');
          this.chunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        console.log('⏹️ MediaRecorder stopped. Total chunks:', this.chunks.length);
        const blob = new Blob(this.chunks, { type: mimeType });
        console.log('📦 Final blob created:', blob.size, 'bytes, type:', blob.type);
        if (onDataCallback) {
          onDataCallback(blob);
        }
        this.chunks = [];
      };
      
      // Start recording with timeslice for consistent chunks
      // Using timeslice ensures data is available even for short recordings
      this.mediaRecorder.start(100); // Request data every 100ms
      
      // Setup audio analyser for visual feedback
      if (onLevelCallback) {
        this.setupAnalyser(this.stream, onLevelCallback);
      }
      
      console.log('🎤 Recording started with mimetype:', mimeType);
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }
  
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      console.log('Recording stopped');
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
  
  setupAnalyser(stream, onLevelCallback) {
    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    
    source.connect(this.analyser);
    
    // Monitor audio levels
    this.monitorAudioLevels(onLevelCallback);
  }
  
  monitorAudioLevels(callback) {
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkLevel = () => {
      if (!this.analyser) return;
      
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume (0-100)
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const level = Math.min(100, (average / 128) * 100);
      
      callback(level);
      
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        requestAnimationFrame(checkLevel);
      }
    };
    
    checkLevel();
  }
  
  async base64ToAudioBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    return await this.audioContext.decodeAudioData(bytes.buffer);
  }
  
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  cleanup() {
    this.stopRecording();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
  }
}
