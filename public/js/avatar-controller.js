export class AvatarController {
  constructor(head) {
    this.head = head;
    this.isSpeaking = false;
    this.currentMood = 'neutral';
  }
  
  async init() {
    if (!this.head) {
      throw new Error('TalkingHead instance not provided');
    }
    console.log('Avatar controller initialized');
  }
  
  async speak(audioData, timestamps, text) {
    try {
      this.isSpeaking = true;
      
      // Convert base64 audio to AudioBuffer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const binary = atob(audioData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
      console.log('🎵 Audio buffer decoded:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels
      });
      
      // Prepare word timing data - IMPORTANT: TalkingHead expects milliseconds!
      const words = timestamps.map(t => t.word);
      const wtimes = timestamps.map(t => t.start); // Keep in milliseconds
      const wdurations = timestamps.map(t => t.duration); // Keep in milliseconds
      
      console.log('👄 Lip-sync data prepared:', {
        words: words,
        wtimes: wtimes,
        wdurations: wdurations,
        totalWords: words.length,
        firstWord: words[0],
        firstTime: wtimes[0] + 'ms',
        audioDuration: audioBuffer.duration + 's'
      });
      
      // Use TalkingHead's speakAudio method with correct format
      // Pass complete audio object as first parameter
      await this.head.speakAudio({
        audio: audioBuffer,
        words: words,
        wtimes: wtimes,
        wdurations: wdurations
      }, {
        lipsyncLang: 'en'
      });
      
      this.isSpeaking = false;
      console.log('✅ Speech and lip-sync completed successfully');
    } catch (error) {
      console.error('❌ Avatar speak error:', error);
      console.error('Error stack:', error.stack);
      this.isSpeaking = false;
      throw error;
    }
  }
  
  async speakText(text) {
    try {
      this.isSpeaking = true;
      await this.head.speakText(text);
      this.isSpeaking = false;
    } catch (error) {
      console.error('Avatar speak text error:', error);
      this.isSpeaking = false;
      throw error;
    }
  }
  
  setMood(mood) {
    try {
      this.currentMood = mood;
      this.head.setMood(mood);
      console.log(`Avatar mood set to: ${mood}`);
    } catch (error) {
      console.error('Set mood error:', error);
    }
  }
  
  lookAtCamera(duration = 1000) {
    try {
      this.head.lookAtCamera(duration);
    } catch (error) {
      console.error('Look at camera error:', error);
    }
  }
  
  makeEyeContact(duration = 3000) {
    try {
      this.head.lookAtCamera(duration);
    } catch (error) {
      console.error('Make eye contact error:', error);
    }
  }
  
  playGesture(gesture, duration = 2) {
    try {
      this.head.playGesture(gesture, duration);
    } catch (error) {
      console.error('Play gesture error:', error);
    }
  }
  
  /**
   * Play an FBX animation
   * @param {string} animationName - Name of the animation (e.g., 'waving', 'breakdance')
   * @param {number} duration - Duration in seconds
   * @param {number} scale - Scale factor for Mixamo animations (default 0.01)
   */
  async playAnimation(animationName, duration = 5, scale = 0.01) {
    try {
      // Get animation configuration from library
      const animConfig = window.animationLibrary?.getAnimation(animationName);
      if (!animConfig) {
        console.warn(`Animation "${animationName}" not found in library`);
        return false;
      }
      
      // URL encode the filename to handle spaces
      const encodedFileName = encodeURIComponent(animConfig.file);
      const url = `/animations/${encodedFileName}`;
      
      // Use the duration from config if not specified
      const finalDuration = duration || animConfig.duration || 5;
      
      console.log(`🎬 Playing animation: ${animationName} (${animConfig.file}) for ${finalDuration}s`);
      
      await this.head.playAnimation(url, null, finalDuration, 0, scale);
      
      console.log(`✅ Animation ${animationName} started successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error playing animation ${animationName}:`, error);
      throw error;
    }
  }

  /**
   * Stop the current animation
   */
  stopAnimation() {
    try {
      this.head.stopAnimation();
      console.log('⏹️ Animation stopped');
    } catch (error) {
      console.error('Error stopping animation:', error);
    }
  }

  /**
   * Check if animation is currently playing
   */
  isAnimationPlaying() {
    try {
      return this.head.mixer && this.head.mixer._actions.length > 0;
    } catch (error) {
      return false;
    }
  }
  
  speakEmoji(emoji) {
    try {
      this.head.speakEmoji(emoji);
    } catch (error) {
      console.error('Speak emoji error:', error);
    }
  }
  
  stopSpeaking() {
    try {
      if (this.isSpeaking) {
        this.head.stopSpeaking();
        this.isSpeaking = false;
      }
    } catch (error) {
      console.error('Stop speaking error:', error);
    }
  }
  
  getIsSpeaking() {
    return this.isSpeaking;
  }
}
