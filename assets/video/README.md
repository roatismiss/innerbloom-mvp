# Reel videos (AI avatars + future real footage)

Avatar / voiceover videos that play as full-screen background of a reel.
Same drop-and-go pattern as `assets/audio/`.

## Specs (from Creatify or similar)

- **Format**: mp4, H.264 codec
- **Aspect**: 9:16 (portrait) — 1080×1920 ideal; 720×1280 acceptable
- **Length**: 10–30s. Loops seamlessly — make sure the first and last frame
  match, otherwise the cut between loops is visible
- **Audio**: voiceover baked in. The app will mute the ambient loop on this
  reel automatically (voiceover takes priority over ambient pad)
- **File size**: target under 5MB (bundle weight matters). For longer clips,
  re-encode at lower bitrate

## How to add a new video reel

1. Save the mp4 here with a **kebab-case semantic name**, e.g.:
   - `depression-shutdown.mp4`
   - `anxiety-reframe.mp4`
   - `morning-grounding.mp4`

2. Register it in [src/lib/video/reel-video.ts](../../src/lib/video/reel-video.ts)
   (add a new key + `require()` line, same shape as `reel-audio.ts`)

3. Reference the key in any reel inside
   [src/app/(main)/reels.tsx](../../src/app/(main)/reels.tsx) via the
   `videoKey` field. When set, the reel renders the video full-screen and
   skips the ambient audio.

4. Restart Metro with `pnpm start --clear` — Metro caches `require()`
   resolutions.

## File naming

Match the script topic in the filename so we can grep later. Avoid spaces,
underscores, and date prefixes. Examples:

```
depression-shutdown.mp4    ✓
anxiety-pattern-interrupt.mp4    ✓
rest-permission.mp4    ✓

avatar1.mp4    ✗ (no meaning)
2026-05-27.mp4    ✗ (date doesn't help recall)
Anxiety Pattern.mp4    ✗ (space + caps will break some bundlers)
```
