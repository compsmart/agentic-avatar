import { TalkingHead } from 'talkinghead';
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
    this.audioProcessor = new AudioProcessor();
    this.avatarController = null;
    this.avatarBehaviors = null;
    this.streamingHandler = null;
    this.ws = null;
    this.isSessionActive = false;
    this.isListening = false;
    this.conversationHistory = [];
    this.msgCount = 0;           // for debug logging

    this.init();
  }

  async init() {
    try {
      this.showLoading(true);
      this.updateStatus('Initializing...');

      await this.checkServerHealth();
      await this.initializeAvatar();
      await this.audioProcessor.init();

      this.avatarController = new AvatarController(this.head);
      await this.avatarController.init();

      this.avatarBehaviors = new AvatarBehaviors(this.avatarController);
      this.streamingHandler = new StreamingHandler(this.avatarController);

      this.avatarBehaviors.start();
      this.setupControls();
      this.setupWebSocket();

      this.showLoading(false);
      this.updateStatus('Ready — press Start to begin', 'ready');
      ErrorHandler.showSuccess('Avatar initialized successfully!');
      console.log('[APP] Voice Avatar App initialized');
    } catch (error) {
      this.showLoading(false);
      this.updateStatus('Initialization failed', 'error');
      ErrorHandler.handle(error, 'Initialization');
    }
  }

  // ----------------------------------------------------------------
  // Avatar loading
  // ----------------------------------------------------------------

  async initializeAvatar() {
    const avatarContainer = document.getElementById('avatar-container');
    if (!avatarContainer) throw new Error('Avatar container not found');

    const settings = PerformanceOptimizer.optimizeAvatarSettings();

    this.head = new TalkingHead(avatarContainer, {
      ttsLang: 'en-US',
      lipsyncLang: 'en',
      cameraView: 'full',
      modelFPS: settings.modelFPS,
      modelPixelRatio: settings.modelPixelRatio,
      cameraDistance: 1.5,
      cameraY: 0.2,
      lightAmbientIntensity: 1.5,
      lightSpotIntensity: 0.5
    });

    patchTalkingHeadAnimate(this.head);

    try {
      console.log('[APP] Loading avatar...');
      await this.head.showAvatar({
        url: './avatars/brunette.glb',
        body: 'F',
        avatarMood: 'happy',
        lipsyncLang: 'en'
      });
      await waitForAvatarReady(this.head);
      if (this.head.nodeAvatar) this.head.nodeAvatar.visible = true;
      if (!this.head.animating) this.head.start();
      setTimeout(() => { this.head.lookAtCamera?.(1000); }, 500);
      console.log('[APP] Avatar loaded successfully');
    } catch (err) {
      console.error('[APP] Primary avatar load failed, trying default:', err);
      await this.head.showAvatar({ body: 'F', avatarMood: 'happy', lipsyncLang: 'en' });
      await waitForAvatarReady(this.head);
      if (this.head.nodeAvatar) this.head.nodeAvatar.visible = true;
      if (!this.head.animating) this.head.start();
    }
  }

  async checkServerHealth() {
    try {
      const res = await fetch('/saas/avatar/api/health');
      const data = await res.json();
      if (data.status !== 'ok') throw new Error('Server not healthy');
      console.log('[APP] Server health check passed');
    } catch (error) {
      ErrorHandler.showUserMessage('Warning: Could not connect to server.', 'warning');
    }
  }

  // ----------------------------------------------------------------
  // WebSocket
  // ----------------------------------------------------------------

  setupWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    const url = `${wsProtocol}//${wsHost}/saas/avatar/ws/`;

    console.log(`[WS] Connecting to ${url}...`);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.updateConnectionStatus(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleServerMessage(msg);
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };

    this.ws.onclose = () => {
      console.log('[WS] Disconnected');
      this.updateConnectionStatus(false);
      this.isSessionActive = false;
      this.updateSessionUI();
      setTimeout(() => {
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
          this.setupWebSocket();
        }
      }, 5000);
    };
  }

  // ----------------------------------------------------------------
  // Message handler — all messages from server (Gemini responses)
  // ----------------------------------------------------------------

  handleServerMessage(msg) {
    this.msgCount++;

    switch (msg.type) {
      case 'session_started':
        console.log('[MSG] Session started');
        this.isSessionActive = true;
        this.updateSessionUI();
        this.updateStatus('Connected to Gemini — start speaking!', 'ready');
        // Start TalkingHead streaming mode (awaited via promise)
        this.streamingHandler.startStream().then(() => {
          console.log('[MSG] Streaming mode ready for audio');
        }).catch(err => {
          console.error('[MSG] Failed to start streaming:', err);
        });
        break;

      case 'setup_complete':
        console.log('[MSG] Gemini setup complete');
        break;

      case 'audio_chunk':
        // Feed PCM audio to TalkingHead for playback + lipsync
        this.streamingHandler.feedAudio(msg.data);
        this.updateStatus('Speaking...', 'speaking');
        break;

      case 'output_transcription':
        // What the AI SPOKE (as text) — use for lipsync + display in conversation
        console.log(`[MSG] AI transcript: "${msg.text}"`);
        this.streamingHandler.addText(msg.text);
        this.appendToTranscript(msg.text, 'assistant-stream');
        break;

      case 'input_transcription':
        // What the user SAID (as text) — display in conversation
        console.log(`[MSG] User transcript: "${msg.text}"`);
        this.displayTranscript(msg.text, 'user');
        break;

      case 'text':
        // Model reasoning/thinking text (NOT spoken) — display only, do NOT use for lipsync
        console.log(`[MSG] Model text (not spoken): "${msg.text.substring(0, 80)}..."`);
        // Don't send to streamingHandler — this is thinking text, not audio
        break;

      case 'tool_call':
        console.log(`[MSG] Tool call: ${msg.name}`, msg.args);
        this.handleToolCall(msg);
        break;

      case 'interrupted':
        console.log('[MSG] Interrupted by user');
        this.streamingHandler.interrupt();
        this.flushAssistantStream();
        this.updateStatus('Listening...', 'listening');
        break;

      case 'turn_complete':
        console.log('[MSG] Turn complete');
        this.updateStatus('Listening...', 'listening');
        this.avatarBehaviors.onSpeakingEnd();
        this.flushAssistantStream();
        break;

      case 'session_ended':
        console.log('[MSG] Session ended. Reason:', msg.reason || 'none');
        this.isSessionActive = false;
        this.updateSessionUI();
        this.streamingHandler.stopStream();
        this.updateStatus('Session ended', 'ready');
        break;

      case 'error':
        console.error('[MSG] Error from server:', msg.message);
        ErrorHandler.showUserMessage(msg.message, 'error');
        break;

      default:
        console.log('[MSG] Unknown:', msg.type, msg);
    }
  }

  // ----------------------------------------------------------------
  // Tool calls
  // ----------------------------------------------------------------

  handleToolCall(msg) {
    const result = this.avatarController.handleToolCall(msg.name, msg.args || {});
    console.log(`[TOOL] ${msg.name} → ${result}`);

    this.wsSend({
      type: 'tool_response',
      id: msg.id,
      name: msg.name,
      result
    });
  }

  // ----------------------------------------------------------------
  // Controls
  // ----------------------------------------------------------------

  setupControls() {
    const startBtn = document.getElementById('start-conversation');
    const stopBtn = document.getElementById('stop-conversation');
    const clearBtn = document.getElementById('clear-conversation');
    const moodSelect = document.getElementById('avatar-mood');
    const cameraViewSelect = document.getElementById('camera-view');
    const textInput = document.getElementById('text-input');
    const sendBtn = document.getElementById('send-text-btn');

    startBtn.addEventListener('click', () => this.startSession());
    stopBtn.addEventListener('click', () => this.stopSession());
    clearBtn.addEventListener('click', () => this.clearConversation());

    sendBtn.addEventListener('click', () => this.sendTextMessage());
    textInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendTextMessage();
      }
    });

    moodSelect.addEventListener('change', (e) => {
      this.avatarController.setMood(e.target.value);
    });

    if (cameraViewSelect) {
      cameraViewSelect.addEventListener('change', (e) => {
        const view = e.target.value;
        console.log(`[APP] Camera view → ${view}`);
        if (this.head?.setView) {
          this.head.setView(view);
        }
      });
    }

    // Animation testing
    const playAnimationBtn = document.getElementById('play-animation-btn');
    const stopAnimationBtn = document.getElementById('stop-animation-btn');
    const animationSelect = document.getElementById('animation-select');
    const animationDuration = document.getElementById('animation-duration');
    const animationStatus = document.getElementById('animation-status');

    if (playAnimationBtn) {
      playAnimationBtn.addEventListener('click', async () => {
        const sel = animationSelect.value;
        if (!sel) { animationStatus.textContent = 'Please select an animation'; return; }
        const dur = parseInt(animationDuration.value) || null;
        try {
          animationStatus.textContent = `Playing ${sel}...`;
          await this.avatarController.playAnimation(sel, dur);
          animationStatus.textContent = `Playing ${sel} (${dur || 'default'}s)`;
        } catch (err) {
          animationStatus.textContent = `Error: ${err.message}`;
        }
      });
    }

    if (stopAnimationBtn) {
      stopAnimationBtn.addEventListener('click', () => {
        this.avatarController.stopAnimation();
        if (animationStatus) animationStatus.textContent = 'Animation stopped';
      });
    }

    document.querySelectorAll('.btn-gesture').forEach(btn => {
      btn.addEventListener('click', () => {
        const gesture = btn.getAttribute('data-gesture');
        this.avatarController.playGesture(gesture, 2);
        btn.style.background = '#28a745';
        btn.style.color = 'white';
        btn.style.borderColor = '#28a745';
        setTimeout(() => { btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = ''; }, 2000);
      });
    });

    // --- Lipsync test buttons ---
    this._setupLipsyncTests();
  }

  _setupLipsyncTests() {
    const status = document.getElementById('lipsync-test-status');
    const log = (msg) => { if (status) status.textContent = msg; console.log(`[LIP-TEST] ${msg}`); };

    // Test 1: speakText — uses browser TTS + TalkingHead word-to-viseme pipeline
    document.getElementById('test-speak-text')?.addEventListener('click', () => {
      log('speakText("Hello, testing lipsync")...');
      try {
        this.head.speakText('Hello, testing lipsync.');
        log('speakText called — watch the avatar');
      } catch (e) {
        log(`speakText error: ${e.message}`);
      }
    });

    // Test 2: Push raw visemes directly into TalkingHead animQueue
    document.getElementById('test-viseme-push')?.addEventListener('click', () => {
      log('Pushing viseme sequence to animQueue...');
      try {
        const now = this.head.animClock;
        const visemeSequence = ['aa', 'E', 'O', 'U', 'I', 'aa', 'PP', 'FF', 'E', 'O'];
        const DUR = 150; // ms per viseme

        visemeSequence.forEach((v, i) => {
          const t = now + i * DUR;
          this.head.animQueue.push({
            template: { name: 'viseme' },
            ts: [t, t + DUR * 0.4, t + DUR],
            vs: {
              ['viseme_' + v]: [null, (v === 'PP' || v === 'FF') ? 0.9 : 0.7, 0]
            }
          });
        });

        // Set speaking state so volume modulation kicks in
        this.head.isSpeaking = true;
        this.head.stateName = 'speaking';
        setTimeout(() => {
          this.head.isSpeaking = false;
          this.head.stateName = 'idle';
          log('Viseme sequence done');
        }, visemeSequence.length * DUR + 200);

        log(`Pushed ${visemeSequence.length} visemes starting at animClock=${now.toFixed(0)}`);
      } catch (e) {
        log(`Push visemes error: ${e.message}`);
      }
    });

    // Test 3: Directly set morph target for viseme_aa (open mouth)
    document.getElementById('test-morph-aa')?.addEventListener('click', () => {
      log('Inspecting morph targets...');
      try {
        const mt = this.head.mtAvatar;
        if (!mt) {
          log('mtAvatar is null/undefined!');
          return;
        }

        const allKeys = Object.keys(mt);
        console.log('[LIP-TEST] ALL mtAvatar keys:', allKeys);

        // Find anything mouth/jaw/lip/viseme related
        const lipKeys = allKeys.filter(k =>
          /viseme|mouth|jaw|lip|cheek|tongue|open|smile|frown|aa|ee|oh/i.test(k)
        );
        console.log('[LIP-TEST] Lip-related keys:', lipKeys);

        // Also check the 3D mesh for blend shape names
        const meshes = [];
        this.head.nodeAvatar?.traverse?.(node => {
          if (node.morphTargetDictionary) {
            meshes.push({
              name: node.name,
              blendShapes: Object.keys(node.morphTargetDictionary)
            });
          }
        });
        console.log('[LIP-TEST] Meshes with blend shapes:', JSON.stringify(meshes, null, 2));

        if (lipKeys.length > 0) {
          // Try to set the first lip-related morph target
          const key = lipKeys[0];
          mt[key].value = 1.0;
          mt[key].newvalue = 1.0;
          mt[key].needsUpdate = true;
          log(`Set ${key} = 1.0. Lip keys: ${lipKeys.join(', ')}`);
        } else {
          log(`No lip morphs in mtAvatar (${allKeys.length} total keys). Check console for full list & mesh blend shapes.`);
        }
      } catch (e) {
        log(`Morph error: ${e.message}`);
        console.error('[LIP-TEST]', e);
      }
    });

    // Test 4: Reset all lip morph targets
    document.getElementById('test-morph-reset')?.addEventListener('click', () => {
      log('Resetting lips...');
      try {
        this.head.resetLips();
        log('resetLips() called');
      } catch (e) {
        log(`Reset error: ${e.message}`);
      }
    });
  }

  // ----------------------------------------------------------------
  // Session lifecycle
  // ----------------------------------------------------------------

  async startSession() {
    if (this.isSessionActive) return;

    try {
      console.log('[APP] Starting session...');
      this.updateStatus('Connecting to Gemini...', 'processing');
      this.showLoading(true);

      // Tell server to open a Gemini Live session with selected voice
      const voiceSelect = document.getElementById('gemini-voice');
      const voice = voiceSelect ? voiceSelect.value : 'Aoede';
      console.log(`[APP] Selected voice: ${voice}`);
      this.wsSend({ type: 'start_session', voice });

      // Start mic capture → stream PCM to server
      console.log('[APP] Starting mic capture...');
      await this.audioProcessor.startCapture(
        (base64pcm) => {
          this.wsSend({ type: 'audio_chunk', data: base64pcm });
        },
        (level) => {
          this.updateAudioLevel(level);
        }
      );

      this.isListening = true;
      this.showLoading(false);
      console.log('[APP] Mic capture started, session request sent');
      this.avatarBehaviors.onListeningStart();
      this.avatarController.lookAtCamera(1000);
    } catch (error) {
      this.showLoading(false);
      this.updateStatus('Failed to start', 'error');
      ErrorHandler.handle(error, 'Start session');
    }
  }

  stopSession() {
    console.log('[APP] Stopping session...');
    this.audioProcessor.stopCapture();
    this.isListening = false;
    this.avatarBehaviors.onListeningEnd();
    this.updateAudioLevel(0);

    this.wsSend({ type: 'stop_session' });
    this.streamingHandler.stopStream();

    this.isSessionActive = false;
    this.updateSessionUI();
    this.updateStatus('Session ended', 'ready');
  }

  // ----------------------------------------------------------------
  // Text messaging
  // ----------------------------------------------------------------

  sendTextMessage() {
    const textInput = document.getElementById('text-input');
    const message = textInput.value.trim();
    if (!message) return;

    if (!this.isSessionActive) {
      ErrorHandler.showUserMessage('Start a session first before sending text.', 'warning');
      return;
    }

    console.log(`[APP] Sending text: "${message}"`);
    this.displayTranscript(message, 'user');
    this.wsSend({ type: 'text_message', text: message });

    textInput.value = '';
    textInput.focus();
  }

  // ----------------------------------------------------------------
  // UI helpers
  // ----------------------------------------------------------------

  wsSend(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WS] Cannot send, socket not open. State:', this.ws?.readyState);
    }
  }

  updateSessionUI() {
    const startBtn = document.getElementById('start-conversation');
    const stopBtn = document.getElementById('stop-conversation');
    const voiceSelect = document.getElementById('gemini-voice');
    if (startBtn) startBtn.disabled = this.isSessionActive;
    if (stopBtn) stopBtn.disabled = !this.isSessionActive;
    if (voiceSelect) voiceSelect.disabled = this.isSessionActive;
  }

  displayTranscript(text, role) {
    const box = document.getElementById('transcript');
    if (!box) return;

    const div = document.createElement('div');
    div.className = `message ${role}`;

    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = role === 'user' ? 'You:' : 'Assistant:';

    const body = document.createElement('div');
    body.className = 'message-body';
    body.textContent = text;

    div.appendChild(label);
    div.appendChild(body);
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  appendToTranscript(text, _role) {
    const box = document.getElementById('transcript');
    if (!box) return;

    let bubble = box.querySelector('.message.assistant-streaming');
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'message assistant assistant-streaming';

      const label = document.createElement('div');
      label.className = 'message-label';
      label.textContent = 'Assistant:';

      const body = document.createElement('div');
      body.className = 'message-body';

      bubble.appendChild(label);
      bubble.appendChild(body);
      box.appendChild(bubble);
    }

    const body = bubble.querySelector('.message-body');
    body.textContent += text;
    box.scrollTop = box.scrollHeight;

    const responseBox = document.getElementById('response');
    if (responseBox) responseBox.textContent += text;
  }

  flushAssistantStream() {
    const box = document.getElementById('transcript');
    if (!box) return;
    const bubble = box.querySelector('.message.assistant-streaming');
    if (bubble) {
      bubble.classList.remove('assistant-streaming');
    }
    const responseBox = document.getElementById('response');
    if (responseBox) responseBox.textContent = '';
  }

  clearConversation() {
    const box = document.getElementById('transcript');
    const responseBox = document.getElementById('response');
    if (box) box.innerHTML = '';
    if (responseBox) responseBox.textContent = '';
    this.conversationHistory = [];
    ErrorHandler.showSuccess('Conversation cleared');
  }

  updateAudioLevel(level) {
    const fill = document.getElementById('audio-level-fill');
    if (fill) fill.style.width = `${level}%`;
  }

  updateStatus(message, state = 'default') {
    const statusText = document.getElementById('status-text');
    const statusDot = document.querySelector('.status-dot');

    if (statusText) statusText.textContent = message;
    if (statusDot) {
      statusDot.className = 'status-dot';
      if (state === 'ready' || state === 'listening') statusDot.classList.add('ready');
      else if (state === 'speaking') statusDot.classList.add('speaking');
    }
  }

  updateConnectionStatus(connected) {
    const el = document.getElementById('connection-status');
    if (el) {
      el.className = connected ? 'connection-status connected' : 'connection-status';
      el.innerHTML = `<span class="dot"></span> ${connected ? 'Connected' : 'Disconnected'}`;
    }
  }

  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      if (show) overlay.classList.remove('hidden');
      else overlay.classList.add('hidden');
    }
  }
}

// ----------------------------------------------------------------
// Bootstrap
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  console.log('[APP] Initializing Voice Avatar App (Gemini Live)...');
  const app = new VoiceAvatarApp();
  window.app = app;
  console.log('[APP] Tip: Access app via window.app in console');
});
