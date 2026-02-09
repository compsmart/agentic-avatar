export class OpenAIIntegration {
  constructor() {
    this.baseURL = window.location.origin;
    this.conversationHistory = [];
  }
  
  async transcribeAudio(audioBlob) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await fetch(`${this.baseURL}/api/stt`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`STT failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }
  
  async getChatResponse(userMessage, streaming = false) {
    try {
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });
      
      // Keep history manageable
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }
      
      const messages = [
        { 
          role: 'system', 
          content: 'You are a helpful and friendly AI assistant. Keep responses concise and conversational, suitable for voice interaction.'
        },
        ...this.conversationHistory
      ];
      
      if (streaming) {
        return await this.streamChatResponse(messages);
      } else {
        const response = await fetch(`${this.baseURL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ messages, stream: false })
        });
        
        if (!response.ok) {
          throw new Error(`Chat failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        const assistantMessage = data.content;
        
        this.conversationHistory.push({
          role: 'assistant',
          content: assistantMessage
        });
        
        return assistantMessage;
      }
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  }
  
  async chat(conversationHistory) {
    try {
      const messages = [
        { 
          role: 'system', 
          content: 'You are a helpful and friendly AI assistant. Keep responses concise and conversational, suitable for voice interaction.'
        },
        ...conversationHistory
      ];
      
      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages, stream: false })
      });
      
      if (!response.ok) {
        throw new Error(`Chat failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return { 
        message: data.content,
        mood: data.mood,
        gesture: data.gesture
      };
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  }
  
  async streamChatResponse(messages) {
    // For streaming implementation
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages, stream: true })
    });
    
    if (!response.ok) {
      throw new Error(`Chat stream failed: ${response.statusText}`);
    }
    
    return response.body;
  }
  
  async textToSpeech(text, voice = 'alloy') {
    try {
      const response = await fetch(`${this.baseURL}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, voice })
      });
      
      if (!response.ok) {
        throw new Error(`TTS failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('TTS error:', error);
      throw error;
    }
  }
  
  async processVoiceChain(audioBlob) {
    try {
      const formData = new FormData();
      
      // Determine file extension based on blob type
      let fileName = 'recording.webm';
      let fileExtension = '.webm';
      
      if (audioBlob.type.includes('wav')) {
        fileName = 'recording.wav';
        fileExtension = '.wav';
      } else if (audioBlob.type.includes('webm')) {
        fileName = 'recording.webm';
        fileExtension = '.webm';
      } else if (audioBlob.type.includes('mp4')) {
        fileName = 'recording.mp4';
        fileExtension = '.mp4';
      } else if (audioBlob.type.includes('mpeg') || audioBlob.type.includes('mp3')) {
        fileName = 'recording.mp3';
        fileExtension = '.mp3';
      } else if (audioBlob.type.includes('ogg')) {
        fileName = 'recording.ogg';
        fileExtension = '.ogg';
      } else {
        console.warn('⚠️ Unknown audio type:', audioBlob.type, '- defaulting to .webm');
      }
      
      console.log(`📤 Sending audio: type=${audioBlob.type}, size=${audioBlob.size} bytes (${(audioBlob.size/1024).toFixed(2)}KB), fileName=${fileName}`);
      
      // Append the audio blob with correct filename
      formData.append('audio', audioBlob, fileName);
      formData.append('history', JSON.stringify(this.conversationHistory));
      
      const response = await fetch(`${this.baseURL}/api/voice-chain`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Voice chain failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update conversation history
      this.conversationHistory.push(
        { role: 'user', content: data.userMessage },
        { role: 'assistant', content: data.assistantMessage }
      );
      
      // Keep history manageable
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }
      
      return data;
    } catch (error) {
      console.error('Voice chain error:', error);
      throw error;
    }
  }
  
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseURL}/api/health`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Health check error:', error);
      return { status: 'error' };
    }
  }
  
  clearHistory() {
    this.conversationHistory = [];
  }
  
  getHistory() {
    return this.conversationHistory;
  }
}
