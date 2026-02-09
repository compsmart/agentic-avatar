# Installation & Setup Guide

## Quick Start

Follow these steps to get your TalkingHead Avatar Chatbot running:

### 1. Install Dependencies

```powershell
npm install
```

### 2. Setup Environment Variables

Copy the example environment file and configure it:

```powershell
copy .env.example .env
```

Edit `.env` file and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-actual-api-key-here
JWT_SECRET=your-random-secret-string-here
```

### 3. Install TalkingHead Library

**IMPORTANT**: The TalkingHead library must be installed manually.

Download from: https://github.com/met4citizen/TalkingHead

Then copy `talkinghead.mjs` to `public/modules/` directory.

See `public/modules/README.md` for detailed instructions.

### 4. Create Required Directories

```powershell
New-Item -ItemType Directory -Force -Path uploads
New-Item -ItemType Directory -Force -Path public/modules
New-Item -ItemType Directory -Force -Path public/avatars
```

### 5. Start the Server

**Development Mode** (with auto-reload):
```powershell
npm run dev
```

**Production Mode**:
```powershell
npm start
```

### 6. Open in Browser

Navigate to: http://localhost:3000

## Verification Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Dependencies installed (`npm install` completed)
- [ ] `.env` file created with valid OPENAI_API_KEY
- [ ] TalkingHead library in `public/modules/talkinghead.mjs`
- [ ] Server starts without errors
- [ ] Browser can access http://localhost:3000
- [ ] Microphone permission granted in browser
- [ ] WebSocket connects successfully

## Common Setup Issues

### "Cannot find module 'dotenv'"
**Solution**: Run `npm install`

### "OPENAI_API_KEY is not set"
**Solution**: Check your `.env` file and ensure the API key is correct

### "Failed to resolve module specifier 'talkinghead'"
**Solution**: Download TalkingHead library to `public/modules/`

### Port 3000 already in use
**Solution**: Change PORT in `.env` file or stop the other service

### WebSocket connection failed
**Solution**: Check that port 8080 is available, update WS_PORT in `.env` if needed

## Testing the Installation

1. **Test Server Health**:
   ```powershell
   curl http://localhost:3000/api/health
   ```
   Should return: `{"status":"ok",...}`

2. **Test Frontend**:
   - Open http://localhost:3000
   - Avatar should load and display
   - Controls should be visible

3. **Test Microphone**:
   - Click "Start Talking"
   - Browser should request microphone permission
   - Audio level bar should show activity when speaking

## Next Steps

Once everything is working:

1. Customize the avatar (see README.md)
2. Adjust settings in `.env` for your use case
3. Read the API documentation
4. Explore the code examples

## Getting Help

If you encounter issues:

1. Check the browser console for errors (F12)
2. Check the server logs in terminal
3. Review the troubleshooting section in README.md
4. Check OpenAI API status: https://status.openai.com/

## Production Deployment

For production deployment:

1. Use a process manager (PM2, systemd)
2. Enable HTTPS (required for microphone access)
3. Set NODE_ENV=production
4. Configure proper rate limits
5. Use a reverse proxy (nginx, Apache)
6. Set up monitoring and logging

See README.md for detailed production deployment instructions.
