import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set in environment variables');
  console.error('   Please create a .env file with your OpenAI API key');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log('✅ OpenAI client initialized with API key:', 
  process.env.OPENAI_API_KEY.substring(0, 10) + '...' + process.env.OPENAI_API_KEY.slice(-4));

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Configure multer for file uploads with proper file handling
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Preserve original extension or use .webm as default
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `audio-${Date.now()}${ext}`);
  }
});

const upload = multer({ storage: storage });

// WebSocket server for real-time communication
const wss = new WebSocketServer({ port: WS_PORT });

console.log(`WebSocket server running on port ${WS_PORT}`);

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'audio_chunk') {
        // Handle audio streaming (implementation in websocket-handler.js)
        // For now, send acknowledgment
        ws.send(JSON.stringify({ type: 'ack', message: 'Audio chunk received' }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Speech-to-Text endpoint
app.post('/api/stt', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    // Convert audio to text using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: process.env.WHISPER_MODEL || "whisper-1",
      response_format: "json"
    });
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ text: transcription.text });
  } catch (error) {
    console.error('STT Error:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'STT processing failed', details: error.message });
  }
});

// Chat completion endpoint with streaming support
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, stream = true } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }
    
    // Enhance system message with emotion/gesture instructions if not already present
    if (messages[0]?.role === 'system' && !messages[0].content.includes('[MOOD:')) {
      messages[0].content = `You are a helpful and friendly AI assistant with an expressive 3D avatar. Keep responses concise and conversational (2-3 sentences max for voice interaction).

IMPORTANT: Start your response with emotion metadata on the first line in this exact format:
[MOOD:emotion] [GESTURE:gesture_name] [ANIMATION:animation_name] Your response...

Available moods: happy, sad, neutral, angry, love

Available gestures: handup, index, ok, thumbup, thumbdown, side, shrug, namaste
  - handup: Raising hand (greeting, asking question, getting attention)
  - index: Pointing with index finger (indicating, explaining, emphasizing)
  - ok: OK hand sign (approval, agreement, confirmation)
  - thumbup: Thumbs up (approval, success, positive feedback)
  - thumbdown: Thumbs down (disapproval, failure, negative feedback)
  - side: Hand to side (presenting, showing, introducing)
  - shrug: Shoulder shrug (uncertainty, indifference, "I don't know")
  - namaste: Prayer hands (respect, gratitude, farewell)
  - Use [GESTURE:none] to skip gesture

Available animations: waving, breakdance, cheering, clapping, defeated, joyful, looking, pointing, praying, victory
  - waving: Friendly waving gesture (hello, goodbye, getting attention, greeting)
  - breakdance: Energetic 1990s breakdancing moves (extreme celebration, party, having fun, showing off, when user asks to dance or breakdance)
  - cheering: Enthusiastic cheering with raised arms (celebrating success, showing support, excitement)
  - clapping: Applause and clapping hands (appreciation, congratulations, approval, showing support)
  - defeated: Dejected sad defeated posture (bad news, disappointment, failure, empathy, feeling down)
  - joyful: Joyful jumping with excitement (great news, achievement, happiness, success)
  - looking: Looking around curiously (searching, being curious, exploring, thinking, considering options)
  - pointing: Pointing at something with emphasis (indicating direction, emphasizing a point, explaining)
  - praying: Praying or meditation pose (gratitude, hope, thankfulness, spirituality, prayer)
  - victory: Victory pose with triumphant gesture (winning, achievement, success, triumph, completing a goal)
  - Use [ANIMATION:none] to skip animation
  - Optionally specify duration: [ANIMATION:breakdance:10] for 10 seconds (default is animation's natural duration)

Examples:
- Greeting: "[MOOD:happy] [GESTURE:handup] [ANIMATION:waving] Hello! It's great to talk with you!"
- Explaining: "[MOOD:neutral] [GESTURE:index] [ANIMATION:none] That's an interesting question. Let me explain..."
- Agreeing: "[MOOD:happy] [GESTURE:thumbup] [ANIMATION:none] Absolutely! I completely understand what you mean."
- Thankful: "[MOOD:happy] [GESTURE:namaste] [ANIMATION:praying] Thank you so much! I really appreciate that!"
- Uncertain: "[MOOD:neutral] [GESTURE:shrug] [ANIMATION:none] I'm not entirely sure about that one."
- Bad News: "[MOOD:sad] [GESTURE:none] [ANIMATION:defeated] I'm sorry to hear that. That must be difficult."
- Celebrating: "[MOOD:love] [GESTURE:thumbup] [ANIMATION:joyful] That's amazing news! Congratulations!"
- Big Celebration: "[MOOD:happy] [GESTURE:thumbup] [ANIMATION:breakdance:10] Wow! That's absolutely incredible!"
- Dancing: "[MOOD:happy] [GESTURE:none] [ANIMATION:breakdance:8] Let me show you some moves!"
- Victory: "[MOOD:happy] [GESTURE:none] [ANIMATION:victory] You did it! Great job!"
- Cheering: "[MOOD:happy] [GESTURE:none] [ANIMATION:cheering] Yay! That's awesome!"

Choose appropriate mood, gesture, and animation based on the context. Keep the response natural and engaging.`;
    }
    
    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      
      const chatStream = await openai.chat.completions.create({
        model: process.env.GPT_MODEL || "gpt-4",
        messages: messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 500
      });
      
      for await (const chunk of chatStream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const completion = await openai.chat.completions.create({
        model: process.env.GPT_MODEL || "gpt-4",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      });
      
      let content = completion.choices[0].message.content;
      
      // Extract mood, gesture, and animation from response
      let mood = 'neutral';
      let gesture = null;
      let animation = null;
      let animationDuration = null;
      
      const moodMatch = content.match(/\[MOOD:(\w+)\]/);
      const gestureMatch = content.match(/\[GESTURE:(\w+)\]/);
      const animationMatch = content.match(/\[ANIMATION:(\w+)(?::(\d+))?\]/);
      
      if (moodMatch) {
        mood = moodMatch[1];
        content = content.replace(/\[MOOD:\w+\]\s*/g, '');
      }
      
      if (gestureMatch) {
        gesture = gestureMatch[1];
        content = content.replace(/\[GESTURE:\w+\]\s*/g, '');
      }

      if (animationMatch) {
        animation = animationMatch[1];
        animationDuration = animationMatch[2] ? parseInt(animationMatch[2]) : null;
        content = content.replace(/\[ANIMATION:\w+(?::\d+)?\]\s*/g, '');
      }
      
      res.json({ 
        content: content,
        mood: mood,
        gesture: gesture,
        animation: animation,
        animationDuration: animationDuration
      });
    }
  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ error: 'Chat processing failed', details: error.message });
  }
});

// Text-to-Speech endpoint with word timestamps
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = process.env.TTS_VOICE || "alloy" } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }
    
    // Generate speech
    const mp3 = await openai.audio.speech.create({
      model: process.env.TTS_MODEL || "tts-1",
      voice: voice,
      input: text,
      response_format: "mp3"
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    // Generate word-level timestamps (improved estimation)
    // NOTE: OpenAI TTS doesn't provide word timestamps directly
    // This is an estimation - for perfect lip-sync, use a service like Azure TTS
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;
    
    // Estimate audio duration: average speaking rate is ~150 words per minute
    // or about 400ms per word for natural speech
    const estimatedDuration = totalWords * 400; // milliseconds
    
    // Create timestamps with slight variation for natural feel
    let currentTime = 0;
    const timestamps = words.map((word, index) => {
      // Vary duration based on word length (longer words take more time)
      const baseDuration = 250; // base duration in ms
      const lengthFactor = Math.min(word.length * 30, 300); // add up to 300ms for long words
      const duration = baseDuration + lengthFactor;
      
      const timestamp = {
        word: word,
        start: currentTime,
        duration: duration
      };
      
      currentTime += duration;
      return timestamp;
    });
    
    console.log(`Generated ${timestamps.length} word timestamps for TTS`);
    
    res.json({
      audio: buffer.toString('base64'),
      timestamps: timestamps,
      text: text
    });
  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ error: 'TTS processing failed', details: error.message });
  }
});

// Combined endpoint: STT -> Chat -> TTS (chained voice architecture)
app.post('/api/voice-chain', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    console.log('Voice chain request received:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    const conversationHistory = req.body.history ? JSON.parse(req.body.history) : [];
    
    // Ensure file has proper extension for OpenAI
    const originalPath = req.file.path;
    const currentExt = path.extname(originalPath);
    const desiredExt = path.extname(req.file.originalname) || '.webm';
    
    // Only add extension if file doesn't already have one
    const newPath = currentExt ? originalPath : originalPath + desiredExt;
    
    const ext = path.extname(newPath);
    
    console.log('📁 File handling:', {
      originalPath,
      extension: ext,
      newPath,
      mimetype: req.file.mimetype,
      needsRename: originalPath !== newPath
    });
    
    // Validate audio format
    const supportedFormats = ['.webm', '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.ogg'];
    if (!supportedFormats.includes(ext.toLowerCase())) {
      console.warn(`⚠️ Unusual audio format: ${ext}. Supported: ${supportedFormats.join(', ')}`);
    }
    
    // Rename file to have proper extension if needed
    if (originalPath !== newPath) {
      fs.renameSync(originalPath, newPath);
      console.log('✅ File renamed:', path.basename(originalPath), '→', path.basename(newPath));
    } else {
      console.log('✅ File already has correct extension:', path.basename(newPath));
    }
    
    // Step 1: Speech-to-Text
    console.log('Step 1: Transcribing audio...');
    console.log('File path:', newPath);
    console.log('File extension:', ext);
    console.log('File exists:', fs.existsSync(newPath));
    
    // Check if file has content
    const stats = fs.statSync(newPath);
    console.log('📊 File size:', stats.size, 'bytes', `(${(stats.size / 1024).toFixed(2)} KB)`);
    
    if (stats.size === 0) {
      throw new Error('Audio file is empty (0 bytes)');
    }
    
    if (stats.size < 1000) {
      console.warn('⚠️ Audio file is very small (<1KB), may not contain actual audio data');
      console.warn('   This might indicate the recording stopped too quickly or microphone access issues');
    }
    
    // Try to read first few bytes to verify file is readable and validate format
    try {
      const fd = fs.openSync(newPath, 'r');
      const buffer = Buffer.alloc(Math.min(100, stats.size));
      fs.readSync(fd, buffer, 0, buffer.length, 0);
      fs.closeSync(fd);
      
      const headerHex = buffer.toString('hex').substring(0, 40);
      console.log('✅ File is readable. Header (hex):', headerHex + '...');
      
      // Check for valid WebM header (EBML)
      if (ext === '.webm') {
        const ebmlHeader = buffer.toString('hex', 0, 4);
        if (ebmlHeader === '1a45dfa3') {
          console.log('✅ Valid WebM/EBML header detected');
        } else {
          console.warn('⚠️ WebM file does not have expected EBML header');
          console.warn('   Expected: 1a45dfa3, Got:', ebmlHeader);
        }
      }
      
      // Check if file is all zeros (empty recording)
      const allZeros = buffer.every(byte => byte === 0);
      if (allZeros) {
        console.error('❌ Audio file contains only zero bytes (empty recording)');
        throw new Error('Audio recording is empty. Please check microphone permissions and try again.');
      }
    } catch (readError) {
      console.error('❌ Cannot read audio file:', readError);
      throw new Error('Audio file is corrupted or unreadable');
    }
    
    // Save audio file for debugging BEFORE transcription attempt
    const debugDir = path.join(__dirname, '../uploads/debug-audio');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const debugFileName = `audio-${timestamp}${ext}`;
    const debugPath = path.join(debugDir, debugFileName);
    
    try {
      fs.copyFileSync(newPath, debugPath);
      console.log('💾 Audio saved for debugging:', debugPath);
      console.log('   You can play this file to verify: http://localhost:3000/debug-audio.html');
      
      // Clean up old debug files (keep only last 10)
      const debugFiles = fs.readdirSync(debugDir)
        .filter(f => f.startsWith('audio-') && !f.endsWith('.md'))
        .map(f => ({ name: f, path: path.join(debugDir, f), time: fs.statSync(path.join(debugDir, f)).mtime }))
        .sort((a, b) => b.time - a.time);
      
      if (debugFiles.length > 10) {
        debugFiles.slice(10).forEach(file => {
          fs.unlinkSync(file.path);
          console.log('🗑️ Deleted old debug file:', file.name);
        });
      }
    } catch (copyError) {
      console.warn('⚠️ Could not save debug audio:', copyError.message);
    }
    
    console.log('🎯 Calling OpenAI Whisper API (Speech-to-Text)...');
    console.log('API: POST https://api.openai.com/v1/audio/transcriptions');
    let transcription;
    try {
      // Use OpenAI's Whisper API for speech-to-text
      // This is the recommended approach from OpenAI docs
      transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(newPath),
        model: "whisper-1",
        language: "en",
        response_format: "verbose_json",
        temperature: 0 // Use 0 for more deterministic results
      });
      console.log('✅ OpenAI Whisper API call successful');
      console.log('📊 Transcription details:', JSON.stringify(transcription, null, 2));
      
      // Check if audio actually has speech
      if (transcription.duration) {
        console.log('🎵 Audio duration:', transcription.duration, 'seconds');
        
        // Warn if audio is very short
        if (transcription.duration < 0.5) {
          console.warn('⚠️ Audio is very short (<0.5s), might not contain clear speech');
        }
      }
      
      // Log segments if available
      if (transcription.segments) {
        console.log('📝 Speech segments detected:', transcription.segments.length);
        transcription.segments.forEach((seg, i) => {
          console.log(`   Segment ${i+1}: "${seg.text}" (${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s)`);
        });
      }
    } catch (whisperError) {
      console.error('❌ OpenAI Whisper API Error:', whisperError);
      console.error('Error details:', {
        message: whisperError.message,
        status: whisperError.status,
        code: whisperError.code,
        type: whisperError.type
      });
      
      // Provide helpful error messages
      if (whisperError.status === 400) {
        throw new Error('Invalid audio format. Please ensure your microphone is working properly.');
      } else if (whisperError.status === 401) {
        throw new Error('OpenAI API authentication failed. Please check your API key.');
      } else {
        throw new Error(`Speech transcription failed: ${whisperError.message}`);
      }
    }
    
    let userMessage = transcription.text;
    console.log('📝 Transcription result:', userMessage);
    console.log('📏 Transcription length:', userMessage?.length || 0, 'characters');
    
    // Check if transcription is valid
    if (!userMessage || userMessage.trim().length === 0) {
      console.error('❌ Transcription returned empty text');
      console.error('   Audio duration:', transcription.duration, 'seconds');
      throw new Error('No speech detected in audio. Please speak clearly and try again.');
    }
    
    // Check if Whisper just returned minimal/garbled text (indicates poor audio quality)
    const trimmedMessage = userMessage.trim().toLowerCase();
    if (trimmedMessage === 'you' || 
        trimmedMessage === 'you.' ||
        trimmedMessage === 'uh' ||
        trimmedMessage === 'um' ||
        userMessage.length < 3) {
      console.error('❌ Transcription indicates no clear speech detected');
      console.error('   Result:', userMessage);
      console.error('   Audio duration:', transcription.duration, 'seconds');
      console.error('   Audio size:', stats.size, 'bytes');
      
      // Try again without language parameter as fallback
      console.log('🔄 Retrying transcription without language parameter...');
      try {
        const retryTranscription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(newPath),
          model: "whisper-1",
          response_format: "verbose_json",
          temperature: 0.2 // Slightly higher temperature for retry
        });
        
        console.log('📝 Retry result:', retryTranscription.text);
        
        if (retryTranscription.text && retryTranscription.text.trim().length > 3) {
          userMessage = retryTranscription.text;
          console.log('✅ Retry successful!');
        } else {
          throw new Error('RETRY_FAILED');
        }
      } catch (retryError) {
        console.error('❌ Retry also failed');
        throw new Error('Could not understand the audio. Please ensure:\n' +
          '1. Your microphone is working properly\n' +
          '2. You speak clearly and loudly\n' +
          '3. You record for at least 2-3 seconds\n' +
          '4. Background noise is minimized\n' +
          '5. You are close to the microphone');
      }
    }
    
    console.log('✅ Transcription successful:', userMessage);
    
    // Save a copy of the audio for debugging (optional, controlled by env var)
    if (process.env.SAVE_DEBUG_AUDIO === 'true') {
      const debugDir = 'uploads/debug';
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      const debugPath = path.join(debugDir, `recording-${Date.now()}${ext}`);
      fs.copyFileSync(newPath, debugPath);
      console.log('🐛 Debug: Audio saved to', debugPath);
    }
    
    // Step 2: Chat Completion with emotion and gesture metadata
    console.log('Step 2: Generating response...');
    const messages = [
      { 
        role: "system", 
        content: `You are a helpful and friendly AI assistant with an expressive 3D avatar. Keep responses concise and conversational (2-3 sentences max for voice interaction).

IMPORTANT: Start your response with emotion metadata on the first line in this exact format:
[MOOD:emotion] [GESTURE:gesture_name] [ANIMATION:animation_name]

Available moods: happy, sad, neutral, angry, love

Available gestures: handup, index, ok, thumbup, thumbdown, side, shrug, namaste
  - handup: Raising hand (greeting, asking question, getting attention)
  - index: Pointing with index finger (indicating, explaining, emphasizing)
  - ok: OK hand sign (approval, agreement, confirmation)
  - thumbup: Thumbs up (approval, success, positive feedback)
  - thumbdown: Thumbs down (disapproval, failure, negative feedback)
  - side: Hand to side (presenting, showing, introducing)
  - shrug: Shoulder shrug (uncertainty, indifference, "I don't know")
  - namaste: Prayer hands (respect, gratitude, farewell)
  - Use [GESTURE:none] to skip gesture

Available animations: waving, breakdance, cheering, clapping, defeated, joyful, looking, pointing, praying, victory
  - waving: Friendly waving gesture (hello, goodbye, getting attention, greeting)
  - breakdance: Energetic 1990s breakdancing moves (extreme celebration, party, having fun, showing off, when user asks to dance or breakdance)
  - cheering: Enthusiastic cheering with raised arms (celebrating success, showing support, excitement)
  - clapping: Applause and clapping hands (appreciation, congratulations, approval, showing support)
  - defeated: Dejected sad defeated posture (bad news, disappointment, failure, empathy, feeling down)
  - joyful: Joyful jumping with excitement (great news, achievement, happiness, success)
  - looking: Looking around curiously (searching, being curious, exploring, thinking, considering options)
  - pointing: Pointing at something with emphasis (indicating direction, emphasizing a point, explaining)
  - praying: Praying or meditation pose (gratitude, hope, thankfulness, spirituality, prayer)
  - victory: Victory pose with triumphant gesture (winning, achievement, success, triumph, completing a goal)
  - Use [ANIMATION:none] to skip animation
  - Optionally specify duration: [ANIMATION:breakdance:10] for 10 seconds (default is animation's natural duration)

Examples:
- Greeting: "[MOOD:happy] [GESTURE:handup] [ANIMATION:waving] Hello! It's great to talk with you!"
- Explaining: "[MOOD:neutral] [GESTURE:index] [ANIMATION:none] That's an interesting question. Let me explain..."
- Agreeing: "[MOOD:happy] [GESTURE:thumbup] [ANIMATION:none] Absolutely! I completely understand what you mean."
- Thankful: "[MOOD:happy] [GESTURE:namaste] [ANIMATION:praying] Thank you so much! I really appreciate that!"
- Uncertain: "[MOOD:neutral] [GESTURE:shrug] [ANIMATION:none] I'm not entirely sure about that one."
- Bad News: "[MOOD:sad] [GESTURE:none] [ANIMATION:defeated] I'm sorry to hear that. That must be difficult."
- Celebrating: "[MOOD:love] [GESTURE:thumbup] [ANIMATION:joyful] That's amazing news! Congratulations!"
- Big Celebration: "[MOOD:happy] [GESTURE:thumbup] [ANIMATION:breakdance:10] Wow! That's absolutely incredible!"
- Dancing: "[MOOD:happy] [GESTURE:none] [ANIMATION:breakdance:8] Let me show you some moves!"
- Victory: "[MOOD:happy] [GESTURE:none] [ANIMATION:victory] You did it! Great job!"
- Cheering: "[MOOD:happy] [GESTURE:none] [ANIMATION:cheering] Yay! That's awesome!"

Choose appropriate mood, gesture, and animation based on the context. Keep the response natural and engaging.` 
      },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];
    
    const completion = await openai.chat.completions.create({
      model: process.env.GPT_MODEL || "gpt-4",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });
    
    let assistantMessage = completion.choices[0].message.content;
    
    // Extract mood, gesture, and animation from response
    let mood = 'neutral';
    let gesture = null;
    let animation = null;
    let animationDuration = null;
    
    const moodMatch = assistantMessage.match(/\[MOOD:(\w+)\]/);
    const gestureMatch = assistantMessage.match(/\[GESTURE:(\w+)\]/);
    const animationMatch = assistantMessage.match(/\[ANIMATION:(\w+)(?::(\d+))?\]/);
    
    if (moodMatch) {
      mood = moodMatch[1];
      assistantMessage = assistantMessage.replace(/\[MOOD:\w+\]\s*/g, '');
    }
    
    if (gestureMatch) {
      gesture = gestureMatch[1];
      assistantMessage = assistantMessage.replace(/\[GESTURE:\w+\]\s*/g, '');
    }

    if (animationMatch) {
      animation = animationMatch[1];
      animationDuration = animationMatch[2] ? parseInt(animationMatch[2]) : null;
      assistantMessage = assistantMessage.replace(/\[ANIMATION:\w+(?::\d+)?\]\s*/g, '');
    }
    
    console.log('Response:', assistantMessage);
    console.log('Metadata:', { mood, gesture, animation, animationDuration });
    
    // Step 3: Text-to-Speech
    console.log('Step 3: Generating speech...');
    const mp3 = await openai.audio.speech.create({
      model: process.env.TTS_MODEL || "tts-1",
      voice: process.env.TTS_VOICE || "alloy",
      input: assistantMessage,
      response_format: "mp3"
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    const audioBase64 = buffer.toString('base64');
    
    // Generate word timestamps (improved estimation)
    const words = assistantMessage.split(/\s+/).filter(w => w.length > 0);
    
    // Create timestamps with slight variation for natural feel
    let currentTime = 0;
    const timestamps = words.map((word, index) => {
      // Vary duration based on word length (longer words take more time)
      const baseDuration = 250; // base duration in ms
      const lengthFactor = Math.min(word.length * 30, 300); // add up to 300ms for long words
      const duration = baseDuration + lengthFactor;
      
      const timestamp = {
        word: word,
        start: currentTime,
        duration: duration
      };
      
      currentTime += duration;
      return timestamp;
    });
    
    console.log(`Generated ${timestamps.length} word timestamps for voice chain`);
    
    // Clean up uploaded file
    if (fs.existsSync(newPath)) {
      fs.unlinkSync(newPath);
    }
    
    console.log('✅ Voice chain completed successfully');
    console.log('=' .repeat(80));
    console.log('📊 Summary:');
    console.log('   User said:', userMessage);
    console.log('   AI responded:', assistantMessage.substring(0, 100) + (assistantMessage.length > 100 ? '...' : ''));
    console.log('   Mood:', mood);
    console.log('   Gesture:', gesture || 'none');
    console.log('   Animation:', animation || 'none');
    console.log('=' .repeat(80));
    
    res.json({
      userMessage: userMessage,
      assistantMessage: assistantMessage,
      audio: audioBase64,
      timestamps: timestamps,
      mood: mood,
      gesture: gesture,
      animation: animation,
      animationDuration: animationDuration
    });
  } catch (error) {
    console.error('Voice Chain Error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // Clean up file on error
    if (req.file) {
      const originalPath = req.file.path;
      const ext = path.extname(req.file.originalname) || '.webm';
      const newPath = originalPath + ext;
      
      if (fs.existsSync(newPath)) {
        fs.unlinkSync(newPath);
      }
      if (fs.existsSync(originalPath)) {
        fs.unlinkSync(originalPath);
      }
    }
    
    res.status(500).json({ 
      error: 'Voice chain processing failed', 
      details: error.message 
    });
  }
});

// Debug audio files list endpoint
app.get('/api/debug-audio-list', (req, res) => {
  try {
    const debugDir = path.join(__dirname, '../uploads/debug-audio');
    
    if (!fs.existsSync(debugDir)) {
      return res.json({ files: [] });
    }
    
    const files = fs.readdirSync(debugDir)
      .filter(f => f.startsWith('audio-'))
      .map(f => {
        const filePath = path.join(debugDir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          size: stats.size,
          time: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.time) - new Date(a.time));
    
    res.json({ files });
  } catch (error) {
    console.error('Error listing debug audio files:', error);
    res.status(500).json({ error: 'Failed to list audio files', details: error.message });
  }
});

// Serve debug audio files
app.use('/uploads/debug-audio', express.static(path.join(__dirname, '../uploads/debug-audio')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      websocket: wss.clients.size
    }
  });
});

// Start HTTP server
app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`OpenAI API configured: ${!!process.env.OPENAI_API_KEY}`);
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  wss.close(() => {
    console.log('WebSocket server closed');
  });
  process.exit(0);
});
