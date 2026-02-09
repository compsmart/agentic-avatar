/**
 * Animation Library Configuration
 * 
 * This file defines all available FBX animations for the avatar.
 * Animations are loaded from the /animations directory.
 * 
 * Each animation should have:
 * - name: Unique identifier (lowercase, no spaces)
 * - file: FBX filename in /animations directory
 * - duration: Default duration in seconds
 * - description: What the animation does
 * - category: Group (greeting, emotion, action, etc.)
 * - useCase: When AI should use this animation
 */

export const animationLibrary = [
  {
    name: 'waving',
    file: 'Waving.fbx',
    duration: 3,
    description: 'Friendly waving gesture',
    category: 'greeting',
    useCase: 'Saying hello, goodbye, getting attention, greeting someone'
  },
  {
    name: 'breakdance',
    file: 'Breakdance 1990.fbx',
    duration: 8,
    description: 'Energetic breakdancing moves from the 1990s',
    category: 'celebration',
    useCase: 'Extreme celebration, party mood, showing off, having fun, dancing, when user asks to dance or breakdance'
  },
  {
    name: 'cheering',
    file: 'Cheering.fbx',
    duration: 4,
    description: 'Enthusiastic cheering with raised arms',
    category: 'celebration',
    useCase: 'Celebrating success, cheering for someone, showing support, excitement'
  },
  {
    name: 'clapping',
    file: 'Clapping.fbx',
    duration: 3,
    description: 'Applause and clapping hands',
    category: 'celebration',
    useCase: 'Applause, appreciation, congratulations, approval, showing support'
  },
  {
    name: 'defeated',
    file: 'Defeated.fbx',
    duration: 5,
    description: 'Dejected, sad, defeated posture',
    category: 'emotion',
    useCase: 'Bad news, disappointment, sadness, failure, empathy, feeling down'
  },
  {
    name: 'joyful',
    file: 'Joyful Jump.fbx',
    duration: 4,
    description: 'Joyful jumping with excitement',
    category: 'celebration',
    useCase: 'Great news, celebration, excitement, achievement, happiness, success'
  },
  {
    name: 'looking',
    file: 'Looking.fbx',
    duration: 4,
    description: 'Looking around curiously',
    category: 'action',
    useCase: 'Searching for something, being curious, exploring, thinking, considering options'
  },
  {
    name: 'pointing',
    file: 'Pointing.fbx',
    duration: 3,
    description: 'Pointing at something with emphasis',
    category: 'action',
    useCase: 'Indicating direction, emphasizing a point, drawing attention to something, explaining'
  },
  {
    name: 'praying',
    file: 'Praying.fbx',
    duration: 5,
    description: 'Praying or meditation pose',
    category: 'gesture',
    useCase: 'Gratitude, hope, meditation, spirituality, thankfulness, prayer'
  },
  {
    name: 'victory',
    file: 'Victory.fbx',
    duration: 4,
    description: 'Victory pose with triumphant gesture',
    category: 'celebration',
    useCase: 'Winning, achievement, success, triumph, completing a goal, victory'
  }
];

/**
 * Get animation configuration by name
 */
export function getAnimation(name) {
  return animationLibrary.find(anim => anim.name === name);
}

/**
 * Get all animation names
 */
export function getAnimationNames() {
  return animationLibrary.map(anim => anim.name);
}

/**
 * Get animations by category
 */
export function getAnimationsByCategory(category) {
  return animationLibrary.filter(anim => anim.category === category);
}

/**
 * Format animation list for AI system prompt
 */
export function getAnimationPromptText() {
  const animations = animationLibrary.map(anim => {
    return `  - ${anim.name}: ${anim.description} (${anim.useCase})`;
  }).join('\n');
  
  return `Available animations: ${getAnimationNames().join(', ')}\n${animations}`;
}

/**
 * Get animation categories
 */
export function getCategories() {
  return [...new Set(animationLibrary.map(anim => anim.category))];
}

// Expose to window for non-module access
if (typeof window !== 'undefined') {
  window.animationLibrary = {
    library: animationLibrary,
    getAnimation,
    getAnimationNames,
    getAnimationsByCategory,
    getAnimationPromptText,
    getCategories
  };
  console.log('✅ Animation library loaded:', getAnimationNames());
}
