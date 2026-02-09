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

  // --- Tool call dispatcher (Gemini function calling) ---

  /**
   * Execute an avatar action from a Gemini tool call.
   * @param {string} name - Tool function name
   * @param {Object} args - Tool arguments
   * @returns {string} result description
   */
  handleToolCall(name, args) {
    switch (name) {
      case 'set_mood':
        this.setMood(args.mood);
        return `Mood set to ${args.mood}`;

      case 'play_gesture':
        this.playGesture(args.gesture, args.duration || 2);
        return `Playing gesture ${args.gesture}`;

      case 'play_animation':
        this.playAnimation(args.animation, args.duration);
        return `Playing animation ${args.animation}`;

      case 'set_camera_view':
        this.setCameraView(args.view);
        return `Camera view set to ${args.view}`;

      default:
        console.warn(`Unknown tool call: ${name}`);
        return `Unknown tool: ${name}`;
    }
  }

  // --- Speech (legacy, kept for non-streaming fallback) ---

  async speak(audioData, timestamps, text) {
    try {
      this.isSpeaking = true;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const binary = atob(audioData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);

      const words = timestamps.map(t => t.word);
      const wtimes = timestamps.map(t => t.start);
      const wdurations = timestamps.map(t => t.duration);

      await this.head.speakAudio({
        audio: audioBuffer,
        words,
        wtimes,
        wdurations
      }, {
        lipsyncLang: 'en'
      });

      this.isSpeaking = false;
    } catch (error) {
      console.error('Avatar speak error:', error);
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

  // --- Mood ---

  setMood(mood) {
    try {
      this.currentMood = mood;
      this.head.setMood(mood);
      console.log(`Avatar mood set to: ${mood}`);
    } catch (error) {
      console.error('Set mood error:', error);
    }
  }

  // --- Camera ---

  setCameraView(view) {
    try {
      if (this.head?.setView) {
        this.head.setView(view);
        console.log(`Camera view set to: ${view}`);
        // Sync the UI dropdown
        const viewSelect = document.getElementById('camera-view');
        if (viewSelect) viewSelect.value = view;
      }
    } catch (error) {
      console.error('Set camera view error:', error);
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

  // --- Gestures ---

  playGesture(gesture, duration = 2) {
    try {
      this.head.playGesture(gesture, duration);
      console.log(`Playing gesture: ${gesture}`);
    } catch (error) {
      console.error('Play gesture error:', error);
    }
  }

  // --- Animations ---

  async playAnimation(animationName, duration = 5, scale = 0.01) {
    try {
      const animConfig = window.animationLibrary?.getAnimation(animationName);
      if (!animConfig) {
        console.warn(`Animation "${animationName}" not found in library`);
        return false;
      }

      const encodedFileName = encodeURIComponent(animConfig.file);
      const url = `/animations/${encodedFileName}`;
      const finalDuration = duration || animConfig.duration || 5;

      console.log(`Playing animation: ${animationName} (${animConfig.file}) for ${finalDuration}s`);
      await this.head.playAnimation(url, null, finalDuration, 0, scale);
      return true;
    } catch (error) {
      console.error(`Error playing animation ${animationName}:`, error);
      throw error;
    }
  }

  stopAnimation() {
    try {
      this.head.stopAnimation();
      console.log('Animation stopped');
    } catch (error) {
      console.error('Error stopping animation:', error);
    }
  }

  isAnimationPlaying() {
    try {
      return this.head.mixer && this.head.mixer._actions.length > 0;
    } catch (error) {
      return false;
    }
  }

  // --- Misc ---

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
