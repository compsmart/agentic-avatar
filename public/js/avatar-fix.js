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
  
  // Replace with safe version
  talkingHead.animate = function(delta) {
    try {
      // Only call animate if avatar is ready
      if (this.nodeAvatar && this.nodeAvatar.visible) {
        originalAnimate(delta);
      }
    } catch (error) {
      // Silently ignore animation errors during initialization
      if (this.nodeAvatar && this.nodeAvatar.visible) {
        console.warn('Animation error:', error);
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
