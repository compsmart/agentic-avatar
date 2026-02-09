import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
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
              enum: ['happy', 'sad', 'neutral', 'angry', 'love']
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
              enum: ['waving', 'breakdance', 'cheering', 'clapping', 'defeated', 'joyful', 'looking', 'pointing', 'praying', 'victory']
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
const SYSTEM_INSTRUCTION = `You are a helpful and friendly AI assistant with an expressive 3D avatar body. Keep responses concise and conversational (2-3 sentences max).

You have tools to control your avatar body:
- set_mood: Change your facial expression (happy, sad, neutral, angry, love). Use this to match your emotional tone.
- play_gesture: Perform hand gestures (handup for greeting, index for pointing/explaining, ok for approval, thumbup/thumbdown for feedback, side for presenting, shrug for uncertainty, namaste for respect).
- play_animation: Perform full-body animations (waving for hello/goodbye, breakdance for extreme celebration or when asked to dance, cheering for excitement, clapping for applause, defeated for bad news, joyful for great news, looking for curiosity, pointing for emphasis, praying for gratitude, victory for triumph).
- set_camera_view: Change the camera framing (head, upper, mid, full). Use "upper" for normal conversation. Use "head" for intimate/emotional moments. Use "mid" when gesturing. Use "full" ONLY before full-body animations like dancing or breakdancing — and always switch back to "upper" when the animation is done.

Use these tools naturally during conversation to make your avatar expressive. For greetings, wave. For good news, show joy. For questions, look curious. Match your mood and gestures to the emotional context. You can call multiple tools at once.

IMPORTANT camera rules: The default view is "upper". Only switch to "full" when you are about to play a full-body animation (breakdance, joyful, cheering, victory, defeated). After the animation finishes, call set_camera_view with "upper" to return to normal framing.`;

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
  console.log('[WS] Client connected');
  let geminiSession = null;
  let sessionActive = false;
  let audioChunkCount = 0;
  let micChunkCount = 0;

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    sessionActive = false;
    if (geminiSession) {
      try { geminiSession.close(); } catch (e) { /* ignore */ }
      geminiSession = null;
    }
  });

  ws.on('error', (error) => {
    console.error('[WS] Error:', error.message);
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
              console.log(`[MIC] Forwarding chunk #${micChunkCount} (${data.data.length} base64 chars)`);
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
            console.log(`[TEXT] User: "${data.text}"`);
            await geminiSession.sendClientContent({
              turns: [{ role: 'user', parts: [{ text: data.text }] }],
              turnComplete: true
            });
          }
          break;

        case 'tool_response':
          if (geminiSession && sessionActive) {
            console.log(`[TOOL] Response for ${data.name}: ${data.result}`);
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
          console.log('[SESSION] Stop requested by client');
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
      console.error('[WS] Message handling error:', error.message);
      sendToClient(ws, { type: 'error', message: error.message });
    }
  });

  async function startGeminiSession(ws, opts) {
    if (geminiSession) {
      try { geminiSession.close(); } catch (e) { /* ignore */ }
    }

    audioChunkCount = 0;
    micChunkCount = 0;

    try {
      console.log('[SESSION] Starting Gemini Live session...');
      console.log(`[SESSION] Model: ${GEMINI_MODEL}`);

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

      console.log('[SESSION] Config:', JSON.stringify({
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
            console.log('[SESSION] Gemini WebSocket opened');
            sessionActive = true;
            sendToClient(ws, { type: 'session_started' });
          },
          onmessage: (message) => {
            handleGeminiMessage(ws, message);
          },
          onerror: (e) => {
            console.error('[SESSION] Gemini error:', e.message || e);
            sendToClient(ws, { type: 'error', message: e.message || 'Gemini session error' });
          },
          onclose: (e) => {
            console.log('[SESSION] Gemini closed. Reason:', e?.reason || 'none', 'Code:', e?.code || 'none');
            sessionActive = false;
            geminiSession = null;
            sendToClient(ws, { type: 'session_ended', reason: e?.reason });
          }
        }
      });

    } catch (error) {
      console.error('[SESSION] Failed to start:', error);
      sendToClient(ws, { type: 'error', message: 'Failed to start Gemini session: ' + error.message });
    }
  }

  function handleGeminiMessage(ws, message) {
    try {
      // --- Setup complete ---
      if (message.setupComplete) {
        console.log('[GEMINI] Setup complete');
        sendToClient(ws, { type: 'setup_complete' });
        return;
      }

      // --- Tool calls ---
      if (message.toolCall) {
        const toolCall = message.toolCall;
        if (toolCall.functionCalls) {
          for (const fc of toolCall.functionCalls) {
            console.log(`[TOOL] Call: ${fc.name}(${JSON.stringify(fc.args)})`);
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
          console.log('[GEMINI] Interrupted by user speech');
          sendToClient(ws, { type: 'interrupted' });
          return;
        }

        // Output audio transcription (what the AI said, as text)
        if (sc.outputTranscription && sc.outputTranscription.text) {
          const text = sc.outputTranscription.text;
          console.log(`[TRANSCRIPT-OUT] "${text}"`);
          sendToClient(ws, { type: 'output_transcription', text });
        }

        // Input audio transcription (what the user said, as text)
        if (sc.inputTranscription && sc.inputTranscription.text) {
          const text = sc.inputTranscription.text;
          console.log(`[TRANSCRIPT-IN] "${text}"`);
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
                console.log(`[AUDIO] Chunk #${audioChunkCount}: ${dataLen} b64 chars (~${estimatedMs}ms of audio)`);
              }
              sendToClient(ws, {
                type: 'audio_chunk',
                data: part.inlineData.data,
                mimeType: part.inlineData.mimeType
              });
            }
            if (part.text) {
              console.log(`[TEXT] Model: "${part.text}"`);
              sendToClient(ws, { type: 'text', text: part.text });
            }
          }
        }

        // Turn complete
        if (sc.turnComplete) {
          console.log(`[GEMINI] Turn complete (sent ${audioChunkCount} audio chunks)`);
          sendToClient(ws, { type: 'turn_complete' });
          audioChunkCount = 0;
        }
      }

      // --- Usage metadata ---
      if (message.usageMetadata) {
        console.log(`[USAGE] Tokens: ${message.usageMetadata.totalTokenCount || 'unknown'}`);
      }

    } catch (error) {
      console.error('[GEMINI] Error handling message:', error.message);
      console.error('[GEMINI] Message keys:', Object.keys(message));
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
