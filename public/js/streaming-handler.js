export class StreamingHandler {
  constructor(avatarController) {
    this.controller = avatarController;
    this.audioQueue = [];
    this.isStreaming = false;
    this.streamContext = null;
  }
  
  async startStreaming() {
    if (this.isStreaming) {
      console.warn('Already streaming');
      return;
    }
    
    try {
      // Initialize streaming mode with TalkingHead
      // Note: This requires TalkingHead to support streaming API
      // The actual implementation depends on the TalkingHead version
      this.isStreaming = true;
      console.log('Streaming started');
    } catch (error) {
      console.error('Error starting streaming:', error);
      throw error;
    }
  }
  
  async streamAudioChunk(audioData, words, timestamps) {
    if (!this.isStreaming) {
      await this.startStreaming();
    }
    
    try {
      // Add to queue
      this.audioQueue.push({
        audioData,
        words,
        timestamps
      });
      
      // Process queue
      await this.processQueue();
    } catch (error) {
      console.error('Error streaming audio chunk:', error);
      throw error;
    }
  }
  
  async processQueue() {
    if (this.audioQueue.length === 0) return;
    
    const chunk = this.audioQueue.shift();
    
    try {
      // Play audio chunk with lip-sync
      await this.controller.speak(
        chunk.audioData,
        chunk.timestamps,
        chunk.words.join(' ')
      );
      
      // Process next chunk if available
      if (this.audioQueue.length > 0) {
        await this.processQueue();
      }
    } catch (error) {
      console.error('Error processing queue:', error);
      // Continue with next chunk even if this one failed
      if (this.audioQueue.length > 0) {
        await this.processQueue();
      }
    }
  }
  
  async streamTextChunk(text) {
    try {
      // Stream text directly (if supported by TalkingHead)
      await this.controller.speakText(text);
    } catch (error) {
      console.error('Error streaming text:', error);
      throw error;
    }
  }
  
  stopStreaming() {
    if (!this.isStreaming) {
      return;
    }
    
    try {
      this.isStreaming = false;
      this.audioQueue = [];
      this.controller.stopSpeaking();
      console.log('Streaming stopped');
    } catch (error) {
      console.error('Error stopping streaming:', error);
    }
  }
  
  updateSubtitles(text) {
    const subtitlesElement = document.getElementById('subtitles');
    if (subtitlesElement) {
      subtitlesElement.textContent = text;
    }
  }
  
  clearSubtitles() {
    const subtitlesElement = document.getElementById('subtitles');
    if (subtitlesElement) {
      subtitlesElement.textContent = '';
    }
  }
  
  getQueueLength() {
    return this.audioQueue.length;
  }
  
  clearQueue() {
    this.audioQueue = [];
  }
}
