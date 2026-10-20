# Rendering the final videos

Run these from the repo folder. The machine needs the git-ignored media: `public/Flatline.mp3`, `public/stills/` and
`public/plates/` (see docs/project-state.md for how to rebuild them in a new container).

| Command | Output (in `out/`) | Use it for | Time on 4 cores |
|---|---|---|---|
| `npm run render:master` | `flatline0-1080p.mp4` (1920×1080) | the 16:9 master; Vimeo, Facebook, anywhere 1080p | ~40 min |
| `npm run render:master-vertical` | `flatline0-vertical-1080x1920.mp4` | Instagram, TikTok, Facebook/Snap stories | ~40 min |
| `npm run render:youtube-4k` | `flatline0-2160p.mp4` (3840×2160) | YouTube (the main upload) | ~1 h 45 min |
| `npm run render:youtube-4k-vertical` | `flatline0-vertical-2160x3840.mp4` | YouTube, the vertical version | ~1 h 45 min |

All four are H.264 MP4 at 30 fps with AAC audio at 320 kbit/s. Frames go to the encoder as PNG, not JPEG, so the halftone
dots stay clean, and the encoder runs x264 `slow` at CRF 14 (1080p) or CRF 16 (4K). The files come out at about
30–70 Mbit/s, roughly 1–2 GB for the 3:36 song. That is far above what the platforms keep, which is the point: each
platform re-compresses, and the cleaner the upload, the better its copy looks.

## Why 4K for YouTube
YouTube gives 4K uploads a higher-bitrate encode than 1080p uploads, and that matters for fine halftone dots, which
smear badly at low bitrates. Viewers on 1080p screens see the 4K upload's 1080p version, which still looks better than
uploading 1080p. The 4K files are a true 2× render: type and shapes are drawn at 4K, and the halftone dots are scaled
up from the 1080p screen.

## Platform notes (checked October 2026)
- **YouTube:** upload `flatline0-2160p.mp4`. YouTube asks for MP4, H.264 at the recorded frame rate (30 fps here).
  A vertical video counts as a Short only up to 3:00, so the full 3:36 vertical uploads as a regular vertical video;
  Shorts need a cutdown.
- **Instagram:** upload `flatline0-vertical-1080x1920.mp4` (Instagram doesn't keep more than 1080 wide). The Reels
  length limit varies by account (3 minutes is common; some accounts get longer); the app's length selector shows yours.
  If 3:36 is too long, post a cutdown as the Reel.
- **TikTok:** upload `flatline0-vertical-1080x1920.mp4`.
- Upload from a computer or over Wi-Fi rather than by forwarding the file through a messaging app, which re-compresses it.

## Notes
- `out/` is git-ignored; never commit renders.
- To test the settings on a few seconds first, add `--frames=3000-3119` (frames 3000–3119 = 1:40–1:44).
- For an even higher-quality master to grade or edit elsewhere, ProRes:
  `npx remotion render Flatline0 out/flatline0-prores.mov --codec=prores --prores-profile=hq --image-format=png`
  (about 6 GB).
- The audio is only as good as `Flatline.mp3` (MP3 at 187 kbit/s). For the best sound, mux the WAV master in afterwards:
  `ffmpeg -i out/flatline0-2160p.mp4 -i Flatline.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k out/flatline0-2160p-wav.mp4`
  (the WAV must start at the same point as the MP3).
