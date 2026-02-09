// TalkingHead Avatar Fix
// This file provides additional error handling and initialization helpers

export function waitForAvatarReady(talkingHead, maxWaitMs = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let checkCount = 0;
    
    const checkReady = () => {
      checkCount++;
      
      // Check if avatar has necessary properties
      const hasAvatar = talkingHead.nodeAvatar !== undefined;
      const isVisible = hasAvatar && talkingHead.nodeAvatar.visible;
      const hasMixer = talkingHead.mixer !== undefined;
      
      console.log(`Avatar ready check #${checkCount}: hasAvatar=${hasAvatar}, isVisible=${isVisible}, hasMixer=${hasMixer}`);
      
      // More lenient check - just need avatar to exist
      if (hasAvatar) {
        console.log('✅ Avatar node exists, considering ready');
        resolve(true);
        return;
      }
      
      // Timeout check
      if (Date.now() - startTime > maxWaitMs) {
        console.warn('Avatar ready check timed out, but proceeding anyway');
        resolve(false); // Resolve instead of reject to allow app to continue
        return;
      }
      
      // Check again in 100ms
      setTimeout(checkReady, 100);
    };
    
    checkReady();
  });
}

export function patchTalkingHeadAnimate(talkingHead) {
  // Store original animate method
  const originalAnimate = talkingHead.animate.bind(talkingHead);

  // Track logged errors to avoid spam
  const loggedErrors = new Set();

  // --- Lipsync mode detection (lazy, after model loads) ---
  // 'viseme'    → model has viseme_aa etc. — drive visemes from audio volume
  // 'mouthOpen' → model only has mouthOpen  — drive mouthOpen from audio volume
  // 'none'      → no usable morph targets
  let lipsyncMode = null; // null = not detected yet

  // Smoothed volume value (persists across frames)
  let smoothVol = 0;

  // Secondary-viseme rotation for subtle variety
  const SECONDARY_VISEMES = ['E', 'O', 'I', 'U'];
  let secondaryIdx = 0;
  let secondaryTimer = 0;

  // Replace with safe version
  talkingHead.animate = function(delta) {
    try {
      if (!(this.nodeAvatar && this.nodeAvatar.visible)) return;

      // --- One-time detection ---
      if (lipsyncMode === null && this.mtAvatar) {
        if (this.mtAvatar.viseme_aa) {
          lipsyncMode = 'viseme';
          console.log('[AVATAR-FIX] Viseme blend shapes detected — audio-reactive viseme lipsync enabled');
        } else if (this.mtAvatar.mouthOpen) {
          lipsyncMode = 'mouthOpen';
          console.log('[AVATAR-FIX] No viseme blend shapes — audio-reactive mouthOpen fallback enabled');
        } else {
          lipsyncMode = 'none';
          console.log('[AVATAR-FIX] No lipsync morph targets found on this model');
        }
      }

      // --- Pre-animate: drive lips from real-time audio volume ---
      if (lipsyncMode !== 'none' && lipsyncMode !== null) {
        const speaking = this.isSpeaking;

        if (speaking) {
          // Read peak volume from the audio analyzer
          let vol = 0;
          if (this.audioAnalyzerNode && this.volumeFrequencyData) {
            this.audioAnalyzerNode.getByteFrequencyData(this.volumeFrequencyData);
            for (let i = 2; i < 10; i++) {
              if (this.volumeFrequencyData[i] > vol) vol = this.volumeFrequencyData[i];
            }
          }

          // Smooth the volume (40% previous + 60% new for responsiveness)
          const rawTarget = Math.min(1.0, vol / 170);
          smoothVol = smoothVol * 0.4 + rawTarget * 0.6;

          if (lipsyncMode === 'viseme') {
            // --- Drive viseme blend shapes ---
            // Primary: viseme_aa at full amplitude (jaw open)
            const aa = this.mtAvatar.viseme_aa;
            aa.realtime = smoothVol * 0.85;
            aa.needsUpdate = true;

            // Rotate a secondary viseme every ~120 ms for shape variety
            secondaryTimer += (typeof delta === 'number' && delta > 0 && delta < 200) ? delta : 16;
            if (secondaryTimer > 120) {
              secondaryTimer = 0;
              secondaryIdx = (secondaryIdx + 1) % SECONDARY_VISEMES.length;
            }

            // Set secondary viseme at lower intensity
            for (let i = 0; i < SECONDARY_VISEMES.length; i++) {
              const key = 'viseme_' + SECONDARY_VISEMES[i];
              const mt = this.mtAvatar[key];
              if (mt) {
                if (i === secondaryIdx) {
                  mt.realtime = smoothVol * 0.35;
                } else {
                  mt.realtime = 0;
                }
                mt.needsUpdate = true;
              }
            }
          } else {
            // --- mouthOpen fallback ---
            const mt = this.mtAvatar.mouthOpen;
            mt.realtime = smoothVol;
            mt.needsUpdate = true;
          }
        } else {
          // Not speaking — clear all realtime overrides so mouth closes naturally
          if (smoothVol > 0.001) {
            smoothVol *= 0.7; // Fade out over several frames
          } else {
            smoothVol = 0;
          }

          if (lipsyncMode === 'viseme') {
            const aa = this.mtAvatar.viseme_aa;
            if (aa.realtime !== null) {
              if (smoothVol > 0.001) {
                aa.realtime = smoothVol * 0.85;
                aa.needsUpdate = true;
              } else {
                aa.realtime = null;
                aa.needsUpdate = true;
              }
            }
            for (const v of SECONDARY_VISEMES) {
              const mt = this.mtAvatar['viseme_' + v];
              if (mt && mt.realtime !== null) {
                mt.realtime = null;
                mt.needsUpdate = true;
              }
            }
          } else {
            const mt = this.mtAvatar.mouthOpen;
            if (mt.realtime !== null) {
              if (smoothVol > 0.001) {
                mt.realtime = smoothVol;
                mt.needsUpdate = true;
              } else {
                mt.realtime = null;
                mt.needsUpdate = true;
              }
            }
          }
        }
      }

      // --- Run original animate (processes animQueue, morphs, render) ---
      originalAnimate(delta);

    } catch (error) {
      const errorKey = error.message || String(error);
      if (!loggedErrors.has(errorKey)) {
        loggedErrors.add(errorKey);
        console.warn('Animation error (suppressing further repeats):', error);
      }
    }
  };
}

export function addAvatarEventListeners(talkingHead, callbacks = {}) {
  // Add event listeners for avatar state changes
  const originalShowAvatar = talkingHead.showAvatar.bind(talkingHead);
  
  talkingHead.showAvatar = async function(...args) {
    try {
      if (callbacks.onBeforeLoad) callbacks.onBeforeLoad();
      
      const result = await originalShowAvatar(...args);
      
      if (callbacks.onAfterLoad) callbacks.onAfterLoad();
      
      return result;
    } catch (error) {
      if (callbacks.onError) callbacks.onError(error);
      throw error;
    }
  };
}
