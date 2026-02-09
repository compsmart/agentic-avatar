import OpenAI from 'openai';

export class StreamingVoiceHandler {
  constructor(ws, openaiClient) {
    this.ws = ws;
    this.openai = openaiClient;
    this.audioQueue = [];
    this.isProcessing = false;
    this.conversationHistory = [];
  }
  
  async handleAudioStream(audioChunk) {
    this.audioQueue.push(audioChunk);
    
    if (!this.isProcessing) {
      this.processAudioQueue();
    }
  }
  
  async processAudioQueue() {
    this.isProcessing = true;
    
    while (this.audioQueue.length > 0) {
      const chunk = this.audioQueue.shift();
      
      try {
        // Process audio chunk through STT
        const transcript = await this.transcribeAudio(chunk);
        
        if (transcript) {
          // Send transcript to client
          this.ws.send(JSON.stringify({
            type: 'transcript',
            text: transcript
          }));
          
          // Generate response
          const response = await this.generateResponse(transcript);
          
          // Convert to speech with timestamps
          const speechData = await this.textToSpeech(response);
          
          // Send to client for avatar animation
          this.ws.send(JSON.stringify({
            type: 'speech_data',
            data: speechData
          }));
        }
      } catch (error) {
        console.error('Audio processing error:', error);
        this.ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    }
    
    this.isProcessing = false;
  }
  
  async transcribeAudio(audioData) {
    try {
      // Convert base64 audio to buffer
      const buffer = Buffer.from(audioData, 'base64');
      
      // Save temporarily for Whisper API
      const fs = await import('fs');
      const path = await import('path');
      const tempFile = path.join('uploads', `temp_${Date.now()}.webm`);
      
      fs.writeFileSync(tempFile, buffer);
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: "whisper-1",
        response_format: "json"
      });
      
      // Clean up temp file
      fs.unlinkSync(tempFile);
      
      return transcription.text;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }
  
  async generateResponse(text) {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: "user",
        content: text
      });
      
      // Keep conversation history manageable
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }
      
      const messages = [
        { 
          role: "system", 
          content: "You are a helpful and friendly AI assistant. Keep responses concise and conversational, suitable for voice interaction." 
        },
        ...this.conversationHistory
      ];
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.GPT_MODEL || "gpt-4",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      });
      
      const response = completion.choices[0].message.content;
      
      // Add assistant response to history
      this.conversationHistory.push({
        role: "assistant",
        content: response
      });
      
      return response;
    } catch (error) {
      console.error('Response generation error:', error);
      throw error;
    }
  }
  
  async textToSpeech(text) {
    try {
      const mp3 = await this.openai.audio.speech.create({
        model: process.env.TTS_MODEL || "tts-1",
        voice: process.env.TTS_VOICE || "alloy",
        input: text,
        response_format: "mp3"
      });
      
      // Generate word-level timestamps
      const words = text.split(/\s+/);
      const avgWordDuration = 300; // milliseconds
      const timestamps = words.map((word, index) => ({
        word: word,
        start: index * avgWordDuration,
        duration: avgWordDuration
      }));
      
      const buffer = Buffer.from(await mp3.arrayBuffer());
      
      return {
        audio: buffer.toString('base64'),
        timestamps: timestamps,
        text: text
      };
    } catch (error) {
      console.error('TTS error:', error);
      throw error;
    }
  }
  
  clearHistory() {
    this.conversationHistory = [];
  }
  
  getHistory() {
    return this.conversationHistory;
  }
}
