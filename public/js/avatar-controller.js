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
    this.registerCustomMoods();
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

      case 'set_expression':
        this.playExpression(args.expression);
        return `Playing expression ${args.expression}`;

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

  // --- Micro-expressions ---

  playExpression(expression) {
    const DURATION = 2000;
    const expressions = {
      wink: { eyeBlinkLeft: 1 },
      raised_eyebrow: { browOuterUpLeft: 0.8 },
      surprise: { eyeWideLeft: 0.8, eyeWideRight: 0.8, browInnerUp: 0.8, jawOpen: 0.4 },
      thinking: { eyeLookUpLeft: 0.5, mouthPucker: 0.3, browInnerUp: 0.3 },
      smirk: { mouthSmileLeft: 0.5, browOuterUpLeft: 0.3 },
      pout: { mouthPucker: 0.6, mouthFrownLeft: 0.3, mouthFrownRight: 0.3, browInnerUp: 0.4 },
      tongue_out: { tongueOut: 0.7, mouthSmileLeft: 0.15, mouthSmileRight: 0.15 },
      eye_roll: { eyeLookUpLeft: 0.6, eyeLookUpRight: 0.6, eyeBlinkLeft: 0.3, eyeBlinkRight: 0.3 },
      cringe: { eyeSquintLeft: 0.8, eyeSquintRight: 0.8, noseSneerLeft: 0.5, noseSneerRight: 0.5, mouthStretchLeft: 0.5, mouthStretchRight: 0.5 },
      cheek_puff: { cheekPuff: 0.8 }
    };

    const morphs = expressions[expression];
    if (!morphs) {
      console.warn(`Unknown expression: ${expression}`);
      return;
    }

    try {
      for (const [target, value] of Object.entries(morphs)) {
        this.head.setFixedValue(target, value, DURATION);
      }
      console.log(`Playing expression: ${expression} (${DURATION}ms)`);
    } catch (error) {
      console.error('Play expression error:', error);
    }
  }

  // --- Custom moods ---

  registerCustomMoods() {
    if (!this.head?.animMoods) return;

    // Get the neutral mood as a base template for anims
    const neutralAnims = this.head.animMoods['neutral']?.anims;
    if (!neutralAnims) return;

    const customMoods = {
      surprised: {
        baseline: { eyeWideLeft: 0.7, eyeWideRight: 0.7, browInnerUp: 0.8, browOuterUpLeft: 0.5, browOuterUpRight: 0.5, jawOpen: 0.3, mouthFunnel: 0.2 },
        speech: { deltaRate: 0.1, deltaPitch: 0.3, deltaVolume: 0 }
      },
      confused: {
        baseline: { browDownLeft: 0.5, browInnerUp: 0.4, browOuterUpRight: 0.4, eyeSquintLeft: 0.3, mouthFrownLeft: 0.2, mouthFrownRight: 0.2, mouthPucker: 0.2 },
        speech: { deltaRate: -0.1, deltaPitch: 0, deltaVolume: 0 }
      },
      flirty: {
        baseline: { browOuterUpLeft: 0.3, eyeBlinkRight: 0.2, eyeSquintLeft: 0.4, eyeSquintRight: 0.4, mouthSmileLeft: 0.3, mouthSmileRight: 0.15, mouthDimpleLeft: 0.2, mouthDimpleRight: 0.2 },
        speech: { deltaRate: -0.1, deltaPitch: -0.3, deltaVolume: 0 }
      },
      confident: {
        baseline: { browDownLeft: 0.15, browDownRight: 0.15, eyeSquintLeft: 0.2, eyeSquintRight: 0.2, mouthSmileLeft: 0.15, mouthSmileRight: 0.15, jawForward: 0.1 },
        speech: { deltaRate: -0.1, deltaPitch: -0.1, deltaVolume: 0 }
      },
      bored: {
        baseline: { eyeBlinkLeft: 0.3, eyeBlinkRight: 0.3, eyesLookDown: 0.3, mouthFrownLeft: 0.2, mouthFrownRight: 0.2, mouthRollLower: 0.2, browInnerUp: 0.1 },
        speech: { deltaRate: -0.2, deltaPitch: -0.2, deltaVolume: 0 }
      },
      excited: {
        baseline: { eyeWideLeft: 0.4, eyeWideRight: 0.4, mouthSmileLeft: 0.4, mouthSmileRight: 0.4, browInnerUp: 0.5, browOuterUpLeft: 0.3, browOuterUpRight: 0.3, mouthDimpleLeft: 0.2, mouthDimpleRight: 0.2 },
        speech: { deltaRate: 0.2, deltaPitch: 0.3, deltaVolume: 0 }
      },
      skeptical: {
        baseline: { browDownRight: 0.4, browOuterUpLeft: 0.6, eyeSquintRight: 0.4, mouthPucker: 0.15, mouthLeft: 0.2 },
        speech: { deltaRate: -0.1, deltaPitch: 0, deltaVolume: 0 }
      }
    };

    for (const [name, mood] of Object.entries(customMoods)) {
      this.head.animMoods[name] = {
        baseline: mood.baseline,
        speech: mood.speech,
        anims: neutralAnims
      };
    }

    console.log('Custom moods registered:', Object.keys(customMoods).join(', '));
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
      const url = `/saas/avatar/animations/${encodedFileName}`;
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
