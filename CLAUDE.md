# flatline: working rules

Music video project for the song "Flatline". The first video is "0%" (Maya, 19, lives through her phone; the battery dies; she looks up and comes alive dancing). "Ageless" comes later.

- Read `docs/project-state.md` first. It holds the Drive file IDs, Tom's lyric timings (authoritative), the section map, the timed shot list, the decisions and the next steps.
- Beat times come from `data/Flatline_beat_grid.json`. The tempo drifts from about 128 to 132 BPM, so never assume a fixed BPM. At 30 fps, frame = round(time × 30).
- Never commit the song, images or rendered video. Media lives in the Google Drive folder and in the git-ignored `media/` folder locally.
- Never print or commit API keys. They come from the cloud environment's settings.
- Motion graphics plus at most 20 AI still images. No AI video unless Tom asks for it.
- Use the fictional app "LOOP" on screen; no real Instagram, TikTok or Apple UI.
