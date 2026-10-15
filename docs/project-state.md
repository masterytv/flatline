# 0% music video (song: Flatline): project state

## Status at handoff (2026-10-15, read this first)
- The whole video is built: the phone-screen opening (0:00–1:24.8) with the new photo set, then Proof of Life (src/print) from the shatter to the end card, with the three grafts and Tom's four fixes. A full 960×540 preview with the song went to Tom on 2026-10-15 (out/flatline0-preview.mp4, plus a 30 MB copy, flatline0-preview-small.mp4, for the upload limit). Waiting on his notes; the 9:16 comes only after he approves the 16:9.
- New container: download Flatline.mp3 (below) into media/ and public/; the stills are NOT in Drive (the Drive tools can't upload images). They can be re-downloaded without credits with `python3 scripts/runway_stills.py --fetch` only while Runway keeps the task outputs; media/stills/tasks.json is local. Then `npm run stills:small` and `python3 src/print/tools/print_plates.py` (plates go to public/plates).
- Runway: 720 credits spent ($7.20 of Tom's $20 cap), 550 left.
- Lyric cues placed on bar lines that Tom should ear-check (everything else is snapped to his by-ear times): 1:35.85 MY HEART, 1:36.77 STOPPED, 1:39.54 'and I started', 1:41.38 DANCING; 2:12.64 'just light', 2:13.10 'so bright', 2:14.01 'I'm not the same'; 2:20.89 'together'; 2:25.44 'I'M COMING BACK'; 2:33.67 'to feel everything'; 2:53.73 'my heart stopped', 2:56.45 'and I started', 2:57.38 'dancing'; 3:01.02 MY HEART / STOPPED, 3:03.74 AND I STARTED, 3:05.56 DANCING.
- Tom's ear-check (2026-10-15): music and graphics hit; the rest of the word timings are good enough except "Clear!" and "No pain, no fear, no clock, no name", which were up to 0.75 s early. Those cues are now measured from the vocal instead of snapped to the beat (the groove cancelled bar by bar, then the vowel track read per word): Clear! 65.33 (was 64.946), NO PAIN / NO FEAR / NO CLOCK / NO NAME on each sung "no" at 128.72, 129.62, 130.32, 130.95 (were 128.06, 128.96, 129.89, 130.81). `python3 analysis/word_onsets.py <t0> <t1>` prints the voice power and vowel balance for any window, for the next words that need measuring.
- Open notes from the section builders, for Tom's review of the preview: P1 could sit 40 px higher so more faces show inside the FLATLINE letters (s_drop.tsx POSTER.cy 480 to 440); about 3 near-black frames at 1:44.9 as the DANCING zoom passes the N–C gap (s_dancing.tsx ZMAX); P49 (Maya in the keepsake) and P54 (the sleepers) could print darker with print_plates.py P-dict entries; the HR readout follows the grid tempo beat to beat (129/132).

## Status at the earlier handoff (2026-10-13)
- Tom on the full first cut: "This is mediocre at best. My idea for the images made everything look AI generated. Too many of the photos are repeated over and over." The 0:00–1:24 phone opening was liked; drop 1 to the end card needs a new treatment.
- Superseded below: the stills are no longer made by Tom in his own tool. Claude generates them on Runway (scripts/runway_stills.py, model nano_banana_2.1, 6 credits each, about 270 credits left) and sends Tom JPEGs; api.dev.runwayml.com and dnznrvs05pmza.cloudfront.net are both allowed now, and the Drive tools work.
- Images so far: M0 (reference, not in the edit), S1–S6 and R3–R14 (19; R1 and R2 were generated and cut). Tom lifted the 20-image cap on 2026-10-13: generate as many as the video needs, quoting the count and cost (nano_banana_2.1, 6 credits each, about 270 credits left) before each batch.
- The "editorial fashion photographer, Edison-bulb loft" style in docs/image-prompts.md is what Tom called AI-looking; don't reuse it as is.
- A new container has no media: download Flatline.mp3 and the stills from the Drive folder (Tom uploads the JPEGs he was sent).

## Second-half treatments (2026-10-13)
After Tom's verdict, three treatments for 1:24.8 to the end card were pitched, prototyped and judged side by side by three critics (taste, music-video craft, buildability):
- **Print, "Proof of Life"** (src/proto/print, scored 7/7/7, recommended). Maya's world turns to paper after the shatter: every still is printed live in two inks (orange = real life, ultramarine = screen world, TokTic lime only on the app's own things) on cream newsprint, each still used once, never shown as a glossy photo. Highlights: DANCING letter windows onto R3; S5 printed cold and warmed by one stencil per phone going down; the S1/R12 zine diptych at 2:52; the press stopping half-printed on "Still" and the dots blowing off on 3:16.46. Risks: the jump from the dark opening to cream paper, a long orange/black stretch, 16 stills (cut S2, S3, R11 to get to about 12), halftone shimmer after compression.
- **Monitor** (src/proto/monitor, 5/5/6). The heart-monitor line is the protagonist; the real world only through shapes it cuts. Best quiet moments (STOPPED with HR 0, six-lane ward monitor, the R12 eyelid), but energy runs backwards on the drops and people are barely on screen.
- **Uninstall** (src/proto/uninstall, 3/4/3). Rejected: stills shown clean and glossy again. Its drop-1 hand-over (TokTic parts dancing out of the shattered phone on the beat, bars 46–48) is the best of the three and is the recommended graft into Print.
- Recommended grafts into Print: Uninstall's drop-1 hand-over (paper arrives on the 1:32 "Flatline"); Monitor's real "stopped" (flat rule, HR 0, then HR counting up to the live tempo); a battery charging one ink cell per beat in drop 3 in place of the unreadable R6 phone-door table.
- Print is now src/print (built 2026-10-14/15); its plates are made by `python3 src/print/tools/print_plates.py` (numpy, Pillow) into public/plates, and its fonts come from the @fontsource packages. Monitor's effects tools (OpenCV, Hershey font) were installed only in a scratch folder. Each prototype has its own entry: `FRAMES_ENTRY=src/proto/<name>/index.ts node scripts/frames.mjs Proto<Name> <outDir> 0.5 <seconds...>`.
- **Decision (Tom, 2026-10-13): build Print ("Proof of Life")** with the three grafts above, into the main composition Flatline0, using src/proto/print as the base. New stills must look like real candid phone photos taken by friends in a nice place, never AI-looking or editorial (see the new style at the top of docs/image-prompts.md). Images start over (Tom, 2026-10-13): a new set planned from scratch for Print, as many as needed, in a real candid phone-photo style in nice places, never AI-looking or editorial (see the top of docs/image-prompts.md); the old S/R stills are reference only and the opening's stills may be replaced too. Propose the shot list with costs and show a small test batch first. Defaults unless Tom says otherwise: each image used once, no repeats; 16:9 first and the 9:16 after Tom approves the 16:9. Monitor and Uninstall stay in src/proto only as references for the grafts.
- Still open with Tom: ear-checking lyric cues placed on bar lines; when to build the 9:16.
- **Later on 2026-10-13 (Tom):** "Don't use the previous photos. They look too AI generated. Recreate the prompts and images to make the video look like a world-class motion graphics designer and photographer and music video artist would make it." And: "You can even change the story if you need to. I'm leaving this to your judgement. Make sure there are lots of cuts and changes to keep the user's attention. This is an ADHD audience."
  - Nothing from the old image set is used, the opening's stills included. Maya gets a new identity reference in the real-photo style (M1), and M1 is the reference for every Maya shot.
  - M0 is lost: it was never put in Drive, its Runway task ID was never saved (it came from a one-off model-comparison script), and Tom no longer has the copy he was sent. M1 is made from Maya's written description (Decisions, item 2) and Tom approves her face in the test batch before any other Maya shot is generated.
  - Pacing: a visual change at least every 2 beats almost everywhere and every beat in the drops, with only short, deliberate holds.
- **2026-10-14:** Tom approved the shot list and asked for production with image generation under $20. All 83 stills are generated (M1, C1, O1-O27, P1-P54); a realism review then flagged red cups, beer bottles and cans (Tom: remove them) plus some lettering and logos, fixed with 37 in-place edits. Runway spend so far: 720 credits ($7.20). Tom also asked for O7 to push in on Maya between Jess and Dev (done in code, src/opening/ScreenScenes.tsx KaiPhoto).
- **Shot list proposed (2026-10-13, approved 2026-10-14):** docs/shot-list.md (the story, the places, a cut plan with 347 visual changes, and an index of 83 images: 2 references, 27 for the opening, 54 for Print) and docs/image-prompts.md (every prompt). 83 images plus a 10% retake reserve is 92 × 6 = 552 credits, which is 282 more than the 270 left; the references plus the test batch (36 credits) fit now.

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
- After the breakout, the real world is a run of AI stills cut to the beat.
  - Revised by Tom on 2026-10-13: the stills should look like a top music-video photographer shot them. Stylish, light and beautiful; never trashy party snaps.
  - Each still moves (Ken Burns push or drift, parallax or light leaks where they suit). The `KenBurns` component is in src/ui/Worlds.tsx.
  - Every shot with a group includes at least one Black, one East Asian and one South Asian (Indian) young adult in a diverse, attractive cast.
- Use a fictional app called "TokTic" (Tom, 2026-10-13: a deliberate jab at TikTok; "LOOP" was dropped because it is a real app). No real Instagram, TikTok or Apple UI or logos, and keep TokTic's colours away from TikTok's cyan/red/black.
- End card: "You don't have to die to wake up." Project Profound. Add 3–4 s after 3:32.
- Formats: 16:9 master (phone frame in the center, expanding at the breakout) plus a 9:16 vertical. Cutdowns: 15 s (0:45–1:36) and 30 s.
- Image style anchors:
  - Screen world: "cinematic, cold blue phone-screen light, shallow depth of field, 35mm"
  - Real world (revised 2026-10-13): editorial music-video still by a top fashion photographer, warm Edison-bulb light and haze in an elegant industrial loft, light and joyful, fine film grain. The full wording is in docs/image-prompts.md.
  - Keep Maya's face mostly from behind, in profile or blurred, so she stays consistent.
- Images (original plan, superseded: there is no longer a cap):
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
| 1:05–1:24 | instrumental | 1:05–1:08 her reflection in the dead glass. 1:08–1:17 out-of-focus photos of the room flip past every 2 beats (revised by Tom on 2026-10-13: one long blur-to-focus shot was too long). 1:17–1:21 (riser) flips every beat and the frame edges crack. 1:21–1:24 (kick out) her face comes into focus and holds. |
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
2. Maya: 19, European, slim, high cheekbones, large almond-shaped light grey-green eyes, straight dark brows, long tousled chestnut-to-caramel hair, modern dark club clothing, a calm, intense, confident look (from a look reference Tom shared on 2026-10-13, after earlier takes kept coming out East Asian; the reference's revealing dress is deliberately not copied). Keep the prompts stylish and tasteful, not sexualized; she's a young adult.
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
- 2026-10-13: Tom approved generating the stills on Runway. Generation itself works (the M0 test cost 8 credits at 1920:1080), but the images download from dnznrvs05pmza.cloudfront.net, which the network policy blocks (proxy 403). Tom needs to add it under Allowed domains. The first M0 render was lost because its task ID wasn't saved.
- Script: scripts/runway_stills.py (M0 first, then `all`; it uses media/stills/M0.* as the @maya reference for shots with Maya, records task IDs in media/stills/tasks.json, and `--fetch` re-downloads finished tasks without new credits).

## Next steps (in order)
1. Done (2026-10-13): image prompts, 17 stills plus a Maya reference. In the repo as docs/image-prompts.md and in Drive as the Google Doc "Flatline – 0% Image Prompts" (1n0Qnq3TwnBmtrLEqdNqWC6S2q1CrfvtV3R4TIwwuiCQ).
2. Done (2026-10-13): Remotion scaffold (see "Remotion build" below).
3. Done (2026-10-13): first test render of the screen-world opening, 0:00 to 1:26.6 (it runs to the downbeat after the breakout so the shatter plays out). Images are procedural stand-ins. Waiting on Tom's notes.
4. Done (2026-10-13): all 17 stills generated on Runway with nano_banana_2.1 (Tom's pick, 6 credits each at 2752:1536), with M0 as the reference for the Maya shots. R6 was retaken once (the first take showed an Apple logo and face-up phones). Sent to Tom as full-resolution JPEGs for the Drive folder; the Drive tools can't upload images. Runway balance after: 348 credits.
   - A new session has no media: download the stills from Drive into media/stills/ and copy them to public/stills/ as <ID>.png or .jpg (git-ignored).
   - Restyle (Tom, 2026-10-13): R1 and R2 cut; S2, S5 and R3–R10 regenerated in the editorial style with the diverse cast (60 credits). The first-round images are in media/stills/v1/. Drop 1 now opens on R8. Small leftovers: beer bottles on the R10 rooftop; a light phone screen in S2. Balance after: 288 credits.
5. Done (2026-10-13): first full build of drop 1 onwards, as the composition `Flatline0` (whole song plus end card) and `Flatline0Vertical`. Three more stills (R12–R14) were generated for the Maya moments (18 credits; 270 left; 18 of 20 images used). Waiting on Tom's notes.
6. Next: Tom's notes on the full preview; check the lyric sync (the heart section and the repeats at 2:52 and 3:00 are placed on bar lines, not on measured vocal times); the 15 s and 30 s cutdowns; final 1080p renders (16:9 and 9:16).

## Remotion build
- Commands: `npm install`, then `npm run studio` (live preview), `npm run typecheck`, `npm run render:opening-preview` (960×540) or `npm run render:opening` (1920×1080). The vertical version is the composition `ScreenOpeningVertical` (1080×1920). Add `--props='{"debug":true}'` for a timecode and bar counter in the corner.
- Chromium: remotion.config.ts points at /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell.
- Song: download Flatline.mp3 from Drive into media/ and copy it to public/Flatline.mp3 (both git-ignored; a relative symlink breaks when Remotion copies public/). Without it, the render is silent.
- Stills: put Tom's images in public/stills/ as <ID>_<name>.jpg/png/webp (e.g. S1_face_blue.png). `Still` in src/ui/Worlds.tsx uses the file when it exists and a procedural stand-in when it doesn't. public/stills is git-ignored via the image extensions.
- After adding or replacing stills, run `npm run stills:small`. It makes 1280px copies in public/stills/small/, which the feed thumbnails and the blurred flips use so renders stay fast.
- Timing: src/timing.ts reads the beat grid; src/opening/cues.ts holds every cue in the 0:00–1:24 shot list, each snapped to the beat nearest Tom's lyric time, plus the battery schedule (23% → red 20% at 0:04 → 10% at the break → one step per bar → 1% at 0:55 → 0% at "Clear!").
- Full video: src/full/cues.ts holds every cue from drop 1 to the end card (lyric cues snapped to the beat, sections on bar lines). src/full/Flatline0.tsx is the master timeline: the opening until the downbeat after the shatter, then the photo runs, kinetic type and moments. src/full/kit.tsx has the photo-cut engine (`cutsEvery` gives each cut its own Ken Burns move and a tighter crop on repeats), light leaks, strobes, flashes, confetti and the kinetic type. src/full/moments.tsx has the motion-graphics moments: phones down (glows on S5), "No pain..." UI bursts, 4:00 → ∞, the charger and notification flood, the phone flip, the screen-time card and the end card.
- Renders: `npm run render:full-preview` (960×540), `npm run render:full` and `npm run render:vertical` (full size). `node scripts/frames.mjs <Composition> <outDir> <scale> <seconds...>` renders chosen frames as PNGs for quick checks.
- Print (1:24.8 to the end): src/print/Print.tsx is the timeline (one section per bar or lyric cue); each s_*.tsx file holds a group of sections; press.ts/Press.tsx/density.ts are the halftone press; kit.tsx has the shared print parts. To check one section on its own: `FRAMES_ENTRY=src/print/dev/<group>.ts node scripts/frames.mjs PrintDev out/frames/<group> 0.5 <seconds...>` (and src/opening/dev.ts for the opening).
- Code map: src/opening/ScreenScenes.tsx (phone-screen scenes), src/opening/ScreenOpening.tsx (room, frame cracks, FLATLINE slam, shatter), src/ui/ (phone, status bar, TokTic logo, notifications, stand-in worlds), src/theme.ts (TokTic palette).

## Other context
- Ageless (Rose and Walter) is the second video, planned for later. Its shot list is in the v2 Google Doc.
- Other songs written in this project: No Fear, Rewind, One, Into the Light, Everyone I Loved Was There (EDM and soul versions), Not Yet, I Came Back to Tell You, Skeptic vs Survivor.
