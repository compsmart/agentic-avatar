# TalkingHead — AI Avatar Assistant

A real-time 3D talking avatar chatbot powered by **Google Gemini Live API** and the [TalkingHead](https://github.com/met4citizen/TalkingHead) library. Talk to an expressive, animated avatar using your voice or text — it responds with natural speech, lip-sync, gestures, moods, and full-body animations, all driven by AI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)

---

## Features

- **Real-time voice conversation** — Bidirectional audio streaming via WebSocket and the Gemini Live API
- **Accurate lip-sync** — TalkingHead library maps Gemini audio to viseme-driven mouth animation in real time
- **AI-controlled expressions** — Gemini uses function calling to set avatar moods (`happy`, `sad`, `angry`, `love`, `neutral`), play gestures, trigger full-body animations, and change camera angles — all contextually during conversation
- **Full-body animations** — Breakdance, cheering, clapping, waving, joyful jump, victory, defeated, and more (sourced from Mixamo)
- **Hand & body gestures** — Thumbs up/down, shrug, namaste, pointing, OK sign, and more
- **Dynamic camera views** — Head close-up, upper body, mid body, and full body — switched automatically by the AI when performing animations
- **Text & voice input** — Type messages or speak naturally; both are supported within the same session
- **Multiple voices** — Choose from 8 Gemini voices (Aoede, Charon, Fenrir, Kore, Puck, Leda, Orus, Zephyr)
- **Multiple avatars** — Ships with 10 Ready Player Me avatar models
- **Live transcription** — Real-time transcription of both user speech and AI responses displayed in a conversation panel
- **Docker support** — Dockerfile and docker-compose included for easy deployment

## Architecture

```
┌──────────────┐   WebSocket    ┌──────────────────┐   Gemini Live   ┌──────────────┐
│   Browser    │ ◄────────────► │  Node.js Server  │ ◄─────────────► │  Google      │
│              │   audio/text   │  (Express + WS)  │   audio/text    │  Gemini API  │
│  ┌────────┐  │                │                  │   tool calls    │              │
│  │Three.js│  │                └──────────────────┘                 └──────────────┘
│  │Avatar  │  │
│  │+Lipsync│  │
│  └────────┘  │
└──────────────┘
```

1. **Browser** captures microphone audio, streams PCM via WebSocket to the server
2. **Node.js server** relays audio to Gemini Live API and receives audio responses + tool calls
3. **Gemini** responds with spoken audio, transcriptions, and function calls (`set_mood`, `play_gesture`, `play_animation`, `set_camera_view`)
4. **Browser** plays audio through TalkingHead's streaming pipeline for real-time lip-sync, and executes tool calls to animate the avatar

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- A [Google Gemini API key](https://aistudio.google.com/apikey)

### 1. Clone & Install

```bash
git clone <repository-url>
cd talkinghead
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your-gemini-api-key-here
PORT=3000
WS_PORT=8080
```

### 3. Install TalkingHead Library

The [TalkingHead](https://github.com/met4citizen/TalkingHead) module must be placed manually:

1. Download from https://github.com/met4citizen/TalkingHead
2. Copy `talkinghead.mjs` (and accompanying lip-sync/module files) into `public/modules/`

See [`public/modules/README.md`](public/modules/README.md) for detailed instructions.

### 4. Start the Server

**Development** (auto-reload with nodemon):

```bash
npm run dev
```

**Production**:

```bash
npm start
```

### 5. Open in Browser

Navigate to **http://localhost:3000**. Click **Start Session**, allow microphone access, and start talking!

> **Windows users:** You can also run `npm run setup` (or `powershell -File start.ps1`) for a guided setup wizard.

## Project Structure

```
talkinghead/
├── server/
│   ├── server.js              # Express + WebSocket server, Gemini Live integration
│   ├── auth.js                # JWT authentication middleware
│   ├── rate-limiter.js        # Express rate limiting
│   └── websocket-handler.js   # WebSocket streaming handler
├── public/
│   ├── index.html             # Main UI
│   ├── css/
│   │   └── styles.css         # Application styles
│   ├── js/
│   │   ├── app.js             # Main application bootstrap & session management
│   │   ├── animation-library.js   # Animation definitions & loader
│   │   ├── audio-processor.js     # Microphone capture & PCM encoding
│   │   ├── avatar-behaviors.js    # Idle behaviors & emotional reactions
│   │   ├── avatar-controller.js   # Avatar control API (moods, gestures, animations)
│   │   ├── avatar-fix.js         # TalkingHead compatibility patches
│   │   ├── error-handler.js      # User-facing error display
│   │   ├── performance-optimizer.js  # Device-adaptive quality settings
│   │   └── streaming-handler.js  # Audio streaming & lip-sync pipeline
│   ├── avatars/               # Ready Player Me .glb avatar models
│   ├── animations/            # Mixamo FBX animation files
│   └── modules/               # TalkingHead library & lip-sync modules
├── .env                       # Environment variables (not committed)
├── package.json
├── Dockerfile
├── docker-compose.yml
└── start.ps1                  # Windows setup wizard (PowerShell)
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | *(required)* | Your Google Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash-native-audio-preview-12-2025` | Gemini model to use |
| `PORT` | `3000` | HTTP server port |
| `WS_PORT` | `8080` | WebSocket server port |
| `NODE_ENV` | `development` | Environment (`development` or `production`) |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS origins |

### Avatar Models

The project includes 10 Ready Player Me avatars in `public/avatars/`:

| Model | File |
|---|---|
| Brunette (default) | `brunette.glb` |
| Stevo | `stevo.glb` |
| Evo Black | `evo-black.glb` |
| Evo Boss | `evo-boss.glb` |
| Evo Glasses | `evo-glasses.glb` |
| Evo Hair | `evo-hair.glb` |
| Evo Jacket | `evo-jacket.glb` |
| Evo Normal | `evo-normal.glb` |
| Evo Pony Tail | `evo-pony-tail.glb` |
| Evo White | `evo-white.glb` |

To change the default avatar, edit the `url` in `public/js/app.js`:

```javascript
await this.head.showAvatar({
  url: './avatars/your-avatar.glb',
  body: 'F',
  // ...
});
```

You can create custom avatars at [readyplayer.me](https://readyplayer.me/).

### Animations

Full-body animations (Mixamo FBX files) are stored in `public/animations/`. Included animations:

| Animation | File | Description |
|---|---|---|
| Waving | `Waving.fbx` | Friendly wave |
| Breakdance | `Breakdance 1990.fbx` | Breakdance move |
| Cheering | `Cheering.fbx` | Excited cheering |
| Clapping | `Clapping.fbx` | Applause |
| Defeated | `Defeated.fbx` | Dejected posture |
| Joyful Jump | `Joyful Jump.fbx` | Happy jump |
| Looking | `Looking.fbx` | Looking around |
| Pointing | `Pointing.fbx` | Pointing gesture |
| Praying | `Praying.fbx` | Prayer/gratitude |
| Victory | `Victory.fbx` | Triumph pose |

See [`public/animations/README.md`](public/animations/README.md) for instructions on adding new animations from Mixamo.

## AI Tool Calling

Gemini autonomously controls the avatar through function calling. The following tools are available to the AI during conversation:

| Tool | Parameters | Description |
|---|---|---|
| `set_mood` | `mood`: happy, sad, neutral, angry, love | Changes the avatar's facial expression |
| `play_gesture` | `gesture`: handup, index, ok, thumbup, thumbdown, side, shrug, namaste | Performs a hand/body gesture |
| `play_animation` | `animation`: waving, breakdance, cheering, clapping, defeated, joyful, looking, pointing, praying, victory | Plays a full-body animation |
| `set_camera_view` | `view`: head, upper, mid, full | Changes the camera framing |

The AI uses these tools contextually — waving when greeting, showing joy for good news, shrugging when uncertain, switching to full-body view before dancing, and so on.

## Docker Deployment

### Build & Run

```bash
docker-compose up -d
```

Or manually:

```bash
docker build -t talking-avatar .
docker run -d -p 3000:3000 -p 8080:8080 \
  -e GEMINI_API_KEY=your-key \
  talking-avatar
```

The container includes a health check at `/api/health`.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check — returns Gemini status & WebSocket client count |
| `WS` | `ws://host:8080` | WebSocket for real-time audio/text streaming |

### WebSocket Message Types

**Client → Server:**

| Type | Payload | Description |
|---|---|---|
| `start_session` | `{ voice }` | Start a Gemini Live session |
| `audio_chunk` | `{ data }` | Base64 PCM audio from mic |
| `text_message` | `{ text }` | Text message input |
| `tool_response` | `{ id, name, result }` | Response to a tool call |
| `stop_session` | — | End the session |

**Server → Client:**

| Type | Payload | Description |
|---|---|---|
| `session_started` | — | Session is active |
| `audio_chunk` | `{ data, mimeType }` | AI audio response (PCM) |
| `output_transcription` | `{ text }` | Transcript of AI speech |
| `input_transcription` | `{ text }` | Transcript of user speech |
| `tool_call` | `{ id, name, args }` | Avatar control command |
| `turn_complete` | — | AI finished speaking |
| `interrupted` | — | User interrupted the AI |
| `session_ended` | `{ reason }` | Session closed |
| `error` | `{ message }` | Error message |

## Troubleshooting

| Problem | Solution |
|---|---|
| `GEMINI_API_KEY is not set` | Create a `.env` file with your API key |
| `Failed to resolve module specifier 'talkinghead'` | Download the TalkingHead library to `public/modules/` |
| Port already in use | Change `PORT` or `WS_PORT` in `.env` |
| No audio / microphone not working | Ensure HTTPS in production (required for `getUserMedia`); check browser permissions |
| Avatar not loading | Check browser console; verify `.glb` files exist in `public/avatars/` |
| WebSocket disconnects | Check that port 8080 is accessible; look at server logs for Gemini errors |

## Tech Stack

- **Backend:** Node.js, Express, WebSocket (`ws`)
- **AI:** Google Gemini Live API (`@google/genai`)
- **3D Rendering:** Three.js (via CDN)
- **Avatar Engine:** [TalkingHead](https://github.com/met4citizen/TalkingHead) by met4citizen
- **Avatar Models:** [Ready Player Me](https://readyplayer.me/)
- **Animations:** [Mixamo](https://www.mixamo.com/)
- **Auth:** JSON Web Tokens (`jsonwebtoken`)
- **Rate Limiting:** `express-rate-limit`

## License

This project is licensed under the [MIT License](LICENSE).

---

**Powered by Google Gemini Live API & TalkingHead**

