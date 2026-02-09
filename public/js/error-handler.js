export class ErrorHandler {
  static handle(error, context = 'Application') {
    console.error(`Error in ${context}:`, error);
    
    // User-friendly error messages
    const messages = {
      'microphone_access': 'Please allow microphone access to use voice features',
      'network_error': 'Connection lost. Please check your internet connection',
      'avatar_load': 'Failed to load avatar. Please refresh the page',
      'api_error': 'Service temporarily unavailable. Please try again',
      'audio_playback': 'Failed to play audio. Please check your audio settings',
      'websocket_error': 'Real-time connection failed. Using fallback mode'
    };
    
    const errorType = this.categorizeError(error);
    const message = messages[errorType] || `An unexpected error occurred: ${error.message}`;
    
    this.showUserMessage(message, 'error');
    
    // Log to monitoring service if available
    this.logError(error, context);
    
    return { type: errorType, message };
  }
  
  static categorizeError(error) {
    if (error.name === 'NotAllowedError' || error.name === 'NotFoundError') {
      return 'microphone_access';
    }
    if (error.message && error.message.includes('network')) {
      return 'network_error';
    }
    if (error.message && error.message.includes('avatar')) {
      return 'avatar_load';
    }
    if (error.message && error.message.includes('WebSocket')) {
      return 'websocket_error';
    }
    if (error.message && error.message.includes('audio')) {
      return 'audio_playback';
    }
    return 'api_error';
  }
  
  static showUserMessage(message, type = 'error') {
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    
    if (errorContainer && errorMessage) {
      errorMessage.textContent = message;
      errorContainer.classList.remove('hidden');
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorContainer.classList.add('hidden');
      }, 5000);
    } else {
      // Fallback to console
      console.error(message);
    }
  }
  
  static showSuccess(message) {
    // Create a success notification
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1001;
      animation: slideIn 0.3s ease;
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      successDiv.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => successDiv.remove(), 300);
    }, 3000);
  }
  
  static logError(error, context) {
    // Send to monitoring service (e.g., Sentry, LogRocket)
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        tags: { context }
      });
    }
    
    // Also log to console in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.group(`🚨 Error in ${context}`);
      console.error('Error:', error);
      console.trace();
      console.groupEnd();
    }
  }
  
  static clearErrors() {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.classList.add('hidden');
    }
  }
}

// Setup close button handler
document.addEventListener('DOMContentLoaded', () => {
  const closeButton = document.getElementById('close-error');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      ErrorHandler.clearErrors();
    });
  }
});
