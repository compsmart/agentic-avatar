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
  // === Greetings ===
  {
    name: 'waving',
    file: 'Waving.fbx',
    duration: 3,
    description: 'Friendly waving gesture',
    category: 'greeting',
    useCase: 'Saying hello, goodbye, getting attention, greeting someone'
  },
  {
    name: 'acknowledging',
    file: 'acknowledging.fbx',
    duration: 3,
    description: 'Acknowledging nod or gesture',
    category: 'greeting',
    useCase: 'Acknowledging someone, agreeing casually, nodding in recognition'
  },
  {
    name: 'salute',
    file: 'salute.fbx',
    duration: 3,
    description: 'Military-style salute',
    category: 'greeting',
    useCase: 'Formal greeting, showing respect, yes sir, at your service'
  },

  // === Conversation ===
  {
    name: 'asking_question',
    file: 'asking_question.fbx',
    duration: 4,
    description: 'Questioning pose with open hands',
    category: 'conversation',
    useCase: 'Asking a question, wondering, seeking clarification, curious inquiry'
  },
  {
    name: 'head_nod_yes',
    file: 'head_nod_yes.fbx',
    duration: 3,
    description: 'Nodding head yes in agreement',
    category: 'conversation',
    useCase: 'Agreeing, confirming, saying yes, approval, understanding'
  },
  {
    name: 'shaking_head_no',
    file: 'shaking_head_no.fbx',
    duration: 3,
    description: 'Shaking head no in disagreement',
    category: 'conversation',
    useCase: 'Disagreeing, saying no, denying, refusing, disapproval'
  },
  {
    name: 'talking',
    file: 'talking.fbx',
    duration: 4,
    description: 'Animated talking with hand gestures',
    category: 'conversation',
    useCase: 'Explaining something, having a conversation, telling a story'
  },
  {
    name: 'thinking',
    file: 'thinking.fbx',
    duration: 4,
    description: 'Thoughtful pose with hand on chin',
    category: 'conversation',
    useCase: 'Pondering, considering options, deep thought, contemplating'
  },

  // === Celebration ===
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
    name: 'joyful',
    file: 'Joyful Jump.fbx',
    duration: 4,
    description: 'Joyful jumping with excitement',
    category: 'celebration',
    useCase: 'Great news, celebration, excitement, achievement, happiness, success'
  },
  {
    name: 'victory',
    file: 'Victory.fbx',
    duration: 4,
    description: 'Victory pose with triumphant gesture',
    category: 'celebration',
    useCase: 'Winning, achievement, success, triumph, completing a goal, victory'
  },
  {
    name: 'fist_pump',
    file: 'fist_pump.fbx',
    duration: 3,
    description: 'Fist pump celebration',
    category: 'celebration',
    useCase: 'Yes! moment, small victory, pumped up, self-congratulation'
  },

  // === Dance ===
  {
    name: 'breakdance',
    file: 'Breakdance 1990.fbx',
    duration: 8,
    description: 'Energetic breakdancing moves',
    category: 'dance',
    useCase: 'Breakdancing, showing off, party, extreme celebration'
  },
  {
    name: 'dancing',
    file: 'dancing.fbx',
    duration: 6,
    description: 'General fun dancing',
    category: 'dance',
    useCase: 'Dancing, having fun, party, celebration, when asked to dance'
  },
  {
    name: 'belly_dance',
    file: 'belly_dance.fbx',
    duration: 8,
    description: 'Belly dance moves',
    category: 'dance',
    useCase: 'Belly dancing, exotic dance, Middle Eastern dance, playful dancing'
  },
  {
    name: 'gangnam_style',
    file: 'gangnam_style.fbx',
    duration: 8,
    description: 'Gangnam Style dance moves',
    category: 'dance',
    useCase: 'Gangnam Style, K-pop dance, funny dance, meme dance, viral dance'
  },
  {
    name: 'moonwalk',
    file: 'moonwalk.fbx',
    duration: 4,
    description: 'Michael Jackson moonwalk',
    category: 'dance',
    useCase: 'Moonwalk, smooth moves, Michael Jackson, retro dance, cool dance'
  },

  // === Emotion (Positive) ===
  {
    name: 'excited',
    file: 'excited.fbx',
    duration: 4,
    description: 'Excited jumping and bouncing',
    category: 'emotion',
    useCase: 'Very excited, thrilled, eager, cant wait, pumped up'
  },
  {
    name: 'happy_idle',
    file: 'happy_idle.fbx',
    duration: 4,
    description: 'Happy swaying and fidgeting',
    category: 'emotion',
    useCase: 'Content, happy, cheerful mood, feeling good, pleasant idle'
  },
  {
    name: 'laughing',
    file: 'laughing.fbx',
    duration: 5,
    description: 'Laughing heartily',
    category: 'emotion',
    useCase: 'Something funny, laughing, joke reaction, hilarious, LOL'
  },

  // === Emotion (Negative) ===
  {
    name: 'defeated',
    file: 'Defeated.fbx',
    duration: 5,
    description: 'Dejected, sad, defeated posture',
    category: 'emotion',
    useCase: 'Bad news, disappointment, sadness, failure, empathy, feeling down'
  },
  {
    name: 'agony',
    file: 'agony.fbx',
    duration: 4,
    description: 'In pain or extreme frustration',
    category: 'emotion',
    useCase: 'Extreme frustration, pain, suffering, anguish, terrible news'
  },
  {
    name: 'angry',
    file: 'angry.fbx',
    duration: 5,
    description: 'Angry stomping and gesturing',
    category: 'emotion',
    useCase: 'Anger, rage, furious, outraged, fed up, losing temper'
  },
  {
    name: 'crying',
    file: 'crying.fbx',
    duration: 5,
    description: 'Crying and sobbing',
    category: 'emotion',
    useCase: 'Crying, very sad, tearful, emotional, heartbroken, moved to tears'
  },
  {
    name: 'disappointed',
    file: 'disappointed.fbx',
    duration: 4,
    description: 'Disappointed slumping gesture',
    category: 'emotion',
    useCase: 'Let down, disappointed, underwhelmed, not what was hoped for'
  },
  {
    name: 'defeat',
    file: 'defeat.fbx',
    duration: 4,
    description: 'Dropping to knees in defeat',
    category: 'emotion',
    useCase: 'Total defeat, giving up, overwhelming loss, crushed'
  },
  {
    name: 'yelling',
    file: 'yelling.fbx',
    duration: 4,
    description: 'Yelling and shouting',
    category: 'emotion',
    useCase: 'Shouting, yelling, calling out, loud expression, venting'
  },

  // === Actions ===
  {
    name: 'looking',
    file: 'Looking.fbx',
    duration: 4,
    description: 'Looking around curiously',
    category: 'action',
    useCase: 'Searching for something, being curious, exploring, considering options'
  },
  {
    name: 'looking_around',
    file: 'looking_around.fbx',
    duration: 4,
    description: 'Looking around in all directions',
    category: 'action',
    useCase: 'Surveying surroundings, cautious, checking, scanning the area'
  },
  {
    name: 'pointing',
    file: 'Pointing.fbx',
    duration: 3,
    description: 'Pointing at something with emphasis',
    category: 'action',
    useCase: 'Indicating direction, emphasizing a point, drawing attention to something'
  },
  {
    name: 'backflip',
    file: 'backflip.fbx',
    duration: 3,
    description: 'Acrobatic backflip',
    category: 'action',
    useCase: 'Showing off, acrobatics, impressive move, parkour, trick'
  },
  {
    name: 'jump',
    file: 'jump.fbx',
    duration: 2,
    description: 'Simple jump in the air',
    category: 'action',
    useCase: 'Jumping, hopping, getting over something, light excitement'
  },
  {
    name: 'getting_up',
    file: 'getting_up.fbx',
    duration: 3,
    description: 'Getting up from the ground',
    category: 'action',
    useCase: 'Standing up, recovering, getting back on feet, rising up'
  },
  {
    name: 'falling',
    file: 'falling.fbx',
    duration: 3,
    description: 'Falling down',
    category: 'action',
    useCase: 'Falling over, losing balance, dramatic fall, collapsing'
  },
  {
    name: 'death',
    file: 'death.fbx',
    duration: 4,
    description: 'Dramatic death fall',
    category: 'action',
    useCase: 'Dramatic death scene, playing dead, over-dramatic reaction, I cant even'
  },
  {
    name: 'sneaking_forward',
    file: 'sneaking_forward.fbx',
    duration: 4,
    description: 'Sneaking forward stealthily',
    category: 'action',
    useCase: 'Sneaking, being stealthy, tiptoeing, quiet movement, spy mode'
  },

  // === Gesture ===
  {
    name: 'praying',
    file: 'Praying.fbx',
    duration: 5,
    description: 'Praying or meditation pose',
    category: 'gesture',
    useCase: 'Gratitude, hope, meditation, spirituality, thankfulness, prayer'
  },

  // === Combat ===
  {
    name: 'blocking',
    file: 'blocking.fbx',
    duration: 3,
    description: 'Defensive blocking stance',
    category: 'combat',
    useCase: 'Defending, blocking, protecting, shield up, not listening'
  },
  {
    name: 'dodging',
    file: 'dodging.fbx',
    duration: 3,
    description: 'Quick dodge to the side',
    category: 'combat',
    useCase: 'Dodging, avoiding, ducking, evading, close call'
  },
  {
    name: 'fight_idle',
    file: 'fight_idle.fbx',
    duration: 4,
    description: 'Ready fighting stance',
    category: 'combat',
    useCase: 'Ready to fight, bring it on, challenging, confrontational'
  },
  {
    name: 'hit_reaction',
    file: 'hit_reaction.fbx',
    duration: 2,
    description: 'Reacting to getting hit',
    category: 'combat',
    useCase: 'Getting hit, taking damage, ouch, that hurt, recoil'
  },
  {
    name: 'kicking',
    file: 'kicking.fbx',
    duration: 2,
    description: 'Powerful kick',
    category: 'combat',
    useCase: 'Kicking, martial arts, attack, fighting, take that'
  },
  {
    name: 'punching',
    file: 'punching.fbx',
    duration: 2,
    description: 'Punching forward',
    category: 'combat',
    useCase: 'Punching, fighting, boxing, attack, pow'
  },

  // === Locomotion ===
  {
    name: 'walking',
    file: 'walking.fbx',
    duration: 4,
    description: 'Normal walking',
    category: 'locomotion',
    useCase: 'Walking, strolling, casual movement, going somewhere'
  },
  {
    name: 'running',
    file: 'running.fbx',
    duration: 3,
    description: 'Running fast',
    category: 'locomotion',
    useCase: 'Running, rushing, hurrying, sprint, gotta go fast'
  },
  {
    name: 'jogging',
    file: 'jogging.fbx',
    duration: 4,
    description: 'Light jogging',
    category: 'locomotion',
    useCase: 'Jogging, light run, exercise, warming up'
  },
  {
    name: 'happy_walk',
    file: 'happy_walk.fbx',
    duration: 3,
    description: 'Walking happily with a bounce',
    category: 'locomotion',
    useCase: 'Happy walking, skipping along, good mood walk, cheerful stroll'
  },
  {
    name: 'sad_walk',
    file: 'sad_walk.fbx',
    duration: 3,
    description: 'Walking sadly with slumped shoulders',
    category: 'locomotion',
    useCase: 'Sad walking, dejected walk, walking away sadly, moping'
  },
  {
    name: 'crouch_walk',
    file: 'crouch_walk.fbx',
    duration: 3,
    description: 'Walking while crouched',
    category: 'locomotion',
    useCase: 'Sneaking walk, crouching, staying low, stealth movement'
  },

  // === Idle/Pose ===
  {
    name: 'idle',
    file: 'idle.fbx',
    duration: 5,
    description: 'Neutral standing idle',
    category: 'idle',
    useCase: 'Standing still, waiting, default pose, resting'
  },
  {
    name: 'crouch_idle',
    file: 'crouch_idle.fbx',
    duration: 4,
    description: 'Crouching idle position',
    category: 'idle',
    useCase: 'Crouching, hiding, staying low, duck and cover'
  },
  {
    name: 'sitting_idle',
    file: 'sitting_idle.fbx',
    duration: 5,
    description: 'Sitting casually',
    category: 'idle',
    useCase: 'Sitting down, taking a break, relaxing, resting'
  },
  {
    name: 'kneeling_idle',
    file: 'kneeling_idle.fbx',
    duration: 4,
    description: 'Kneeling on one knee',
    category: 'idle',
    useCase: 'Kneeling, proposing, showing respect, bowing down'
  },

  // === Exercise ===
  {
    name: 'jumping_jacks',
    file: 'jumping_jacks.fbx',
    duration: 4,
    description: 'Jumping jacks exercise',
    category: 'exercise',
    useCase: 'Exercise, workout, warming up, jumping jacks, fitness'
  },
  {
    name: 'push_up',
    file: 'push_up.fbx',
    duration: 4,
    description: 'Doing push-ups',
    category: 'exercise',
    useCase: 'Push-ups, exercise, showing strength, workout, fitness'
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
  console.log('✅ Animation library loaded:', getAnimationNames().length, 'animations');
}
