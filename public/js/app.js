import { TalkingHead } from 'talkinghead';
import { OpenAIIntegration } from './openai-integration.js';
import { AudioProcessor } from './audio-processor.js';
import { AvatarController } from './avatar-controller.js';
import { AvatarBehaviors } from './avatar-behaviors.js';
import { ErrorHandler } from './error-handler.js';
import { PerformanceOptimizer } from './performance-optimizer.js';
import { StreamingHandler } from './streaming-handler.js';
import { waitForAvatarReady, patchTalkingHeadAnimate } from './avatar-fix.js';
import * as AnimationLibrary from './animation-library.js';

class VoiceAvatarApp {
  constructor() {
    this.head = null;
    this.openai = new OpenAIIntegration();
    this.audioProcessor = new AudioProcessor();
    this.avatarController = null;
    this.avatarBehaviors = null;
    this.streamingHandler = null;
    this.isListening = false;
    this.conversationHistory = [];
    this.selectedVoice = 'alloy';
    this.ws = null;
    
    this.init();
  }
  
  async init() {
    try {
      // Show loading
      this.showLoading(true);
      this.updateStatus('Initializing...');
      
      // Check server health
      await this.checkServerHealth();
      
      // Initialize avatar
      await this.initializeAvatar();
      
      // Initialize audio processor
      await this.audioProcessor.init();
      
      // Initialize controllers
      this.avatarController = new AvatarController(this.head);
      await this.avatarController.init();
      
      this.avatarBehaviors = new AvatarBehaviors(this.avatarController);
      this.streamingHandler = new StreamingHandler(this.avatarController);
      
      // Start idle behaviors
      this.avatarBehaviors.start();
      
      // Setup WebSocket connection
      this.setupWebSocket();
      
      // Setup UI controls
      this.setupControls();
      
      // Hide loading
      this.showLoading(false);
      this.updateStatus('Ready to talk!', 'ready');
      
      ErrorHandler.showSuccess('Avatar initialized successfully!');
      
      console.log('✅ Voice Avatar App initialized');
    } catch (error) {
      this.showLoading(false);
      this.updateStatus('Initialization failed', 'error');
      ErrorHandler.handle(error, 'Initialization');
    }
  }
  
  async initializeAvatar() {
    try {
      const avatarContainer = document.getElementById('avatar-container');
      if (!avatarContainer) {
        throw new Error('Avatar container not found');
      }
      
      // Get optimized settings for device
      const settings = PerformanceOptimizer.optimizeAvatarSettings();
      
      // Initialize TalkingHead with proper options
      this.head = new TalkingHead(avatarContainer, {
        ttsLang: "en-US",
        lipsyncLang: 'en',
        cameraView: 'full',  // Changed from 'upper' to show full body for animations
        modelFPS: settings.modelFPS,
        modelPixelRatio: settings.modelPixelRatio,
        cameraDistance: 1.5,  // Increased distance to fit full body
        cameraY: 0.2,  // Lowered camera to center full body better
        lightAmbientIntensity: 1.5,
        lightSpotIntensity: 0.5
      });
      
      // Apply animation safety patch
      patchTalkingHeadAnimate(this.head);
      
      // Load default avatar - Using TalkingHead's bundled avatar
      try {
        console.log('Loading TalkingHead avatar from repository...');
        
        // Use custom avatar from local avatars directory
        await this.head.showAvatar({
          url: './avatars/6989d13d6eb4878bb8783487.glb',
          body: 'F',
          avatarMood: 'happy',
          lipsyncLang: 'en'
        });
        
        // Wait for avatar to be fully ready
        await waitForAvatarReady(this.head);
        
        // Ensure avatar is visible and rendering
        if (this.head.nodeAvatar) {
          this.head.nodeAvatar.visible = true;
        }
        
        // Start the animation loop if not started
        if (!this.head.animating) {
          this.head.start();
        }
        
        // Look at camera to ensure proper positioning
        setTimeout(() => {
          if (this.head.lookAtCamera) {
            this.head.lookAtCamera(1000);
          }
        }, 500);
        
        console.log('✅ Avatar loaded successfully: Brunette (from TalkingHead repo)');
      } catch (localError) {
        console.error('Failed to load local avatar:', localError);
        console.warn('Trying built-in default avatar...');
        
        // Fallback: Use TalkingHead's built-in default
        try {
          await this.head.showAvatar({
            body: 'F',
            avatarMood: 'happy',
            lipsyncLang: 'en'
          });
          
          await waitForAvatarReady(this.head);
          
          // Ensure avatar is visible
          if (this.head.nodeAvatar) {
            this.head.nodeAvatar.visible = true;
          }
          
          // Start animation loop
          if (!this.head.animating) {
            this.head.start();
          }
          
          console.log('✅ Avatar loaded: Built-in Default');
        } catch (defaultError) {
          console.error('Failed to load built-in default:', defaultError);
          
          // Last resort: try without waiting for ready
          try {
            console.warn('Trying without waitForAvatarReady...');
            await this.head.showAvatar({
              body: 'F',
              avatarMood: 'happy',
              lipsyncLang: 'en'
            });
            
            // Ensure visible and start animation
            if (this.head.nodeAvatar) {
              this.head.nodeAvatar.visible = true;
            }
            if (!this.head.animating) {
              this.head.start();
            }
            
            console.log('✅ Avatar loaded without waiting for ready state');
            
            // Give it a moment to initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (finalError) {
            console.error('All avatar loading attempts failed:', finalError);
            throw new Error('Failed to load avatar. Error: ' + finalError.message);
          }
        }
      }
    } catch (error) {
      console.error('Avatar initialization error:', error);
      throw new Error('Failed to load avatar: ' + error.message);
    }
  }
  
  async checkServerHealth() {
    try {
      const health = await this.openai.checkHealth();
      if (health.status !== 'ok') {
        throw new Error('Server not healthy');
      }
      console.log('✅ Server health check passed');
    } catch (error) {
      ErrorHandler.showUserMessage('Warning: Could not connect to server. Some features may not work.', 'warning');
    }
  }
  
  setupWebSocket() {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname;
      const wsPort = 8080; // From .env WS_PORT
      
      this.ws = new WebSocket(`${wsProtocol}//${wsHost}:${wsPort}`);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.updateConnectionStatus(true);
      };
      
      this.ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          await this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ErrorHandler.handle(new Error('WebSocket connection failed'), 'WebSocket');
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.updateConnectionStatus(false);
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            this.setupWebSocket();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('WebSocket setup error:', error);
    }
  }
  
  async handleWebSocketMessage(message) {
    switch (message.type) {
      case 'speech_data':
        await this.handleSpeechData(message.data);
        break;
      case 'transcript':
        this.displayTranscript(message.text, 'user');
        break;
      case 'error':
        ErrorHandler.showUserMessage(message.message, 'error');
        break;
      case 'ack':
        console.log('Server acknowledged:', message.message);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }
  
  async handleSpeechData(speechData) {
    try {
      const { audio, timestamps, text } = speechData;
      
      // Display response
      this.displayTranscript(text, 'assistant');
      this.displayResponse(text);
      
      // Update status
      this.updateStatus('Speaking...', 'speaking');
      this.avatarBehaviors.onSpeakingStart();
      
      // Play audio with lip-sync
      await this.avatarController.speak(audio, timestamps, text);
      
      // Update status
      this.updateStatus('Ready to talk!', 'ready');
      this.avatarBehaviors.onSpeakingEnd();
      
    } catch (error) {
      ErrorHandler.handle(error, 'Speech playback');
    }
  }
  
  setupControls() {
    const startBtn = document.getElementById('start-conversation');
    const stopBtn = document.getElementById('stop-conversation');
    const clearBtn = document.getElementById('clear-conversation');
    const voiceSelect = document.getElementById('voice-select');
    const moodSelect = document.getElementById('avatar-mood');
    const cameraViewSelect = document.getElementById('camera-view');
    const textInput = document.getElementById('text-input');
    const sendBtn = document.getElementById('send-text-btn');
    
    startBtn.addEventListener('click', () => this.startListening());
    stopBtn.addEventListener('click', () => this.stopListening());
    clearBtn.addEventListener('click', () => this.clearConversation());
    
    // Text input controls
    sendBtn.addEventListener('click', () => this.sendTextMessage());
    textInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendTextMessage();
      }
    });
    
    voiceSelect.addEventListener('change', (e) => {
      this.selectedVoice = e.target.value;
      console.log('Voice changed to:', this.selectedVoice);
    });
    
    moodSelect.addEventListener('change', (e) => {
      this.avatarController.setMood(e.target.value);
    });

    // Camera view control
    if (cameraViewSelect) {
      cameraViewSelect.addEventListener('change', (e) => {
        const view = e.target.value;
        console.log('📷 Changing camera view to:', view);
        
        // Set camera parameters based on view
        let distance, cameraY;
        switch(view) {
          case 'head':
            distance = 0.3;
            cameraY = 0.2;
            break;
          case 'upper':
            distance = 0.5;
            cameraY = 0;
            break;
          case 'mid':
            distance = 1.0;
            cameraY = -0.2;
            break;
          case 'full':
          default:
            distance = 1.5;
            cameraY = -0.5;
            break;
        }
        
        // Apply the view change
        if (this.head && this.head.lookAtCamera) {
          this.head.lookAtCamera(1000, distance, 0, cameraY);
          console.log(`✅ Camera view changed to ${view} (distance: ${distance}, Y: ${cameraY})`);
        }
      });
    }

    // Animation testing controls
    const animationSelect = document.getElementById('animation-select');
    const animationDuration = document.getElementById('animation-duration');
    const playAnimationBtn = document.getElementById('play-animation-btn');
    const stopAnimationBtn = document.getElementById('stop-animation-btn');
    const animationStatus = document.getElementById('animation-status');

    if (playAnimationBtn) {
      playAnimationBtn.addEventListener('click', async () => {
        const selectedAnimation = animationSelect.value;
        if (!selectedAnimation) {
          animationStatus.textContent = '⚠️ Please select an animation';
          animationStatus.className = 'animation-status error';
          return;
        }

        const duration = parseInt(animationDuration.value) || null;
        
        try {
          animationStatus.textContent = `▶️ Playing ${selectedAnimation}...`;
          animationStatus.className = 'animation-status playing';
          
          const success = await this.avatarController.playAnimation(selectedAnimation, duration);
          
          if (success) {
            animationStatus.textContent = `✅ Playing ${selectedAnimation} (${duration || 'default'}s)`;
            animationStatus.className = 'animation-status playing';
          } else {
            animationStatus.textContent = `❌ Failed to play ${selectedAnimation}`;
            animationStatus.className = 'animation-status error';
          }
        } catch (error) {
          console.error('Animation error:', error);
          animationStatus.textContent = `❌ Error: ${error.message}`;
          animationStatus.className = 'animation-status error';
        }
      });
    }

    if (stopAnimationBtn) {
      stopAnimationBtn.addEventListener('click', () => {
        this.avatarController.stopAnimation();
        animationStatus.textContent = '⏹️ Animation stopped';
        animationStatus.className = 'animation-status';
      });
    }

    // Gesture testing controls
    const gestureButtons = document.querySelectorAll('.btn-gesture');
    gestureButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const gesture = btn.getAttribute('data-gesture');
        console.log(`🎭 Playing gesture: ${gesture}`);
        this.avatarController.playGesture(gesture, 2);
        
        // Visual feedback
        btn.style.background = '#28a745';
        btn.style.color = 'white';
        btn.style.borderColor = '#28a745';
        setTimeout(() => {
          btn.style.background = '';
          btn.style.color = '';
          btn.style.borderColor = '';
        }, 2000);
      });
    });
  }
  
  async startListening() {
    if (this.isListening) return;
    
    try {
      this.isListening = true;
      this.updateStatus('Listening...', 'listening');
      this.avatarBehaviors.onListeningStart();
      
      // Update UI
      document.getElementById('start-conversation').disabled = true;
      document.getElementById('stop-conversation').disabled = false;
      
      // Start recording
      await this.audioProcessor.startRecording(
        (audioBlob) => this.handleRecordingComplete(audioBlob),
        (level) => this.updateAudioLevel(level)
      );
      
      // Visual feedback
      this.avatarController.lookAtCamera(1000);
      
    } catch (error) {
      this.isListening = false;
      this.updateStatus('Ready to talk!', 'ready');
      document.getElementById('start-conversation').disabled = false;
      document.getElementById('stop-conversation').disabled = true;
      ErrorHandler.handle(error, 'Start listening');
    }
  }
  
  stopListening() {
    if (!this.isListening) return;
    
    console.log('🛑 Stopping recording...');
    
    this.isListening = false;
    this.audioProcessor.stopRecording();
    this.avatarBehaviors.onListeningEnd();
    
    // Update UI
    this.updateStatus('Processing...', 'processing');
    document.getElementById('start-conversation').disabled = false;
    document.getElementById('stop-conversation').disabled = true;
    
    // Reset audio level
    this.updateAudioLevel(0);
  }
  
  async sendTextMessage() {
    const textInput = document.getElementById('text-input');
    const message = textInput.value.trim();
    
    if (!message) {
      return;
    }
    
    try {
      // Disable input while processing
      textInput.disabled = true;
      document.getElementById('send-text-btn').disabled = true;
      
      this.showLoading(true);
      this.updateStatus('Processing your message...', 'processing');
      
      // Display user's message
      this.displayTranscript(message, 'user');
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: message
      });
      
      // Get LLM response
      const chatResponse = await this.openai.chat(this.conversationHistory);
      const assistantMessage = chatResponse.message;
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      });
      
      // Display assistant's response
      this.displayTranscript(assistantMessage, 'assistant');
      this.displayResponse(assistantMessage);
      
      // Apply mood and gesture if provided
      if (chatResponse.mood) {
        console.log('🎭 Setting mood:', chatResponse.mood);
        this.avatarController.setMood(chatResponse.mood);
      }
      
      // Update status
      this.updateStatus('Speaking...', 'speaking');
      this.avatarBehaviors.onSpeakingStart();
      
      // Play gesture if provided (before or during speech)
      if (chatResponse.gesture) {
        console.log('👋 Playing gesture:', chatResponse.gesture);
        setTimeout(() => {
          this.avatarController.playGesture(chatResponse.gesture, 2);
        }, 500);
      }
      
      // Generate speech and play with avatar
      const ttsResponse = await this.openai.textToSpeech(assistantMessage, this.selectedVoice);
      await this.avatarController.speak(ttsResponse.audio, ttsResponse.timestamps, assistantMessage);
      
      // Reset status
      this.updateStatus('Ready to talk!', 'ready');
      this.avatarBehaviors.onSpeakingEnd();
      this.showLoading(false);
      
      // Clear input
      textInput.value = '';
      
    } catch (error) {
      this.showLoading(false);
      this.updateStatus('Error occurred', 'error');
      ErrorHandler.handle(error, 'Text message processing');
      
      // Reset to ready state after error
      setTimeout(() => {
        this.updateStatus('Ready to talk!', 'ready');
      }, 3000);
    } finally {
      // Re-enable input
      textInput.disabled = false;
      document.getElementById('send-text-btn').disabled = false;
      textInput.focus();
    }
  }
  
  async handleRecordingComplete(audioBlob) {
    try {
      console.log('📼 Recording complete:', {
        type: audioBlob.type,
        size: audioBlob.size,
        sizeKB: (audioBlob.size / 1024).toFixed(2) + ' KB'
      });
      
      if (audioBlob.size === 0) {
        throw new Error('Recording failed: Audio file is empty. Please check your microphone.');
      }
      
      if (audioBlob.size < 1000) {
        console.warn('⚠️ Audio blob is very small, may not contain speech');
      }
      
      this.showLoading(true);
      this.updateStatus('Processing your request...', 'processing');
      
      // Use the voice chain API for complete STT -> LLM -> TTS pipeline
      const result = await this.openai.processVoiceChain(audioBlob);
      
      // Display user's message
      this.displayTranscript(result.userMessage, 'user');
      
      // Display assistant's response
      this.displayTranscript(result.assistantMessage, 'assistant');
      this.displayResponse(result.assistantMessage);
      
      // Apply mood and gesture if provided
      if (result.mood) {
        console.log('🎭 Setting mood:', result.mood);
        this.avatarController.setMood(result.mood);
      }
      
      // Update status
      this.updateStatus('Speaking...', 'speaking');
      this.avatarBehaviors.onSpeakingStart();
      
      // Play gesture if provided (before or during speech)
      if (result.gesture && result.gesture !== 'none') {
        console.log('👋 Playing gesture:', result.gesture);
        setTimeout(() => {
          this.avatarController.playGesture(result.gesture, 2);
        }, 500); // Slight delay so it doesn't interfere with speech start
      } else if (result.gesture === 'none') {
        console.log('⏭️ Skipping gesture (none)');
      }

      // Play animation if provided
      if (result.animation && result.animation !== 'none') {
        console.log('🎬 Playing animation:', result.animation);
        setTimeout(async () => {
          try {
            await this.avatarController.playAnimation(result.animation, result.animationDuration || 10);
          } catch (error) {
            console.error('Animation playback error:', error);
          }
        }, 300);
      } else if (result.animation === 'none') {
        console.log('⏭️ Skipping animation (none)');
      }
      
      // Play response with avatar
      await this.avatarController.speak(result.audio, result.timestamps, result.assistantMessage);
      
      // Reset status
      this.updateStatus('Ready to talk!', 'ready');
      this.avatarBehaviors.onSpeakingEnd();
      this.showLoading(false);
      
    } catch (error) {
      this.showLoading(false);
      this.updateStatus('Error occurred', 'error');
      ErrorHandler.handle(error, 'Voice processing');
      
      // Reset to ready state after error
      setTimeout(() => {
        this.updateStatus('Ready to talk!', 'ready');
      }, 3000);
    }
  }
  
  displayTranscript(text, role) {
    const transcriptBox = document.getElementById('transcript');
    if (!transcriptBox) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'message-label';
    labelDiv.textContent = role === 'user' ? 'You:' : 'Assistant:';
    
    const textDiv = document.createElement('div');
    textDiv.textContent = text;
    
    messageDiv.appendChild(labelDiv);
    messageDiv.appendChild(textDiv);
    transcriptBox.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    transcriptBox.scrollTop = transcriptBox.scrollHeight;
  }
  
  displayResponse(text) {
    const responseBox = document.getElementById('response');
    if (responseBox) {
      responseBox.textContent = text;
    }
  }
  
  clearConversation() {
    const transcriptBox = document.getElementById('transcript');
    const responseBox = document.getElementById('response');
    
    if (transcriptBox) transcriptBox.innerHTML = '';
    if (responseBox) responseBox.textContent = '';
    
    this.openai.clearHistory();
    ErrorHandler.showSuccess('Conversation cleared');
  }
  
  updateAudioLevel(level) {
    const levelFill = document.getElementById('audio-level-fill');
    if (levelFill) {
      levelFill.style.width = `${level}%`;
    }
  }
  
  updateStatus(message, state = 'default') {
    const statusText = document.getElementById('status-text');
    const statusDot = document.querySelector('.status-dot');
    
    if (statusText) {
      statusText.textContent = message;
    }
    
    if (statusDot) {
      statusDot.className = 'status-dot';
      if (state === 'ready' || state === 'listening') {
        statusDot.classList.add('ready');
      } else if (state === 'speaking') {
        statusDot.classList.add('speaking');
      }
    }
  }
  
  updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.className = connected ? 'connection-status connected' : 'connection-status';
      statusElement.innerHTML = `<span class="dot"></span> ${connected ? 'Connected' : 'Disconnected'}`;
    }
  }
  
  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      if (show) {
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing Voice Avatar App...');
  const app = new VoiceAvatarApp();
  
  // Expose app globally for console testing
  window.app = app;
  console.log('💡 Tip: Access app via window.app or just "app" in console');
  console.log('💡 Try: app.avatarController.playAnimation("waving")');
});
