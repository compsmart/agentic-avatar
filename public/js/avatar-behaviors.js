export class AvatarBehaviors {
  constructor(avatarController) {
    this.controller = avatarController;
    this.idleInterval = null;
    this.isEnabled = false;
  }
  
  start() {
    this.isEnabled = true;
    this.setupIdleBehaviors();
    console.log('Avatar behaviors started');
  }
  
  stop() {
    this.isEnabled = false;
    if (this.idleInterval) {
      clearInterval(this.idleInterval);
      this.idleInterval = null;
    }
    console.log('Avatar behaviors stopped');
  }
  
  setupIdleBehaviors() {
    // Random idle animations when not speaking
    this.idleInterval = setInterval(() => {
      if (!this.controller.getIsSpeaking() && this.isEnabled) {
        this.performIdleAction();
      }
    }, 8000); // Every 8 seconds
  }
  
  performIdleAction() {
    const actions = [
      () => this.controller.playGesture('handup', 2),
      () => this.controller.lookAtCamera(2000),
      () => this.randomLook(),
      () => this.blink()
    ];
    
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    randomAction();
  }
  
  randomLook() {
    // Look at random position
    const x = Math.random() * 100 - 50;
    const y = Math.random() * 50 - 25;
    
    try {
      // This would require access to the TalkingHead instance
      // For now, just look at camera
      this.controller.lookAtCamera(2000);
    } catch (error) {
      console.error('Random look error:', error);
    }
  }
  
  blink() {
    // Trigger blink animation
    // This is handled automatically by TalkingHead
  }
  
  async reactToEmotion(emotion) {
    const reactions = {
      'happy': () => {
        this.controller.setMood('happy');
        this.controller.playGesture('thumbup', 2);
      },
      'sad': () => {
        this.controller.setMood('sad');
        this.controller.speakEmoji('😔');
      },
      'confused': () => {
        this.controller.setMood('neutral');
        this.controller.playGesture('shrug', 2);
      },
      'excited': () => {
        this.controller.setMood('love');
        this.controller.speakEmoji('🎉');
      },
      'thinking': () => {
        this.controller.setMood('neutral');
        this.controller.playGesture('index', 2);
      },
      'greeting': () => {
        this.controller.setMood('happy');
        this.controller.playGesture('handup', 2);
      }
    };
    
    if (reactions[emotion]) {
      reactions[emotion]();
    } else {
      // Default to neutral
      this.controller.setMood('neutral');
    }
  }
  
  onSpeakingStart() {
    // Behaviors when avatar starts speaking
    this.controller.makeEyeContact(3000);
  }
  
  onSpeakingEnd() {
    // Behaviors when avatar stops speaking
    this.controller.setMood(this.controller.currentMood || 'neutral');
  }
  
  onListeningStart() {
    // Behaviors when listening to user
    this.controller.setMood('neutral');
    this.controller.makeEyeContact(5000);
  }
  
  onListeningEnd() {
    // Behaviors when stopped listening
  }
}
