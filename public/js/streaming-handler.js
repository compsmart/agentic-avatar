/**
 * StreamingHandler - Manages TalkingHead's streaming mode for
 * real-time PCM audio playback.
 *
 * Gemini Live API outputs 24 kHz 16-bit PCM audio.
 * TalkingHead's streamAudio() accepts ArrayBuffer/Int16Array.
 *
 * Lipsync is handled separately by the avatar-fix.js patch, which
 * reads real-time audio volume from TalkingHead's audioAnalyzerNode
 * and drives viseme (or mouthOpen) morph targets every animation frame.
 * This handler only needs to feed audio data to the worklet.
 */
export class StreamingHandler {
  constructor(avatarController) {
    this.controller = avatarController;
    this.head = avatarController.head;
    this.isStreamActive = false;
    this.streamReady = null;

    // Timing / stats
    this.totalAudioDurationMs = 0;
    this.audioChunkCount = 0;
    this.totalBytesReceived = 0;

    this.SAMPLE_RATE = 24000;
  }

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------

  /**
   * Start TalkingHead streaming mode (call once per Gemini session).
   */
  async startStream() {
    if (this.isStreamActive) {
      console.log('[STREAM] Already active, skipping startStream');
      return;
    }

    this._reset();

    try {
      console.log('[STREAM] Starting stream (24 kHz)...');

      this.streamReady = this.head.streamStart(
        {
          sampleRate: this.SAMPLE_RATE,
          lipsyncLang: 'en'
        },
        // onAudioStart — worklet started playing
        () => {
          console.log('[STREAM] Worklet playback STARTED');
          this.controller.isSpeaking = true;
        },
        // onAudioEnd — worklet drained
        () => {
          console.log(
            `[STREAM] Worklet playback ENDED — ` +
            `${this.audioChunkCount} chunks, ` +
            `${(this.totalAudioDurationMs / 1000).toFixed(1)}s audio`
          );
          this.controller.isSpeaking = false;
        },
        // onSubtitles
        (subtitle) => {
          this._updateSubtitles(subtitle);
        }
      );

      await this.streamReady;
      this.isStreamActive = true;
      console.log('[STREAM] READY');
    } catch (error) {
      console.error('[STREAM] Failed to start:', error);
      this.isStreamActive = false;
      throw error;
    }
  }

  /**
   * Feed a base64-encoded PCM audio chunk from Gemini to TalkingHead.
   * Audio is sent to the worklet for playback; lipsync is handled
   * separately by the avatar-fix animate patch.
   * @param {string} base64Data - Base64-encoded 16-bit PCM at 24 kHz
   */
  feedAudio(base64Data) {
    if (!this.isStreamActive) {
      console.warn('[STREAM] Not active, ignoring audio chunk');
      return;
    }

    try {
      // Decode base64 → Uint8Array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      this.audioChunkCount++;
      this.totalBytesReceived += bytes.length;

      const sampleCount = bytes.length / 2;
      const chunkDurationMs = (sampleCount / this.SAMPLE_RATE) * 1000;
      const chunkStartMs = this.totalAudioDurationMs;
      this.totalAudioDurationMs += chunkDurationMs;

      // Periodic logging
      if (this.audioChunkCount <= 3 || this.audioChunkCount % 50 === 0) {
        console.log(
          `[STREAM] #${this.audioChunkCount} ${chunkDurationMs.toFixed(0)}ms ` +
          `@${(chunkStartMs / 1000).toFixed(1)}s`
        );
      }

      // Send audio to TalkingHead worklet for playback
      this.head.streamAudio({ audio: bytes.buffer });
    } catch (error) {
      console.error('[STREAM] feedAudio error:', error);
    }
  }

  /**
   * Accept transcription text for display purposes.
   * Lipsync is driven by real-time audio analysis in avatar-fix.js.
   * @param {string} _text - Transcription fragment (unused here)
   */
  addText(_text) {
    // No-op: transcript display is handled by app.js appendToTranscript().
  }

  /**
   * Handle interruption.
   */
  interrupt() {
    if (!this.isStreamActive) return;
    console.log(`[STREAM] Interrupted at chunk #${this.audioChunkCount}`);
    this.head.streamInterrupt();
    this._reset();
  }

  /**
   * Stop streaming mode entirely.
   */
  stopStream() {
    if (!this.isStreamActive) return;
    console.log(
      `[STREAM] Stopping. ${this.audioChunkCount} chunks, ` +
      `${(this.totalAudioDurationMs / 1000).toFixed(1)}s`
    );
    this.head.streamStop();
    this.isStreamActive = false;
    this._reset();
    this._clearSubtitles();
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  _reset() {
    this.audioChunkCount = 0;
    this.totalBytesReceived = 0;
    this.totalAudioDurationMs = 0;
  }

  _updateSubtitles(text) {
    const el = document.getElementById('subtitles');
    if (el) el.textContent = text;
  }

  _clearSubtitles() {
    const el = document.getElementById('subtitles');
    if (el) el.textContent = '';
  }
}
