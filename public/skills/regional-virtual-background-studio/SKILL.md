---
name: regional-virtual-background-studio
description: Create photorealistic 16:9 virtual-meeting backgrounds for Microsoft Teams, Zoom, and similar apps. Use when a user wants a believable executive or professional office view tied to their city or U.S. region, with camera-safe composition: an empty chair centered in the scene, the desk behind the chair, no foreground desk blocking the caller, and recognizable regional skyline or landscape cues.
---

# Regional Virtual Background Studio

Create a believable place for the caller to appear to occupy, not a decorative office photo that fights with the webcam subject.

## Core composition

1. Render in **16:9**, targeting **1920×1080**.
2. Place the virtual camera at approximately seated eye level from the opposite side of the room.
3. Put **one empty office chair** near the center-lower third where the caller's body will naturally overlay it.
4. Put the **desk behind the chair**, not between the camera and the chair.
5. Keep the foreground visually open. No giant desk edge, monitor, laptop, coffee mug, keyboard, plant, or other object should cover the caller.
6. Use a corner office or similar professional room with floor-to-ceiling windows when appropriate.
7. Give the caller clean headroom. Keep major landmarks, bright lights, window mullions, and high-contrast objects away from the expected face area.
8. Keep the room credible rather than theatrical: realistic materials, practical furniture, plausible window reflections, natural light, and restrained styling.

## Location logic

- If the user names a city, use that city.
- If the user gives a state or region but not a city, select the nearest major U.S. city with a recognizable professional skyline or regional view.
- If location is available from the product, use the coarse city/region only. Do not infer or expose a precise address.
- If location is unknown and the regional setting matters, ask for the nearest city or state.
- Prefer regionally plausible landmarks, water, terrain, vegetation, architecture, and weather.
- When skyline accuracy matters, consult current visual references before generation and avoid impossible landmark arrangements.
- Do not place text labels or city names inside the generated image.

## Camera-safe subject zone

Assume the caller will occupy roughly the central 35% of the frame.

Keep this zone simple:
- chair back centered below the caller;
- no objects crossing the shoulders;
- no bright landmark directly behind the face;
- no desk in front of the body;
- no wall art or readable text behind the head;
- no second chair positioned like another person is sitting nearby.

## Default visual brief

When the user gives no other aesthetic direction:

- modern professional corner office;
- clean, restrained, premium but believable;
- daytime natural light;
- realistic photography, not illustration;
- 28–35 mm full-frame equivalent perspective;
- subtle depth of field;
- neutral materials with a small amount of greenery only if it stays outside the subject zone;
- skyline or regional view visible through windows;
- no people;
- no logos;
- no readable text;
- one empty chair in front of a desk that sits behind it.

## Prompt skeleton

Use this as the internal image brief and adapt the bracketed fields:

> Photorealistic 16:9 virtual-meeting background, view from a webcam facing an empty ergonomic office chair in a modern corner office in [CITY/REGION]. The chair is centered in the lower-middle of the frame. The desk is fully behind the chair along the windows or rear wall, never in the foreground. Floor-to-ceiling windows reveal a geographically plausible [CITY/REGION] skyline with [LANDMARK / WATER / TERRAIN CUES] placed away from the center face zone. Clean open foreground, no person, no monitor, no laptop, no mug, no keyboard, no clutter, no readable text, no logos. Natural daylight, realistic architectural photography, 28–35 mm lens look, credible reflections and materials, professional but not ostentatious. Leave clear head-and-shoulder space for a video caller. 1920×1080 composition.

## Iteration rules

When the user asks for a correction, preserve everything that already works and change only the requested dimension.

Common fixes:
- **"Desk is in front"** → remove all foreground desk surfaces and place the desk behind the chair.
- **"Too far away"** → move the virtual camera closer while preserving the full chair and skyline.
- **"Face area is busy"** → move landmark/window mullion/high-contrast detail toward the outer thirds.
- **"Doesn't look like my city"** → improve regional landmarks, terrain, vegetation, water, and architecture without adding text.
- **"Looks fake"** → reduce luxury cues, simplify the room, correct perspective, reflections, lighting, and skyline scale.
- **"Teams background" / "Zoom background"** → keep exact 16:9 framing and export a standard JPG or PNG.

## Output checks

Before delivering, verify:
- 16:9 aspect ratio;
- empty chair present;
- desk behind the chair;
- no foreground desk blocking the caller;
- no people;
- no readable text or accidental logos;
- regional setting is plausible;
- central face zone is uncluttered;
- image works when a head-and-shoulders webcam subject is centered over it.
