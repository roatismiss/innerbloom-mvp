# Reel ambient loops

The reels feed plays a soft ambient loop behind each card. The DB stores only
a key (`ambient | rainforest | calm_wind | fireplace`) and the client maps it
to a bundled mp3 via [src/lib/audio/reel-audio.ts](../../src/lib/audio/reel-audio.ts).

## Drop the files in this folder

Required filenames (exact — the registry uses these paths):

| File                       | Vibe                                       |
| -------------------------- | ------------------------------------------ |
| `ambient.mp3`              | Warm tonal pad, no rhythm, no melody       |
| `rainforest.mp3`           | Steady rain + distant birds, no thunder    |
| `calm_wind.mp3`            | Soft breeze through leaves, no gusts       |
| `fireplace.mp3`            | Close crackle, no logs shifting/clunking   |

## Specs

- **Format**: mp3, 128–160 kbps (we don't need lossless for ambient)
- **Length**: 30–90 seconds each. They loop — pick a clip whose **first and
  last second are similar** so the seam is inaudible.
- **Channels**: mono is fine, stereo is fine. Don't ship 5.1.
- **Loudness**: aim for **-20 LUFS integrated**. Quieter than music apps on
  purpose — these sit *under* a quote, never compete with it.
- **No transients**: no thunder, no door slams, no crow caws, no log-pop in
  the fireplace track. A sudden sound while someone reads a vulnerability
  prompt is a UX failure.

## Where to source

All four can be free + license-clean from:

- **Pixabay** (pixabay.com/sound-effects) — CC0, no attribution required
- **Mixkit** (mixkit.co/free-sound-effects) — free, no attribution required
- **Freesound** (freesound.org) — filter to CC0 only; CC-BY needs attribution

Search terms that work well:

- `ambient`     → "warm pad ambient loop", "drone ambient meditation"
- `rainforest`  → "light rain loop", "soft rain on leaves"
- `calm_wind`   → "gentle wind", "soft breeze ambient"
- `fireplace`   → "fireplace crackle loop", "campfire ambience"

## After dropping the files in

1. Open [src/lib/audio/reel-audio.ts](../../src/lib/audio/reel-audio.ts)
2. Uncomment the four `require(...)` lines (search `TODO: enable audio`)
3. Restart Metro (`pnpm start --clear`) — Metro caches require resolutions

Until step 2 is done the reels still render correctly, they just play no
sound and the mute button is hidden.
