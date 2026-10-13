# 0% image prompts (Flatline)

17 stills, under the 20 cap, which leaves 3 spare for retakes. Six are for the screen world (before the 1:24 breakout) and eleven for the real world (after it). The other feed posts in the phone UI are motion graphics, so they need no images.

## How to use these
- **Maya (paste into every prompt that shows her):** "Maya, a 19-year-old young woman young Italian woman (light olive skin, dark hazel eyes with a slight feline tilt, a straight Roman nose, strong dark brows), black shoulder-length hair, modern dark club clothing (black cropped jacket, silver jewellery), a dark, edgy, confident look." Keep her from behind, in profile, or soft and out of focus, so she stays consistent across shots. Stylish, never sexualized.
- **Consistency:** generate `M0` first and use it as the reference image for every other shot with Maya in it. In Runway's text-to-image model (gen4_image) that means passing it as a reference image tagged `maya` and writing `@maya` in the prompt in place of the description.
- **Size:** 16:9 (1920×1080). Keep the subject in the middle third so a 9:16 crop also works for the vertical edit.
- **No text, logos or real apps in any image.** Every phone screen in the stills shows only abstract glow; the TokTic UI is added in motion graphics.
- **Negative prompt (where the tool supports one):** text, watermark, logo, brand names, Instagram, TikTok, Apple logo, extra fingers, distorted hands, sexualized, revealing clothing.
- File names: save each file as its ID plus a short name (e.g. `S1_face_blue.png`) in the Drive folder, so the build picks it up by ID.

## Style anchors
- **Screen world:** cinematic, cold blue phone-screen light, shallow depth of field, 35mm.
- **Real world:** disposable camera flash photo, party candid, warm, grainy, motion blur, Gen Z photo dump aesthetic.

---

## M0: Maya reference (not used in the edit)
> Solo character reference portrait of one person: Maya, a 19-year-old young Italian woman, light olive skin, dark hazel eyes with a slight feline tilt, a straight Roman nose, strong dark brows, black shoulder-length hair, black cropped jacket, silver jewellery, dark edgy confident look, three-quarter view looking over her shoulder at the camera, standing against a plain dark grey wall, soft even studio light, sharp focus, 35mm, neutral colours.

## Screen world (0:00–1:24)

| ID | Used at | Prompt |
|---|---|---|
| S1 | 1:05–1:24 (her face as she looks up) | Close-up profile of Maya, a 19-year-old young woman with black shoulder-length hair, face lit only by the cold blue glow of a phone held low, dark room behind her, eyes looking down at the screen, blurred warm party lights far in the background, cinematic, cold blue phone-screen light, shallow depth of field, 35mm. |
| S2 | 0:08–0:17 (party through the camera viewfinder) | Point-of-view shot of a crowded living-room house party at night seen from the edge of the room, friends dancing under string lights and coloured LED strips, slightly out of focus, as if seen through a phone camera, cinematic, cold blue phone-screen light in the foreground, warm lights behind, shallow depth of field, 35mm. |
| S3 | 0:14 "Bright lights" | Party lights at night pointed straight at the camera: a cluster of coloured LED bulbs and string lights in a dark room, big soft bokeh circles, haze, lens flare, no people in focus, cinematic, cold blue tint, shallow depth of field, 35mm. |
| S4 | feed post (0:40–1:01) | Overhead shot of a sunset concert crowd seen from far away, hands in the air as silhouettes, pink and orange sky, slightly over-saturated like a social media post, cinematic, cold blue phone-screen light, shallow depth of field, 35mm. |
| S5 | 1:54 bridge (friends on a couch) | Five friends around 19 to 20 sitting side by side on a couch at a party, every face lit blue from below by their own phone, nobody talking, a dance floor glowing warm and empty behind them, Maya with black shoulder-length hair second from the left in profile, cinematic, cold blue phone-screen light, shallow depth of field, 35mm. |
| S6 | 1:05–1:08 (reflection in dead glass) | Extreme close-up of a black, switched-off smartphone screen with a fine crack across the glass, the faint reflection of Maya's face and black shoulder-length hair in the dark glass, blurred warm party lights reflected behind her, no text, cinematic, cold blue light, shallow depth of field, 35mm. |

## Real world (1:24 onwards)

| ID | Used at | Prompt |
|---|---|---|
| R1 | drop 1 (1:25) | Friends around 19 to 20 laughing mid-dance in a crowded living room, mouths open, one friend grabbing another's shoulder, harsh direct flash, disposable camera flash photo, party candid, warm, grainy, motion blur, Gen Z photo dump aesthetic. |
| R2 | drop 1 | Living room turned into a dance floor, furniture pushed against the walls, warm string lights across the ceiling, a crowd of young people dancing, wide shot, disposable camera flash photo, party candid, warm, grainy, motion blur, Gen Z photo dump aesthetic. |
| R3 | 1:36 "and I started dancing" | Maya from behind, a 19-year-old with black shoulder-length hair flying as she spins on a crowded dance floor, arms out, black cropped jacket, friends blurred around her, disposable camera flash photo, party candid, warm, grainy, strong motion blur, Gen Z photo dump aesthetic. |
| R4 | drop 1 / 2:19 | A group of friends around 19 to 20 shouting song lyrics together, arms around each other's shoulders, heads thrown back, sweaty and happy, disposable camera flash photo, party candid, warm, grainy, motion blur, Gen Z photo dump aesthetic. |
| R5 | drop 2 / final drop | Confetti exploding over a crowd of young people dancing at a house party, confetti frozen mid-air in the flash, hands reaching up, disposable camera flash photo, party candid, warm, grainy, motion blur, Gen Z photo dump aesthetic. |
| R6 | drop 3 (2:38) | Top-down shot of a wooden coffee table covered with six smartphones all lying face-down, plastic cups, a bowl of crisps, warm party light spilling across the table, no screens visible, disposable camera flash photo, warm, grainy, Gen Z photo dump aesthetic. |
| R7 | 3:16.5 "Dancing" (the explosion) | Group selfie taken by someone else at arm's length, seven friends around 19 to 20 squeezed into the frame mid-laugh, Maya with black shoulder-length hair in the middle turned half away and laughing, nobody holding a phone, disposable camera flash photo, party candid, warm, grainy, slight motion blur, Gen Z photo dump aesthetic. |
| R8 | drop 2 / final drop | Many hands raised in the air on a dark dance floor, warm bokeh lights behind, sweat and haze, fingers spread, disposable camera flash photo, party candid, warm, grainy, motion blur, Gen Z photo dump aesthetic. |
| R9 | 3:14 "Still" (the freeze) | Maya spinning on the dance floor, black shoulder-length hair and jacket swinging, a long warm light trail from a slow shutter tracing the spin, her face blurred, friends cheering in the background, disposable camera flash photo with slow shutter drag, warm, grainy, motion blur, Gen Z photo dump aesthetic. |
| R10 | 3:17–3:29 (dawn) | Friends around 19 to 20 sitting together on a city rooftop at dawn after the party, wrapped in jackets, soft pink and gold sky, seen from behind, Maya with black shoulder-length hair leaning on a friend's shoulder, disposable camera photo without flash, warm, grainy, Gen Z photo dump aesthetic. |
| R11 | 3:25 ("Screen time last night: 0 min.") | A smartphone lying face-down on a concrete rooftop ledge at sunrise, the city skyline soft in the distance, golden light, no screen visible, quiet, disposable camera photo without flash, warm, grainy, Gen Z photo dump aesthetic. |

## Runway notes (checked 2026-10-13)
- The key in the environment works: `GET /v1/organization` on api.dev.runwayml.com returns 200, with a credit balance of 700 and gen4_image enabled (2 at a time, 200 a day).
- Runway prices gen4_image per image in credits (1 credit = $0.01): it was 5 credits at 720p and 8 at 1080p when last checked; confirm on Runway's pricing page. At 1080p, M0 plus the 17 stills is about 144 credits, roughly $1.50, before retakes.
- Nothing has been generated yet. Tom approves the count and cost before the first paid batch.

## TokTic app colours (proposal)
TokTic is the fictional app on Maya's phone, a deliberate jab at the real one. Its palette stays clear of TikTok's own cyan, red and black, so it reads as parody, not imitation: a cool, slick UI that the warm real-world photos break through.

| Token | Hex | Use |
|---|---|---|
| bg | `#0B0D12` | app background |
| surface | `#151922` | cards, notification banners |
| text | `#F2F4F8` | primary text |
| muted | `#7A8194` | timestamps, secondary text |
| signal | `#C6FF3D` | TokTic accent (acid lime): logo, buttons, the scroll tunnel |
| pulse | `#FF4D6D` | likes, low battery, the 0% crack |
| charge | `#3DFF8A` | battery while above 20% |

The TokTic logo is the word "TokTic" set in a heavy rounded type with the dot of the i as a ticking clock hand, a nod to how the app eats time.
