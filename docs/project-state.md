# 0% music video (song: Flatline): project state

## Where things are
- Google Drive folder (Claude's working folder): 1S4kGIm8W8tyQuCnGBZNV8zWEq3DYxMqJ
  - Flatline.mp3: 1YQoac_93cuQ0tZYHAwsNbaOykf0kOfmE (the link Tom first sent, 1NU72tFT..., is "It Was You.mp3")
  - Doc "Flatline – Song Map and Video Timing" v2: 12kFxY6fEuR4ySvpusRXj2rUr3eK9-Qtn_JbB7XdDqE0
  - Flatline_beat_grid.json v2: 1Ge6Tn5g5OVjD3WLDOpkYK-oskhgirVJk (456 beats, sections, confirmed lyric markers)
  - Flatline_bars.csv v2: 1UY-nF_7AcjMT_wrHUnKHuOq3zqbdGOuU
  - Tom's full lyric timing doc: 1YWgWwFIxl4xBdV-Yx3lzz_h8r31uPc6No9sgRTmnOpk
- In this repo: data/Flatline_beat_grid.json and data/Flatline_bars.csv (the v2 files), and analysis/ (the one-off librosa scripts that produced them; they expect Flatline.mp3 and .npy files in the working directory).
- Not in this repo: the song. A new session downloads Flatline.mp3 from Drive (ID above) into a git-ignored folder such as media/.
- How the Drive tools behave:
  - Downloading a large file: the result is saved to a tool-results JSON file containing base64 content. Decode it with python.
  - The Drive tools can only create, rename, move or trash files. They can't edit content: to update a file, create a new version and trash the old one.
  - Any upload has to pass through Claude's own output, so only small text files can be uploaded. Video and images can't be uploaded this way.
- Network from the container: PyPI and npm work; drive.google.com, Suno, Hugging Face and iands.org are blocked.
- Tools available here: Node 22, ffmpeg 6.1, Chromium at /opt/pw-browsers, Python with librosa, numpy and matplotlib installed.
- No image-generation tool is connected. The Canva plugin failed to connect (proxy 403).
- The profound-archive repo is PUBLIC. Never commit the song, images or video there.

## Song facts
- Length 3:32.42. Tempo drifts from about 128 to 132 BPM, so use the beat times in the beat grid, never a fixed BPM.
- There are 4 drops (all on bar lines): 1:24.8, 1:54.3, 2:38.2 and the final drop at 3:07.4.
- The loudest beat is bar 106 at 3:16.46. "Clear!" at 1:05 sits at the quietest point.
- Section map:

| Section | Time | Bars |
|---|---|---|
| Intro | 0:00–0:08.4 | |
| Verse | 0:08.4–0:42.1 | 4–21 |
| Break | 0:42.1–0:44.0 | 22 |
| Build | 0:44.0–1:00.8 | 23–31 |
| Fade | 1:00.8–1:04.5 | 32–33 |
| Clear + flatline | 1:04.5–1:08.2 | 34–35 |
| Rebuild (instrumental) | 1:08.2–1:24.8 | 36–44; riser 1:17–1:21, kick out 1:21–1:25 |
| Drop 1 | 1:24.8–1:35.9 | 45–50 |
| Heart | 1:35.9–1:54.3 | 51–60 |
| Drop 2 | 1:54.3–2:07.1 | 61–67 |
| Groove | 2:07.1–2:23.6 | 68–76 |
| Coming back | 2:23.6–2:38.2 | 77–84; kick out 2:34.6–2:38.2 |
| Drop 3 | 2:38.2–2:52.8 | 85–92 |
| Build 3 | 2:52.8–3:07.4 | 93–100; swell 3:04–3:07 |
| Final drop | 3:07.4–3:24.0 | 101–109 |
| Outro | 3:24.0–3:32.4 | 110–113 |

## Tom's full lyric timing (by ear; authoritative)
| Time | Lyric |
|---|---|
| 00:04 | Pulse is dropping, |
| 00:07 | stay with me |
| 00:14 | Bright lights over me, |
| 00:17 | voices fading out, |
| 00:21 | Counting every heartbeat, |
| 00:24 | one, two, |
| 00:26 | then doubt, |
| 00:29 | I could hear them calling, |
| 00:33 | I could feel them try, |
| 00:36 | Then the world went quiet, |
| 00:40 | and I started to fly. |
| 00:45 | Faster, faster, faster, higher, |
| 00:49 | Every beat a spark, every spark a fire, |
| 00:52 | Faster, faster, take me higher, |
| 00:55 | My heart is a drum and the drum's on fire. |
| 01:05 | Clear! |
| 01:24 | Flatline |
| 01:32 | Flatline |
| 01:36 | My heart stopped... and I started dancing, |
| 01:54 | Flatline |
| 02:08 | No pain, no fear, no clock, no name, |
| 02:12 | Just light, so bright, I'm not the same, |
| 02:15 | I was gone for four minutes, I was free for forever, |
| 02:19 | Now I'm back in the beat, and we move together. |
| 02:23 | Beep, beep, beep, I'm coming back, |
| 02:27 | Beep, beep, beep, I'm coming back, |
| 02:31 | Beep, beep, beep, hear the monitor sing, |
| 02:33 | I came back to life to feel everything! |
| 02:52 | Flatline |
| 02:53 | My heart stopped... and I started dancing, |
| 03:00 | Flatline |
| 03:01 | My heart stopped... and I started dancing! |
| 03:14 | Still |
| 03:17 | Dancing (the loudest beat is 3:16.46) |
| 03:29 | Still Dancing (the last words; the song ends at 3:32) |

Implications:
- These stretches are instrumental: 1:05–1:24, drop 1 (apart from the 1:32 shout), drop 2 after the 1:54 shout (1:54–2:08), drop 3 (2:38–2:52), and 3:07–3:14.
- "No pain..." falls in the groove (2:08–2:22), not in drop 2.

## 0% treatment (decided): Maya, 19, lives through her phone; the battery dies; she looks up and comes alive
- Core trick: the first half plays as a phone screen recording (motion graphics UI). The phone frame shatters into full screen at the 1:24 "Flatline".
- After the breakout, the real world is a flash "photo dump" of AI stills cut to the beat.
- Use a fictional app called "TokTic" (Tom, 2026-10-13: a deliberate jab at TikTok; "LOOP" was dropped because it is a real app). No real Instagram, TikTok or Apple UI or logos, and keep TokTic's colours away from TikTok's cyan/red/black.
- End card: "You don't have to die to wake up." Project Profound. Add 3–4 s after 3:32.
- Formats: 16:9 master (phone frame in the center, expanding at the breakout) plus a 9:16 vertical. Cutdowns: 15 s (0:45–1:36) and 30 s.
- Image style anchors:
  - Screen world: "cinematic, cold blue phone-screen light, shallow depth of field, 35mm"
  - Real world: "disposable camera flash photo, party candid, warm, grainy, motion blur, Gen Z photo dump aesthetic"
  - Keep Maya's face mostly from behind, in profile or blurred, so she stays consistent.
- Images: up to 20, about 16 planned:
  - Screen world: face lit blue by the phone; party seen through the camera; 4 feed thumbnails; five friends on a couch lit by phones; her reflection in a cracked black screen.
  - Real world: friends laughing mid-dance; living-room dance floor with string lights; her from behind with hair flying; friends shouting the lyrics; confetti; table of face-down phones; group selfie taken by someone else; hands up in bokeh; spin with a light trail; rooftop at dawn; phone face-down on a ledge at sunrise.

### 0% shot list timed to the lyrics
| Time | Lyric | What we see |
|---|---|---|
| 0:00–0:08 | beeps; 0:04 "Pulse is dropping", 0:07 "stay with me" | Lock screen "1:47 AM", 23%. A notification drops in on each beep. At 0:04 the battery turns red. At 0:07, pop-up: "Low battery — stay connected? [Stay] [Close]". |
| 0:08–0:14 | (instrumental) | The party through the camera viewfinder. |
| 0:14 | "Bright lights" | The camera points at the party lights. |
| 0:17 | "voices fading" | A mute icon; friends' faces blur. |
| 0:21 | "Counting every heartbeat" | The like counter ticks on the beat. |
| 0:24 | "one, two" | The counter goes 1, 2. |
| 0:26 | "then doubt" | "Seen", no reply; the count drops. |
| 0:29 | "I could hear them calling" | An incoming call from "Jess" is declined. |
| 0:33 | "I could feel them try" | Texts: "where r u??", "we're literally right here 😂". |
| 0:36 | "Then the world went quiet" | She taps the Do Not Disturb moon. |
| 0:40 | "and I started to fly" | The feed lifts off and the scroll begins. |
| 0:42–0:44 | break | "10% — stay connected?" She taps Stay; a spinner turns for one bar. |
| 0:44–1:01 | build | Scroll accelerates into a tunnel; battery steps down once per bar. 0:49 "Every beat a spark": each beat flashes a post. 0:55 "drum's on fire": a huge pulsing heart (like) icon and a red 1%. |
| 1:01–1:05 | fade | The screen dims and glitches. |
| 1:05 | "Clear!" | The screen cracks: 0%. Black. |
| 1:05–1:24 | instrumental | 1:05–1:08 her reflection in the dead glass. 1:08–1:17 she looks up and the party fades in, out of focus. 1:17–1:21 (riser) focus sharpens and the frame edges crack. 1:21–1:24 (kick out) hold on her face, eyes up. |
| 1:24 | "Flatline" | FLATLINE slams on screen and the frame shatters. |
| 1:25–1:36 | drop 1 | Full-screen flash photo dump, one photo every 2 beats. 1:32 "Flatline": white strobe plus type. |
| 1:36–1:54 | "My heart stopped... and I started dancing" | Huge kinetic type. She dances for the first time. |
| 1:54 | "Flatline" | |
| 1:54–2:08 | instrumental | Friends one by one put their phones down; each screen glow switches off on the beat; they join her. |
| 2:08 | "No pain, no fear, no clock, no name" | Each word blows up a UI element into light: badge, clock, @maya.xo. |
| 2:12 | "Just light, so bright" | A white light flood; she's laughing. |
| 2:15 | "gone for four minutes... free for forever" | Stopwatch 4:00 turns into ∞. |
| 2:19 | "back in the beat, we move together" | Friends dancing in sync. |
| 2:23, 2:27 | "Beep, beep, beep, I'm coming back" | A charger goes in; the phone wakes at 1%; a notification pings on each "beep". |
| 2:31 | "hear the monitor sing" | The screen floods with notifications. |
| 2:33 | "I came back to life to feel everything!" | She looks at the phone... smiles. |
| 2:38–2:52 | drop 3, instrumental | She flips the phone face-down, then her friends do; a table of face-down phones; group photo dump. |
| 2:52–2:53 | "Flatline / My heart stopped..." | Kinetic type #2; slow push-in on her face, lit by real light. |
| 3:00–3:01 | "Flatline / My heart stopped..." | Repeat, bigger; arms rise (swell 3:04–3:07). |
| 3:07–3:14 | final drop | One photo per beat. |
| 3:14 | "Still" | FREEZE, mid-air. |
| 3:16.5–3:17 | "Dancing" | On the loudest beat, explode into the group selfie. |
| 3:17–3:29 | | Photos slow; rooftop at dawn; "Screen time last night: 0 min." |
| 3:29 | "Still Dancing" | Words on screen; song ends at 3:32. |
| After 3:32 | | 3–4 s end card. |

## Build plan
- Tool: Remotion (React video), built and rendered in this container.
  - Read beat times and lyric markers from the beat grid JSON.
  - Pass Chromium as browserExecutable.
  - Remotion is free for individuals, companies of up to 3 people, and non-profits.
- Deliver previews and finals to Tom with SendUserFile. Size limits are untested; if the final is too big, Tom renders it locally.
- Images: Tom generates them in his own tool from Claude's prompts and uploads them to the Drive folder. Claude downloads them via the Drive tool (decoding base64 from the tool-results file).
- Code location: this private repo, masterytv/flatline. Never the public profound-archive repo.

## Decisions (Tom, 2026-10-13)
1. Images: Tom generates them himself from Claude's prompts and uploads them to the Drive folder.
2. Maya: 19, black shoulder-length hair, modern club clothing, a dark, edgy, confident look. Keep the prompts stylish and tasteful, not sexualized; she's a young adult.
   - TokTic app colors: Claude proposed them in docs/image-prompts.md (acid lime accent).
3. Repo: Tom wants a new PRIVATE repo called "flatline" (GitHub account masterytv, a personal account).
   - Done: Tom created it, and Claude attached it with add_repo (access push) on 2026-10-13.
   - Never put mp3, images or rendered video in git: add them to .gitignore and keep media in Drive.
4. Formats: 16:9 master plus a 9:16 vertical, confirmed.

## Runway API (added 2026-10-13)
- Tom added a Runway API key to the cloud environment. Environment variables only reach sessions started after the change, so the session that wrote this file couldn't see it.
- That session also found api.dev.runwayml.com blocked by the network policy (proxy 403). Tom needs to add it under Allowed domains.
- Check in a new session (prints names only, never the value): `env | cut -d= -f1 | grep -i runway`, then `curl -sS -o /dev/null -w "%{http_code}" https://api.dev.runwayml.com/v1/organization -H "Authorization: Bearer $VAR" -H "X-Runway-Version: 2024-11-06"`. A 200 means it works; that endpoint also reports the credit balance and costs nothing.
- Intended use: generating the stills (Runway's text-to-image model, which can take reference images to keep Maya consistent). Tom ruled out AI video on cost, so don't generate video unless he asks. Confirm the image count and cost with Tom before the first paid batch.
- Generated images may download from a different host than the API. If that host is blocked, name it to Tom so he can allow it too.

## Next steps (in order)
1. Done (2026-10-13): image prompts, 17 stills plus a Maya reference. In the repo as docs/image-prompts.md and in Drive as the Google Doc "Flatline – 0% Image Prompts" (1n0Qnq3TwnBmtrLEqdNqWC6S2q1CrfvtV3R4TIwwuiCQ).
2. Done (2026-10-13): Remotion scaffold (see "Remotion build" below).
3. Done (2026-10-13): first test render of the screen-world opening, 0:00 to 1:26.6 (it runs to the downbeat after the breakout so the shatter plays out). Images are procedural stand-ins. Waiting on Tom's notes.
4. Tom: approve the image count and Runway cost (about 144 credits at 1080p, before retakes), or generate the stills himself. Then download them into public/stills/ named by ID; they replace the stand-ins automatically.
5. Build drop 1 onwards: the photo dump, the kinetic type, the end card.

## Remotion build
- Commands: `npm install`, then `npm run studio` (live preview), `npm run typecheck`, `npm run render:opening-preview` (960×540) or `npm run render:opening` (1920×1080). The vertical version is the composition `ScreenOpeningVertical` (1080×1920). Add `--props='{"debug":true}'` for a timecode and bar counter in the corner.
- Chromium: remotion.config.ts points at /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell.
- Song: download Flatline.mp3 from Drive into media/ and copy it to public/Flatline.mp3 (both git-ignored; a relative symlink breaks when Remotion copies public/). Without it, the render is silent.
- Stills: put Tom's images in public/stills/ as <ID>_<name>.jpg/png/webp (e.g. S1_face_blue.png). `Still` in src/ui/Worlds.tsx uses the file when it exists and a procedural stand-in when it doesn't. public/stills is git-ignored via the image extensions.
- Timing: src/timing.ts reads the beat grid; src/opening/cues.ts holds every cue in the 0:00–1:24 shot list, each snapped to the beat nearest Tom's lyric time, plus the battery schedule (23% → red 20% at 0:04 → 10% at the break → one step per bar → 1% at 0:55 → 0% at "Clear!").
- Code map: src/opening/ScreenScenes.tsx (phone-screen scenes), src/opening/ScreenOpening.tsx (room, frame cracks, FLATLINE slam, shatter), src/ui/ (phone, status bar, TokTic logo, notifications, stand-in worlds), src/theme.ts (TokTic palette).

## Other context
- Ageless (Rose and Walter) is the second video, planned for later. Its shot list is in the v2 Google Doc.
- Other songs written in this project: No Fear, Rewind, One, Into the Light, Everyone I Loved Was There (EDM and soul versions), Not Yet, I Came Back to Tell You, Skeptic vs Survivor.
