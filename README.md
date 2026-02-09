# TalkingHead Digital Avatar with OpenAI Voice Architecture

A real-time talking digital avatar chatbot powered by OpenAI's chained voice architecture (STT → LLM → TTS) and the TalkingHead 3D avatar library.

## 🌟 Features

- **Real-time Voice Conversation**: Speak naturally with an AI avatar using your microphone
- **Intelligent Responses**: Powered by GPT-4 for contextual, conversational AI
- **Lip-Sync Animation**: Accurate mouth movements synchronized with speech
- **Multiple Voice Options**: Choose from 6 different OpenAI TTS voices
- **Avatar Behaviors**: Natural idle animations and emotional reactions
- **WebSocket Streaming**: Low-latency real-time communication
- **Responsive Design**: Works on desktop and mobile devices
- **Production Ready**: Includes authentication, rate limiting, and error handling

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Audio     │────▶│    STT      │────▶│    LLM      │────▶│    TTS      │
│   Input     │     │  (Whisper)  │     │  (GPT-4)    │     │ (OpenAI TTS)│
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                      │
                                                                      ▼
┌─────────────────────────────────────────────────────────┐  ┌─────────────┐
│                  TalkingHead Avatar                      │◀─│  Lip-Sync   │
│                  (3D Ready Player Me)                    │  │  Processing │
└─────────────────────────────────────────────────────────┘  └─────────────┘
```

## 📋 Prerequisites

- Node.js 18+ 
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Modern web browser with microphone access
- (Optional) Docker for containerized deployment

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd talking-avatar-chatbot
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your OpenAI API key:

```bash
cp .env.example .env
```

Edit `.env`:
```env
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_random_secret_key_here
PORT=3000
WS_PORT=8080
```

### 3. Run the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### 4. Open in Browser

Navigate to `http://localhost:3000`

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Using Docker Directly

```bash
# Build image
docker build -t talking-avatar .

# Run container
docker run -p 3000:3000 -p 8080:8080 \
  -e OPENAI_API_KEY=your_key_here \
  -e JWT_SECRET=your_secret_here \
  talking-avatar
```

## 📁 Project Structure

```
talking-avatar/
├── server/                     # Backend server
│   ├── server.js              # Main Express server
│   ├── websocket-handler.js   # WebSocket streaming handler
│   ├── auth.js                # Authentication middleware
│   └── rate-limiter.js        # Rate limiting configuration
├── public/                    # Frontend files
│   ├── index.html            # Main HTML file
│   ├── css/
│   │   └── styles.css        # Styling
│   ├── js/
│   │   ├── app.js            # Main application logic
│   │   ├── audio-processor.js       # Audio capture/processing
│   │   ├── openai-integration.js    # OpenAI API client
│   │   ├── avatar-controller.js     # Avatar control
│   │   ├── avatar-behaviors.js      # Avatar animations
│   │   ├── error-handler.js         # Error handling
│   │   ├── performance-optimizer.js # Performance tuning
│   │   └── streaming-handler.js     # Streaming management
│   └── modules/
│       └── talkinghead.mjs   # TalkingHead library (add manually)
├── uploads/                   # Temporary audio uploads
├── package.json
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🎮 Usage

### Basic Conversation

1. Click **"Start Talking"** button
2. Speak into your microphone
3. Click **"Stop"** when finished speaking
4. Watch the avatar respond with lip-synced animation

### Voice Selection

Choose from 6 OpenAI voices:
- **Alloy** - Neutral, balanced voice
- **Echo** - Warm, conversational
- **Fable** - British English accent
- **Onyx** - Deep, authoritative
- **Nova** - Friendly, expressive
- **Shimmer** - Soft, gentle

### Avatar Moods

Control the avatar's emotional expression:
- Neutral
- Happy
- Sad
- Angry
- Love

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Required |
| `PORT` | HTTP server port | 3000 |
| `WS_PORT` | WebSocket server port | 8080 |
| `JWT_SECRET` | Secret for JWT tokens | Required for auth |
| `GPT_MODEL` | GPT model to use | gpt-4 |
| `TTS_MODEL` | TTS model to use | tts-1 |
| `TTS_VOICE` | Default voice | alloy |
| `WHISPER_MODEL` | Whisper model | whisper-1 |

### Performance Optimization

The app automatically adjusts quality based on device capabilities:

- **Low-end devices**: Reduced FPS and resolution
- **Mobile devices**: Optimized for battery life
- **Desktop**: Full quality rendering

## 📡 API Endpoints

### POST `/api/stt`
Convert speech to text
- **Body**: `audio` (file upload)
- **Response**: `{ text: string }`

### POST `/api/chat`
Get chat completion
- **Body**: `{ messages: array, stream: boolean }`
- **Response**: `{ content: string }` or SSE stream

### POST `/api/tts`
Convert text to speech
- **Body**: `{ text: string, voice: string }`
- **Response**: `{ audio: base64, timestamps: array }`

### POST `/api/voice-chain`
Complete voice pipeline (STT → LLM → TTS)
- **Body**: `audio` (file upload), `history` (optional)
- **Response**: `{ userMessage, assistantMessage, audio, timestamps }`

### GET `/api/health`
Health check
- **Response**: `{ status: string, services: object }`

## 🔒 Security Features

- **Rate Limiting**: Prevents API abuse
- **JWT Authentication**: Optional token-based auth
- **CORS Protection**: Configurable origins
- **Input Validation**: Sanitized user inputs
- **Error Handling**: Graceful error recovery

## 🎨 Customization

### Use Your Own Avatar

Replace the default avatar URL in `app.js`:

```javascript
await this.head.showAvatar({
  url: 'path/to/your/avatar.glb',  // Your custom GLB model
  body: 'F',  // or 'M'
  avatarMood: 'happy',
  lipsyncLang: 'en'
});
```

Create custom avatars at [Ready Player Me](https://readyplayer.me/)

### Add Custom Behaviors

Extend `avatar-behaviors.js`:

```javascript
performCustomAction() {
  this.controller.playGesture('wave', 2);
  this.controller.speakEmoji('👋');
}
```

## 🐛 Troubleshooting

### Microphone Not Working
- Ensure browser has microphone permissions
- Use HTTPS in production (required for mic access)
- Check browser console for errors

### Avatar Not Loading
- Verify internet connection (loads from CDN)
- Check browser WebGL support
- Try refreshing the page

### No Audio Output
- Check system volume settings
- Verify OpenAI API key is valid
- Check browser console for errors

### WebSocket Connection Failed
- Ensure port 8080 is not blocked
- Check firewall settings
- Verify WS_PORT environment variable

## 📊 Performance Tips

1. **Use faster models for lower latency**:
   - `gpt-3.5-turbo` instead of `gpt-4`
   - `tts-1` instead of `tts-1-hd`

2. **Optimize avatar settings** for low-end devices:
   ```javascript
   modelFPS: 15,  // Reduce from 30
   modelPixelRatio: 0.5  // Reduce from 1
   ```

3. **Enable caching** for repeated responses

4. **Use WebSocket streaming** for real-time interaction

## 🧪 Testing

```bash
# Run basic tests
npm test

# Test specific endpoint
curl http://localhost:3000/api/health
```

## 📝 License

MIT License - feel free to use in your projects!

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📚 Resources

- [TalkingHead GitHub](https://github.com/met4citizen/TalkingHead)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Ready Player Me](https://readyplayer.me/)
- [Three.js Documentation](https://threejs.org/docs/)

## ⚠️ Important Notes

1. **OpenAI API Costs**: This application uses OpenAI's paid APIs. Monitor your usage to avoid unexpected charges.

2. **TalkingHead Library**: You need to download the TalkingHead library manually and place it in `public/modules/talkinghead.mjs`. Get it from the [official repository](https://github.com/met4citizen/TalkingHead).

3. **Avatar Models**: The default avatar loads from Ready Player Me CDN. For production, host your own avatar models.

4. **HTTPS Required**: For microphone access in production, you must use HTTPS.

## 🎯 Roadmap

- [ ] Emotion detection from speech tone
- [ ] Multi-language support
- [ ] Custom voice cloning
- [ ] Gesture recognition
- [ ] Avatar customization UI
- [ ] Mobile app version
- [ ] Background environment selection
- [ ] Recording/playback of conversations

## 💬 Support

For issues and questions:
- GitHub Issues: [Create an issue](#)
- OpenAI Community: [platform.openai.com/community](https://platform.openai.com/community)

## 🙏 Acknowledgments

- TalkingHead library by [met4citizen](https://github.com/met4citizen)
- OpenAI for GPT-4, Whisper, and TTS APIs
- Ready Player Me for 3D avatar technology
- Three.js for 3D rendering

---

**Made with ❤️ using OpenAI and TalkingHead**
