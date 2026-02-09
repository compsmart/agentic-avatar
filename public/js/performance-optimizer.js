export class PerformanceOptimizer {
  static getDeviceCapabilities() {
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const memory = navigator.deviceMemory || 4;
    
    return {
      cores: hardwareConcurrency,
      memory: memory,
      isLowEnd: hardwareConcurrency <= 2 || memory <= 4,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    };
  }
  
  static optimizeAvatarSettings() {
    const device = this.getDeviceCapabilities();
    
    // Adjust quality based on device capabilities
    return {
      modelPixelRatio: device.isLowEnd ? 0.5 : (device.isMobile ? 0.75 : 1),
      modelFPS: device.isLowEnd ? 15 : (device.isMobile ? 24 : 30),
      lightAmbientIntensity: device.isLowEnd ? 1 : 2,
      cameraRotateEnable: !device.isLowEnd,
      avatarQuality: device.isLowEnd ? 'low' : (device.isMobile ? 'medium' : 'high')
    };
  }
  
  static enableAudioWorklet() {
    // Check if AudioWorklet is supported for better performance
    return 'AudioWorklet' in window;
  }
  
  static createCache(maxSize = 100) {
    const cache = new Map();
    
    return {
      set: (key, value) => {
        if (cache.size >= maxSize) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        cache.set(key, value);
      },
      get: (key) => cache.get(key),
      has: (key) => cache.has(key),
      clear: () => cache.clear(),
      size: () => cache.size
    };
  }
  
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  static measurePerformance(label, callback) {
    const start = performance.now();
    const result = callback();
    const end = performance.now();
    
    console.log(`⚡ ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  }
  
  static async measureAsyncPerformance(label, callback) {
    const start = performance.now();
    const result = await callback();
    const end = performance.now();
    
    console.log(`⚡ ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  }
  
  static monitorMemory() {
    if (performance.memory) {
      const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
      const total = Math.round(performance.memory.totalJSHeapSize / 1048576);
      console.log(`💾 Memory: ${used}MB / ${total}MB`);
      return { used, total };
    }
    return null;
  }
  
  static requestIdleCallback(callback, options) {
    if ('requestIdleCallback' in window) {
      return window.requestIdleCallback(callback, options);
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      return setTimeout(callback, 1);
    }
  }
  
  static preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
  
  static preloadAudio(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.oncanplaythrough = () => resolve(audio);
      audio.onerror = reject;
      audio.src = url;
    });
  }
}
