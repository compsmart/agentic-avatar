import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;

// --- Gemini setup ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
  console.error('   Please create a .env file with your Gemini API key');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
console.log('Gemini client initialized');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025';

// --- Avatar tool definitions for function calling ---
const avatarTools = [
  {
    functionDeclarations: [
      {
        name: 'set_mood',
        description: 'Set the avatar facial expression / mood. Use this to reflect emotional tone during conversation.',
        parameters: {
          type: 'OBJECT',
          properties: {
            mood: {
              type: 'STRING',
              description: 'The mood to set',
              enum: ['happy', 'sad', 'neutral', 'angry', 'love', 'fear', 'disgust', 'surprised', 'confused', 'flirty', 'confident', 'bored', 'excited', 'skeptical']
            }
          },
          required: ['mood']
        }
      },
      {
        name: 'play_gesture',
        description: 'Play a hand/body gesture on the avatar. Use gestures to emphasize points or express reactions.',
        parameters: {
          type: 'OBJECT',
          properties: {
            gesture: {
              type: 'STRING',
              description: 'The gesture to play',
              enum: ['handup', 'index', 'ok', 'thumbup', 'thumbdown', 'side', 'shrug', 'namaste']
            },
            duration: {
              type: 'NUMBER',
              description: 'Duration in seconds (default 2)'
            }
          },
          required: ['gesture']
        }
      },
      {
        name: 'play_animation',
        description: 'Play a full-body animation on the avatar. Use animations for strong emotional expression or when asked to perform an action. Tip: switch to "full" camera view before playing dance/full-body animations so the user can see the whole body, then switch back to "upper" after.',
        parameters: {
          type: 'OBJECT',
          properties: {
            animation: {
              type: 'STRING',
              description: 'The animation to play',
              enum: [
                // Greetings
                'waving', 'acknowledging', 'salute',
                // Conversation
                'asking_question', 'head_nod_yes', 'shaking_head_no', 'talking', 'thinking',
                // Celebration
                'cheering', 'clapping', 'joyful', 'victory', 'fist_pump',
                // Dance
                'breakdance', 'dancing', 'belly_dance', 'gangnam_style', 'moonwalk',
                // Emotion (positive)
                'excited', 'happy_idle', 'laughing',
                // Emotion (negative)
                'defeated', 'agony', 'angry', 'crying', 'disappointed', 'defeat', 'yelling',
                // Actions
                'looking', 'looking_around', 'pointing', 'backflip', 'jump', 'getting_up', 'falling', 'death', 'sneaking_forward',
                // Gesture
                'praying',
                // Combat
                'blocking', 'dodging', 'fight_idle', 'hit_reaction', 'kicking', 'punching',
                // Locomotion
                'walking', 'running', 'jogging', 'happy_walk', 'sad_walk', 'crouch_walk',
                // Idle/Pose
                'idle', 'crouch_idle', 'sitting_idle', 'kneeling_idle',
                // Exercise
                'jumping_jacks', 'push_up'
              ]
            },
            duration: {
              type: 'NUMBER',
              description: 'Duration in seconds (default uses animation natural length)'
            }
          },
          required: ['animation']
        }
      },
      {
        name: 'set_expression',
        description: 'Trigger a short-lived micro-expression on the avatar face, layered on top of the current mood. These last ~2 seconds then auto-release. Use for reactive, expressive moments.',
        parameters: {
          type: 'OBJECT',
          properties: {
            expression: {
              type: 'STRING',
              description: 'The micro-expression to trigger',
              enum: ['wink', 'raised_eyebrow', 'surprise', 'thinking', 'smirk', 'pout', 'tongue_out', 'eye_roll', 'cringe', 'cheek_puff']
            }
          },
          required: ['expression']
        }
      },
      {
        name: 'set_camera_view',
        description: 'Change the camera framing of the avatar. Use "head" for intimate/close conversation, "upper" for normal conversation (default), "mid" for gestures, and "full" ONLY when performing full-body animations like dancing. Always return to "upper" after a full-body animation ends.',
        parameters: {
          type: 'OBJECT',
          properties: {
            view: {
              type: 'STRING',
              description: 'The camera view to set',
              enum: ['head', 'upper', 'mid', 'full']
            }
          },
          required: ['view']
        }
      }
    ]
  }
];

// --- System instruction ---
const SYSTEM_INSTRUCTION = `Your name is Evo. You are a helpful and friendly AI assistant avatar created by Compsmart. You have an expressive 3D avatar body. Keep responses concise and conversational (2-3 sentences max).

You have tools to control your avatar body:
- set_mood: Change your facial expression. Basic moods: happy, sad, neutral, angry, love, fear, disgust. Nuanced moods: surprised, confused, flirty, confident, bored, excited, skeptical. Use these to match your emotional tone — pick the most fitting mood for the moment.
- set_expression: Trigger a short-lived micro-expression (~2 seconds) layered on top of the current mood. Use for reactive moments: wink (playful), raised_eyebrow (skepticism), surprise (shock/wow), thinking (pondering), smirk (knowing/sarcasm), pout (sulky/cute), tongue_out (playful/silly), eye_roll (exasperation), cringe (awkward), cheek_puff (holding breath/thinking). These are subtle and expressive - use them to make conversation feel alive.
- play_gesture: Perform hand gestures (handup for greeting, index for pointing/explaining, ok for approval, thumbup/thumbdown for feedback, side for presenting, shrug for uncertainty, namaste for respect).
- play_animation: Perform full-body animations. You have a huge library — pick the best fit:
  GREETINGS: waving (hello/goodbye), acknowledging (casual nod), salute (formal/respect)
  CONVERSATION: asking_question (inquiring), head_nod_yes (agreeing), shaking_head_no (disagreeing), talking (explaining), thinking (pondering)
  CELEBRATION: cheering (excitement), clapping (applause), joyful (jumping for joy), victory (triumph), fist_pump (yes!)
  DANCE: breakdance (breakdancing), dancing (general dance), belly_dance, gangnam_style (funny/meme), moonwalk (smooth/retro)
  POSITIVE EMOTION: excited (thrilled), happy_idle (content), laughing (LOL/funny)
  NEGATIVE EMOTION: defeated (sad/down), agony (extreme pain/frustration), angry (rage), crying (tears), disappointed (let down), defeat (crushed), yelling (venting)
  ACTIONS: looking (curious), looking_around (scanning), pointing (emphasis), backflip (acrobatics), jump, getting_up, falling, death (dramatic/playing dead), sneaking_forward (stealth)
  COMBAT: blocking (defending), dodging (evading), fight_idle (ready stance), hit_reaction (ouch), kicking, punching
  LOCOMOTION: walking, running, jogging, happy_walk, sad_walk, crouch_walk (sneaking)
  IDLE/POSE: idle (neutral), crouch_idle (hiding), sitting_idle (relaxing), kneeling_idle (kneeling/proposing)
  EXERCISE: jumping_jacks, push_up
  The camera automatically adjusts for animations.
- set_camera_view: Change the camera framing (head, upper, mid, full).

IMPORTANT rules:
- Call at most ONE or TWO tools per turn. Never call three or more tools at once.
- First finish speaking, then call your tools. Do NOT call tools while speaking.
- For animations like dance: just call play_animation. Do NOT also call set_camera_view — the app handles camera automatically.
- Use set_mood and play_gesture freely for expressiveness during normal conversation.
- Keep the default camera view as "upper". Only change it via set_camera_view for special framing, not for animations.`;

// --- Middleware ---
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// --- WebSocket server ---
const wss = new WebSocketServer({ port: WS_PORT });
console.log(`WebSocket server running on port ${WS_PORT}`);

wss.on('connection', (ws) => {
  const connId = crypto.randomUUID().slice(0, 8);
  console.log(`[WS:${connId}] Client connected`);
  let geminiSession = null;
  let sessionActive = false;
  let sessionId = null;
  let audioChunkCount = 0;
  let micChunkCount = 0;

  ws.on('close', () => {
    console.log(`[WS:${connId}] Client disconnected (session: ${sessionId || 'none'})`);
    sessionActive = false;
    if (geminiSession) {
      try { geminiSession.close(); } catch (e) { /* ignore */ }
      geminiSession = null;
    }
  });

  ws.on('error', (error) => {
    console.error(`[WS:${connId}] Error:`, error.message);
    sessionActive = false;
  });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'start_session':
          await startGeminiSession(ws, data);
          break;

        case 'audio_chunk':
          if (geminiSession && sessionActive) {
            micChunkCount++;
            if (micChunkCount % 50 === 1) {
              console.log(`[MIC:${sessionId}] Forwarding chunk #${micChunkCount} (${data.data.length} base64 chars)`);
            }
            await geminiSession.sendRealtimeInput({
              audio: {
                data: data.data,
                mimeType: 'audio/pcm;rate=16000'
              }
            });
          }
          break;

        case 'text_message':
          if (geminiSession && sessionActive) {
            console.log(`[TEXT:${sessionId}] User: "${data.text}"`);
            await geminiSession.sendClientContent({
              turns: [{ role: 'user', parts: [{ text: data.text }] }],
              turnComplete: true
            });
          }
          break;

        case 'tool_response':
          if (geminiSession && sessionActive) {
            console.log(`[TOOL:${sessionId}] Response for ${data.name}: ${data.result}`);
            await geminiSession.sendToolResponse({
              functionResponses: [{
                id: data.id,
                name: data.name,
                response: { result: data.result || 'ok' }
              }]
            });
          }
          break;

        case 'stop_session':
          console.log(`[SESSION:${sessionId}] Stop requested by client`);
          sessionActive = false;
          if (geminiSession) {
            try { geminiSession.close(); } catch (e) { /* ignore */ }
            geminiSession = null;
          }
          sendToClient(ws, { type: 'session_ended' });
          break;

        default:
          console.log('[WS] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error(`[WS:${connId}] Message handling error:`, error.message);
      sendToClient(ws, { type: 'error', message: error.message });
    }
  });

  async function startGeminiSession(ws, opts) {
    if (geminiSession) {
      console.log(`[SESSION:${sessionId}] Closing previous session`);
      try { geminiSession.close(); } catch (e) { /* ignore */ }
    }

    sessionId = crypto.randomUUID().slice(0, 12);
    audioChunkCount = 0;
    micChunkCount = 0;

    try {
      console.log(`[SESSION:${sessionId}] Starting Gemini Live session...`);
      console.log(`[SESSION:${sessionId}] Model: ${GEMINI_MODEL}`);

      const config = {
        responseModalities: [Modality.AUDIO],
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        tools: avatarTools,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: opts?.voice || 'Aoede'
            }
          }
        },
        // Enable transcription so we get text for the conversation window
        outputAudioTranscription: {},
        inputAudioTranscription: {}
      };

      console.log(`[SESSION:${sessionId}] Config:`, JSON.stringify({
        responseModalities: config.responseModalities,
        voice: config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,
        tools: config.tools[0].functionDeclarations.map(f => f.name),
        outputAudioTranscription: 'enabled',
        inputAudioTranscription: 'enabled'
      }, null, 2));

      geminiSession = await ai.live.connect({
        model: GEMINI_MODEL,
        config,
        callbacks: {
          onopen: () => {
            console.log(`[SESSION:${sessionId}] Gemini WebSocket opened`);
            sessionActive = true;
            sendToClient(ws, { type: 'session_started', sessionId });
          },
          onmessage: (message) => {
            handleGeminiMessage(ws, message);
          },
          onerror: (e) => {
            console.error(`[SESSION:${sessionId}] Gemini error:`, e.message || e);
            sendToClient(ws, { type: 'error', message: e.message || 'Gemini session error', sessionId });
          },
          onclose: (e) => {
            console.log(`[SESSION:${sessionId}] Gemini closed. Reason:`, e?.reason || 'none', 'Code:', e?.code || 'none');
            sessionActive = false;
            geminiSession = null;
            sendToClient(ws, { type: 'session_ended', reason: e?.reason, sessionId });
          }
        }
      });

    } catch (error) {
      console.error(`[SESSION:${sessionId}] Failed to start:`, error);
      sendToClient(ws, { type: 'error', message: 'Failed to start Gemini session: ' + error.message, sessionId });
    }
  }

  function handleGeminiMessage(ws, message) {
    try {
      // --- Setup complete ---
      if (message.setupComplete) {
        console.log(`[GEMINI:${sessionId}] Setup complete`);
        sendToClient(ws, { type: 'setup_complete', sessionId });
        return;
      }

      // --- Tool calls ---
      if (message.toolCall) {
        const toolCall = message.toolCall;
        if (toolCall.functionCalls) {
          for (const fc of toolCall.functionCalls) {
            console.log(`[TOOL:${sessionId}] Call: ${fc.name}(${JSON.stringify(fc.args)})`);
            sendToClient(ws, {
              type: 'tool_call',
              id: fc.id,
              name: fc.name,
              args: fc.args
            });
          }
        }
        return;
      }

      // --- Server content ---
      if (message.serverContent) {
        const sc = message.serverContent;

        // Interruption
        if (sc.interrupted) {
          console.log(`[GEMINI:${sessionId}] Interrupted by user speech`);
          sendToClient(ws, { type: 'interrupted' });
          return;
        }

        // Output audio transcription (what the AI said, as text)
        if (sc.outputTranscription && sc.outputTranscription.text) {
          const text = sc.outputTranscription.text;
          console.log(`[TRANSCRIPT-OUT:${sessionId}] "${text}"`);
          sendToClient(ws, { type: 'output_transcription', text });
        }

        // Input audio transcription (what the user said, as text)
        if (sc.inputTranscription && sc.inputTranscription.text) {
          const text = sc.inputTranscription.text;
          console.log(`[TRANSCRIPT-IN:${sessionId}] "${text}"`);
          sendToClient(ws, { type: 'input_transcription', text });
        }

        // Model turn parts (audio and/or text)
        if (sc.modelTurn && sc.modelTurn.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData && part.inlineData.data) {
              audioChunkCount++;
              const dataLen = part.inlineData.data.length;
              // PCM bytes = base64 length * 3/4; duration = bytes / (2 * 24000)
              const estimatedBytes = Math.floor(dataLen * 3 / 4);
              const estimatedMs = Math.round(estimatedBytes / 2 / 24000 * 1000);
              if (audioChunkCount <= 3 || audioChunkCount % 20 === 0) {
                console.log(`[AUDIO:${sessionId}] Chunk #${audioChunkCount}: ${dataLen} b64 chars (~${estimatedMs}ms of audio)`);
              }
              sendToClient(ws, {
                type: 'audio_chunk',
                data: part.inlineData.data,
                mimeType: part.inlineData.mimeType
              });
            }
            if (part.text) {
              console.log(`[TEXT:${sessionId}] Model: "${part.text}"`);
              sendToClient(ws, { type: 'text', text: part.text });
            }
          }
        }

        // Turn complete
        if (sc.turnComplete) {
          console.log(`[GEMINI:${sessionId}] Turn complete (sent ${audioChunkCount} audio chunks)`);
          sendToClient(ws, { type: 'turn_complete' });
          audioChunkCount = 0;
        }
      }

      // --- Usage metadata ---
      if (message.usageMetadata) {
        console.log(`[USAGE:${sessionId}] Tokens: ${message.usageMetadata.totalTokenCount || 'unknown'}`);
      }

    } catch (error) {
      console.error(`[GEMINI:${sessionId}] Error handling message:`, error.message);
      console.error(`[GEMINI:${sessionId}] Message keys:`, Object.keys(message));
    }
  }
});

function sendToClient(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      gemini: !!GEMINI_API_KEY,
      websocket: wss.clients.size
    }
  });
});

// --- Start HTTP server ---
app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Gemini model: ${GEMINI_MODEL}`);
});

// --- Graceful shutdown ---
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing servers');
  wss.close(() => {
    console.log('WebSocket server closed');
  });
  process.exit(0);
});
