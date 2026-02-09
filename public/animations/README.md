# Avatar Animations

This directory contains FBX animation files for the avatar.

## 📁 Directory Structure

```
animations/
├── README.md          (this file)
├── walking.fbx        (walking animation)
├── dancing.fbx        (dancing animation)
└── ...more animations
```

## 🎬 Adding New Animations from Mixamo

### Step 1: Get Animation from Mixamo
1. Go to [https://www.mixamo.com/](https://www.mixamo.com/)
2. Sign in with Adobe account (free)
3. Browse animations library
4. Select your desired animation
5. Click "Download"

### Step 2: Download Settings
Use these settings when downloading:
- **Format:** FBX Binary (.fbx)
- **Skin:** Without Skin
- **Frames per second:** 30
- **Keyframe Reduction:** None

### Step 3: Add to Project
1. Download the FBX file
2. Rename it to something descriptive (lowercase, no spaces)
   - Example: `Waving.fbx` → `waving.fbx`
3. Copy the file to this `public/animations/` directory

### Step 4: Update Animation Config
Edit `public/js/animation-library.js` and add your animation:

```javascript
{
  name: 'waving',
  file: 'waving.fbx',
  duration: 3,
  description: 'Friendly wave gesture',
  category: 'greeting',
  useCase: 'Saying hello or goodbye'
}
```

### Step 5: Update System Prompt
Add the animation to the AI's system prompt in `server/server.js`:

```javascript
Available animations: walking, dancing, waving, sitting, ...
  - waving: Friendly wave gesture (greeting, farewell)
```

## 🎯 Recommended Animations

### Essential Set (Start Here)
- **walking** - Basic walking motion
- **idle** - Standing idle/breathing
- **sitting** - Sitting down
- **standing** - Standing up
- **waving** - Wave hello/goodbye

### Emotional Expressions
- **dancing** - Happy celebration dance
- **clapping** - Applause/celebration
- **thinking** - Thoughtful pose with hand on chin
- **excited** - Excited jumping/celebration
- **sad** - Dejected/sad posture

### Actions
- **pointing** - Pointing at something
- **presenting** - Presenting with open arms
- **typing** - Typing on keyboard
- **looking** - Looking around
- **nodding** - Nodding head yes

### Professional
- **talking** - Speaking gestures
- **explaining** - Expressive explaining
- **agreeing** - Nodding in agreement
- **disagreeing** - Head shake no

## 🔧 Technical Notes

### Animation Properties
- **Scale:** Mixamo animations use `scale=0.01` (default)
- **Duration:** Specify in seconds (e.g., `dur=5`)
- **Index:** Most animations use `ndx=0` (first animation in file)
- **Loop:** Animations loop automatically for the duration

### File Size Tips
- Keep animations short (2-10 seconds)
- Use keyframe reduction in Mixamo if file too large
- Typical FBX file: 50KB - 500KB

### Compatibility
- Works with Ready Player Me avatars
- Works with any Mixamo-compatible rig
- Requires Three.js FBXLoader (already included)

## 📖 Usage Examples

### From Code
```javascript
// Play walking animation for 10 seconds
await avatarController.playAnimation('walking', 10);

// Play dancing for 5 seconds
await avatarController.playAnimation('dancing', 5);

// Stop current animation
avatarController.stopAnimation();
```

### From AI Response
```
User: "Can you show me a dance?"
AI: [MOOD:happy] [ANIMATION:dancing] Here's a fun dance for you!
```

## 🎨 Animation Categories

Organize your animations by category:

- **greeting** - Waving, handshake, bow
- **emotion** - Happy, sad, excited, angry
- **action** - Walking, running, jumping, sitting
- **work** - Typing, writing, thinking
- **sport** - Running, jumping, exercising
- **dance** - Various dance styles
- **gesture** - Pointing, presenting, shrugging

## ⚠️ Important Notes

1. **Copyright:** Mixamo animations are free for personal/commercial use, but:
   - Cannot redistribute raw animation files
   - Cannot use to train ML models
   - Must be integrated into your project

2. **File Names:** Use lowercase, no spaces
   - ✅ Good: `walking.fbx`, `happy_dance.fbx`
   - ❌ Bad: `Walking.fbx`, `Happy Dance.fbx`

3. **Testing:** Always test new animations before adding to AI prompt
   ```javascript
   app.avatarController.playAnimation('your-new-animation', 5);
   ```

## 🐛 Troubleshooting

### Animation doesn't play
- Check console for errors
- Verify file name matches exactly (case-sensitive on some servers)
- Ensure file is in `public/animations/` directory
- Check that FBX is Mixamo format with correct settings

### Animation looks wrong
- Check scale parameter (should be 0.01 for Mixamo)
- Verify animation was downloaded "Without Skin"
- Try different animation from Mixamo

### Animation too fast/slow
- Adjust duration parameter
- Re-download from Mixamo with different FPS

## 📚 Resources

- **Mixamo:** https://www.mixamo.com/
- **TalkingHead Docs:** https://github.com/met4citizen/TalkingHead
- **Three.js FBXLoader:** https://threejs.org/docs/#examples/en/loaders/FBXLoader
- **Ready Player Me:** https://readyplayer.me/

---

**Last Updated:** October 19, 2025  
**Status:** Ready for animations! 🎬
