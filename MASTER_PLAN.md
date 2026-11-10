# The Road That Made Us Family
## MASTER_PLAN.md — v2.4 (Phase 3 Story Timeline Update & Baal Kuwari Plan)

**Status:** ACTIVE — Phase 3 Planning & Implementation  
**Option Selected:** Option B — Full Cinematic Experience, Phased Development (Quality-First, No Fixed Deadline)  
**Last Updated:** 2026-11-10  
**Revision:** v2.4 — Recorded full confirmed Rishikesh trip chronology (Kitaabi Dastaan chats & phone calls, Lucknow train vs. Delhi bus, shared hotel 1st/ground floor rooms, Day 1 evening scooter Maggi, Day 2 bun maska & chai + Kumbhkaran delay, Neelkanth, pre-climb Maggi before Baal Kuwari, ~400 stairs with Ishaan helping, evening-bus safe quick return, hotel reunion with Srishti's original group without bus-stand dropoff, separate later Bhai Dooj epilogue), added Phase 3 implementation & two-commit boundaries, and logged the known deferred floating mountain geometry / tree polish item.

---

## Table of Contents

0. [Option Selected & Development Strategy](#section-0-option-selected--development-strategy)
1. [Creative Concept & Emotional Direction](#section-1-creative-concept--emotional-direction)
2. [Scene Registry](#section-2-scene-registry)
3. [Scene-by-Scene Storyboard](#section-3-scene-by-scene-storyboard)
4. [Gameplay Mechanics & Unified Controls](#section-4-gameplay-mechanics--unified-controls)
5. [Character & Environment Art Direction](#section-5-character--environment-art-direction)
6. [Technology Stack & Dependency Baseline](#section-6-technology-stack--dependency-baseline)
7. [Technical Architecture & Folder Structure](#section-7-technical-architecture--folder-structure)
8. [3D Asset Pipeline (Blender → GLB)](#section-8-3d-asset-pipeline-blender--glb)
9. [Desktop/Mobile Performance Strategy](#section-9-desktopmobile-performance-strategy)
10. [Development Phases & Milestones](#section-10-development-phases--milestones)
11. [Feature Classification & Minimum Viable Scope](#section-11-feature-classification--minimum-viable-scope)
12. [Risks & Fallback Plans](#section-12-risks--fallback-plans)
13. [Division of Work](#section-13-division-of-work)
14. [Phase 1A Readiness & Remaining Creator Confirmations](#section-14-phase-1a-readiness--remaining-creator-confirmations)
15. [Appendix: Inspiration References](#appendix-inspiration-references)

---

## Section 0: Option Selected & Development Strategy

**Option B — Full Cinematic Interactive 3D Experience** has been selected.

This is a bespoke, personal gift website built as a cinematic interactive 3D experience. The player relives the real journey that turned an online friendship into family — from Kitaabi Dastaan to Rishikesh and a Bhai Dooj tilak ceremony — experiencing it through exploration, movement, and intimate storytelling.

### Why Option B
- The story has enough emotional specificity and scene variety to justify a full multi-scene 3D experience.
- The Rishikesh trip — two scooters, mountain roads, Maggi & chai, Neelkanth Mahadev, the separate Baal Kuwari climb — is cinematic by nature.
- A flat or 2D presentation would undersell the memory.
- The Bhai Dooj tilak ceremony deserves an interactive, ceremony-weight ending.

### Development Philosophy
- **Story first & factual accuracy.** Never invent historical memories or present fictional dialogue as real quotes. Any suggested UI text or creative staging addition is explicitly labeled `[PROPOSED — Requires User Approval]`.
- **Quality-first, milestone-based pacing (Approved).** There is no fixed hard deadline; quality and emotional resonance take priority over rushing.
- **Scaffolding before gameplay.** Minimum project & canvas shell setup (Phase 1A) precedes the playable vertical slice (Milestone 0), which validates core 3D mechanics before full production begins.
- **Accessible by default.** Desktop keyboard/mouse and mobile touch are both first-class. Guided mode (firefly companion) is `[OPTIONAL]`.
- **Performance is a feature.** The experience must run smoothly on mid-range mobile devices as well as desktop.

### Feature Categorization Framework
To prevent accidental scope creep or silent feature stripping, every feature in this plan is explicitly categorized:
- **[CORE]**: Mandatory for the complete v1.0 release. Must be implemented to fulfill the emotional and gameplay vision.
- **[DEFERRED]**: Architecturally supported, but deferred to post-v1.0 updates (e.g., Rapier rigid-body tire physics, KTX2 Basis GPU texture transcoding).
- **[OPTIONAL]**: Quality-of-life or playful enhancements that can be toggled or included without blocking story progression (e.g., Firefly Guided Mode, companion honk/wave animations, roadside cow encounter, bonus hidden viewpoint polaroids, finale flowers, social poster generator).

---

## Section 1: Creative Concept & Emotional Direction

### The Story in One Line
Srishti plays through the journey that turned Ishaan — whom she met online in a book community and began calling "Bhai" — into real family, ending with an interactive Bhai Dooj tilak ceremony.

### Approved Creative Decisions (Recorded)
- **Characters & Names:** The sister is **Srishti**; the brother's real name is **Ishaan** (affectionately called **"Bhai"**, and nicknamed **"Kumbhkaran"** after sleeping very late). His two friends on the second scooter are **Manish** and **Yash** *(the plan does not assume which of the two drove vs. rode pillion)*.
- **Hybrid Narration Perspective:** Second-person **"You"** during active gameplay for immersion, shifting naturally to **"Srishti"** during personal emotional moments.
- **Language & Tone:** **Natural Hinglish** narration and dialogue — organic English blended with natural Hindi expressions (*Bhai*, *Kumbhkaran*, *darshan*, *diya*, *akshat*, *dhaba*, *chai*).
- **Music & Sound Direction:** Cinematic, emotional soundscape blending **mountain ambience, soft acoustic guitar, flute, and emotional piano**.
- **Schedule Strategy:** **No fixed deadline** — quality-first, milestone-based development.

### The Emotional Arc

| Act | Emotional Tone | What the Player Feels |
|-----|---------------|----------------------|
| Prologue | Warmth, curiosity | "How did this bond begin?" |
| Act 1 | Humor, delight, belonging | "These people feel like home." |
| Act 2 | Awe, effort, trust | "We climbed something hard together." |
| Act 3 | Gratitude, ceremony | "This bond is family." |
| Epilogue | Joy, nostalgia | "I want to keep these memories close." |

### Core Historical Beats (Preserved Without Invention)
1. **Kitaabi Dastaan online chats & phone calls → Rishikesh decision** — Srishti and Ishaan met online in the **Kitaabi Dastaan** book community, connected over online chats and phone calls, began calling him **"Bhai"**, and decided to meet in Rishikesh. *(No specific unconfirmed dialogue quotes are invented.)*
2. **The ~2-minute Mahakumbh meeting** — they also shared a brief ~2-minute in-person meeting at Mahakumbh amidst a huge crowd.
3. **Travel to Rishikesh & Shared Hotel Stay** — Ishaan traveled from **Lucknow by train** with his friends; Srishti traveled from **Delhi by bus**. They stayed at the same Rishikesh hotel — **Srishti on the first floor**, and **Ishaan and his friend on the ground floor**.
4. **Day 1 — Group Time & Evening Scooter Maggi** — Srishti initially spent time with her original group; in the evening she went roaming on scooters with Ishaan and his friend and ate Maggi.
5. **Day 2 Morning — Bun Maska, Chai & Kumbhkaran Delay** — Morning included **bun maska and chai** on a lively Rishikesh road. Ishaan and his friend woke up late (earning the playful **"Kumbhkaran"** memory), delaying their departure.
6. **Two scooters on mountain roads + Maggi/chai stop (`Scenes 5–6`)** — Four friends on two scooters (Ishaan driving with Srishti pillion on Scooter 1; Manish and Yash on Scooter 2) riding through scenic Rishikesh mountain roads, viewpoint pull-off, and roadside Maggi & chai tapri.
7. **Neelkanth Mahadev Temple (`Scene 7`)** — Visiting Neelkanth Mahadev Temple courtyard for darshan, brass bell, and oil diya.
8. **Route to Baal Kuwari & Pre-Climb Maggi Stop (`Scene 8`)** — Riding onward along mountain forest roads toward **Baal Kuwari Temple**, stopping for a dedicated **Maggi stop** at the base before beginning the steep climb.
9. **Approximately 400 Stairs at Baal Kuwari (`Scene 9`)** — Climbing ~400 stone forest steps in manageable segments, with **Ishaan accompanying and helping Srishti** along the climb and **Manish & Yash** naturally accompanying the group.
10. **Baal Kuwari Temple Arrival (`Scene 10`)** — Reaching the peaceful summit temple at the top of the stairs for a serene memory moment.
11. **Evening Bus Schedule — Quick Safe Return & Hotel Reunion (`Scenes 11–12`)** — Because Srishti had an evening bus, Ishaan and his friends helped everyone head down and return quickly yet **safely** back to the **hotel** — where **Srishti rejoined her original friends** for a gentle farewell. *(Explicitly does NOT depict Ishaan dropping her directly at the bus stand.)*
12. **Separate Later Epilogue — The Bhai Dooj Tilak (`Scenes 13–14`, Later Phase)** — A separate, later emotional epilogue (not an event during the Rishikesh trip) concluding with an interactive virtual Bhai Dooj tilak, creator's personal letter, and 3D memory gallery.

### Design Principles
- **Low-poly stylized Himalayan aesthetic** — warm, atmospheric, stylized characters and cinematic 3D environments (not a 2D slideshow).
- **Handcrafted feel** — polaroid memories, cozy lantern lighting, warm UI accents.
- **Sound as emotion** — mountain wind, temple bells, bubbling chai, acoustic guitar, flute, and piano.
- **The heartfelt final message is written by the creator only.** It will never be generated or invented by AI.
- **All invented dialogue, visual details, or uncertain staging are marked `[PROPOSED — Requires User Approval]`.**

---

## Section 2: Scene Registry

| Scene ID | Title | Type | Act | Est. Duration | Classification |
|----------|-------|------|-----|--------------|----------------|
| 0 | Loading, Cozy Lamp & Title | SYSTEM | Prologue | 10–20s | [CORE] |
| 1 | Kitaabi Dastaan: 3D Library Reveal | NARRATIVE | Prologue | 60–90s | [CORE] |
| 2 | Mahakumbh Flash (~2 Minutes) | CINEMATIC | Prologue | 20–30s | [CORE] |
| 3 | Kumbhkaran Awakens | GAMEPLAY | Act 1 | 90–120s | [CORE] |
| 4 | Scooter Departure | CINEMATIC | Act 1 | 30–45s | [CORE] |
| 5 | Mountain Road Ride | GAMEPLAY | Act 1 | 3–5 min | [CORE] (Honk/Wave/Cow/Flags: [OPTIONAL]) |
| 6 | Maggi & Chai Stop | GAMEPLAY | Act 1 | 90–120s | [CORE] (Stall owner chat: [OPTIONAL]) |
| 7 | Neelkanth Mahadev | GAMEPLAY | Act 2 | 90–120s | [CORE] |
| 8 | Ride to Baal Kuwari & Base Maggi Stop | GAMEPLAY | Act 2 | 2–3 min | [CORE] (`to_baalkuwari` forest road + distinct pre-climb trailhead Maggi stop) |
| 9 | Baal Kuwari: The ~400 Stairs | GAMEPLAY | Act 2 | 2–3 min | [CORE] (4 segmented hillside flights + Ishaan helping animations + landing checkpoints) |
| 10 | Baal Kuwari Temple Arrival & Summit Memory | CINEMATIC / GAMEPLAY | Act 2 | 90s | [CORE] (Peaceful arrival sweep + courtyard exploration & summit Polaroid) |
| 11 | Evening Safe Return to Rishikesh | GAMEPLAY | Act 3 | 2 min | [CORE] (Time-sensitive yet calm downhill scooter return toward hotel) |
| 12 | Hotel Return, Original Friends & Farewell | GAMEPLAY / CINEMATIC | Act 3 | 90s | [CORE] (Rishikesh hotel courtyard 1st/ground floor context, original group reunion, gentle farewell) |
| 13 | Bhai Dooj Tilak *(Separate Later Epilogue)* | GAMEPLAY | Epilogue | 2–3 min | [CORE] (Deferred past Phase 3 — separate later occasion, not part of Rishikesh trip) |
| 14 | Inspectable 3D Memory Gallery | ENDING/SYSTEM | Epilogue | Open-ended | [CORE] (Deferred past Phase 3) |

**Scene type definitions:**
- **SYSTEM** — engine/UI state or cozy title backdrop
- **NARRATIVE** — animated 3D/panel storytelling; player advances cards
- **CINEMATIC** — auto-played 3D camera sequence; player watches
- **GAMEPLAY** — player has control (movement, interaction, driving, climbing, tilak)
- **ENDING** — persistent interactive 3D/UI gallery; player browses freely

**Total:** 15 states (Scene 0–14)

---

## Section 3: Scene-by-Scene Storyboard

---

### Scene 0 — Loading, Cozy Lamp & Title (SYSTEM · Prologue)

**Camera:** Stylized 3D title backdrop — deep indigo night sky, soft stars, a single glowing cozy reading lamp beside an open book `[CORE]`  
**What happens:**  
Loading screen renders over a warm, tranquil 3D book-and-lamp scene. A page-turning progress indicator fills as core assets preload. Title card appears: *"The Road That Made Us Family"*. Once ready, a soft prompt invites the player to tap/click to unlock Web Audio and begin.

**Narration / Title hook:** `[PROPOSED — Requires User Approval]` *"Kuch kahaniyan kitaabon se shuru hoti hain... aur kuch khud ek kahani ban jaati hain."*  
**Assets loading:** Core character GLBs (Srishti, Ishaan, Manish, Yash), scooter GLB, shared palette atlas, Scene 1 library environment  
**Checkpoint:** None (start of experience)

---

### Scene 1 — Kitaabi Dastaan: 3D Library Reveal (NARRATIVE · Prologue)

**Camera:** Smooth zoom-out from the open book into a warm, stylized 3D curved library room `[CORE]` *(staging is `[PROPOSED]`)*  
**What happens:**  
Using second-person gameplay framing transitioning into Srishti's story, the camera pulls back to reveal an intimate stylized book-club space representing the **Kitaabi Dastaan** online community. Srishti and Ishaan's avatars meet through shared book interests, begin talking and sharing things, and she starts calling him **"Bhai"** — not by blood, but by bond. *(No unsupported claim of voice chat vs. text chat is asserted as historical fact; exact medium is visually stylized `[PROPOSED]`.)*

**Narration card text:** `[PROPOSED — Requires User Approval]` *"Kitaabi Dastaan mein mulaqat hui, baatein shuru huin... aur pata hi nahi chala kab aapne unhe 'Bhai' kehna shuru kar diya."*  
**Player interaction:** Tap/click/`Space` to advance each illustrated 3D panel.  
**Transition out:** Book pages flutter → soft fade to Scene 2

---

### Scene 2 — Mahakumbh Flash (~2 Minutes) (CINEMATIC · Prologue)

**Camera:** Cinematic — brief panoramic sweep through stylized Mahakumbh tents and ghats at dawn `[PROPOSED]`  
**What happens:**  
A deliberately brief (~20–30 second) auto-played cinematic capturing the real historical moment: Srishti and Ishaan briefly met in person at **Mahakumbh** for approximately two minutes amidst a massive crowd. A subtle timer ticks from `00:00` to `02:00` to reflect how brief that first in-person meeting truly was. *(Specific gestures such as waving or laughing are NOT asserted as historical facts; visual character silhouettes are stylized `[PROPOSED]`.)*

**Narration card:** `[PROPOSED — Requires User Approval]` *"Crores ki bheed mein, sirf do minute ki mulaqat. Par asli safar abhi baaki tha."*  
**Transition out:** Crowd ambience fades → dissolve to black → Scene 3

---

### Scene 3 — Kumbhkaran Awakens (GAMEPLAY · Act 1)

**Camera:** Third-person follow behind Srishti inside a stylized morning accommodation room `[PROPOSED — Creative Staging Pending Creator Stay Reference]`  
**What happens:**  
Rishikesh trip morning. Everyone is ready to leave for **Neelkanth Mahadev Temple**, except Ishaan — who slept until very late, earning the playful nickname **"Kumbhkaran"** and delaying their darshan. Walking around the room as Srishti ("You"), the player completes three comedic wake-up interactions `[CORE]` *(specific wake-up props and sequence are `[PROPOSED — Creative Wake-up Staging, Not Claimed as Historical Fact]`)*:
1. **Snooze/Ring the Alarm Clock** (`E` / Tap) → triggers comedic snooze-slap animation `[PROPOSED]`.
2. **Splash Water Bottle** (`E` / Tap) → Ishaan groans and rolls over `[PROPOSED]`.
3. **Knock on the Headboard** (`E` / Tap) → Kumbhkaran finally wakes up with a dramatic cartoon spring-up reaction `[PROPOSED]`.

**Narration card:** `[PROPOSED — Requires User Approval]` *"Neelkanth nikalna tha, par Bhai apni hi duniya mein so rahe the. Tabhi toh naam pada — Kumbhkaran."*  
**Transition out:** Ishaan stretches and grabs his gear → cut to Scene 4

---

### Scene 4 — Scooter Departure (CINEMATIC · Act 1)

**Camera:** Cinematic — exterior morning reveal, orbiting around the two parked scooters  
**What happens:**  
Auto-play cinematic outside the Rishikesh stay. Four people, two scooters: **Ishaan** drives Scooter 1 with **Srishti** seated behind him; his two friends **Manish** and **Yash** mount Scooter 2 *(without assuming or hardcoding which friend drove vs. sat pillion)*. Engines start, mountain mist clears ahead, and the camera swings smoothly behind Scooter 1 for a seamless handoff to manual control.

**Characters:** Ishaan (driver, Scooter 1) · Srishti (pillion, Scooter 1) · Manish & Yash (Scooter 2)  
**Transition out:** Cinematic ends → seamless handoff to player control → Scene 5

---

### Scene 5 — Mountain Road Ride (GAMEPLAY · Act 1)

**Camera:** Third-person follow camera with tuned spring lag, slightly elevated to frame the Himalayan valley  
**What happens:**  
The core riding scene (`[CORE]`). You steer Scooter 1 (Ishaan driving, Srishti riding pillion) along a scenic `CatmullRomCurve3` mountain road winding through Rishikesh pine forests and river gorges. Scooter 2 (**Manish & Yash**) rides dynamically alongside/behind on the same route `[CORE]`.

**Mechanics & Features:**
- **`[CORE]`** Delta-time movement (meters/second), manual steering, throttle, and braking (no high-speed reverse driving on mountain roads; brake stops cleanly within ~6m from top speed).
- **`[CORE]`** Soft road boundaries + guardrail clearance account for scooter half-width (`0.4m`), clamping center offset at `±2.9m` within the `7.0m` road surface while preserving smooth steering.
- **`[CORE]`** Scooter 2 spawns staggered behind/beside Scooter 1 ($t=0$ offset) and runs a constrained follow-distance controller (`3.0m–7.0m` bounded gap, settling to `~4.5m` steady cruise).
- **`[CORE]`** Deterministic route-end arrival zone (`remainingDistance <= 18.0m`) smoothly slows and parks both scooters side-by-side at the roadside dhaba.
- **`[OPTIONAL]`** Companion Honk / Wave flourish: occasional friendly horn/wave animation from Manish & Yash on Scooter 2.
- **`[OPTIONAL]`** Roadside Prayer Flag narration moments (`[PROPOSED]` brief Rishikesh captions).
- **`[OPTIONAL]`** Cow on Road encounter: friendly honk prompt triggers a lighthearted detour animation `[PROPOSED]`.

**Interaction points:** Roadside scenic pull-off viewpoints (`[CORE]`) — slow down and stop to trigger a polaroid capture.  
**Transition out:** Route-end arrival apron at the roadside dhaba → Scene 6

---

### Scene 6 — Maggi & Chai Stop (GAMEPLAY · Act 1)

**Camera:** Third-person walk mode, warm and intimate  
**What happens:**  
The two scooters stop at a cozy roadside dhaba overlooking the valley. Walking freely around the clearing, you interact with the restored dhaba moments `[CORE]`:
- **Eat Hot Maggi Bowl** (`E` / Tap) → rising steam particles, Srishti takes a happy bite with a warm joy animation `[CORE]`.
- **Sip Mountain Chai** (`E` / Tap) → warm ambient glow and comforting Hinglish reflection `[CORE]`.
- **Take a Dhaba Photo** (`P` / Shutter button) → captures a stylized polaroid that animates onto your memory collection `[CORE]`.
- **Stall Owner Greeting** (`E` / Tap) → stall uncle nods warmly with a simple *"Dhanyawad"* `[OPTIONAL] / [PROPOSED]`.

**Narration card:** `[PROPOSED — Requires User Approval]` *"Pahaadon ki thandi hawa, garma-garam Maggi aur chai... aur saath mein apne log."*  
**Transition out:** Walk back to the parked scooters → Scene 7

---

### Scene 7 — Neelkanth Mahadev (GAMEPLAY · Act 2)

**Camera:** Third-person walk mode; gentle framing zoom near temple sanctum  
**What happens:**  
Despite Kumbhkaran's late morning delay, the group reaches **Neelkanth Mahadev Temple**. You explore the stone courtyard and complete sacred interactions `[CORE]`:
1. **Ring the Temple Bell** (`E` / Tap) → deep resonant chime + subtle visual ripple `[CORE]`.
2. **Light a Diya (Oil Lamp)** (`E` / Tap) → Srishti lights an unlit clay diya at the temple stand, bringing the warm golden flame to life (`[CORE]` — replaces passive flame-cupping alone; exact stand staging `[PROPOSED]`).
3. **Darshan Pause** — brief tranquil camera pan showing the temple courtyard framed by mountains `[CORE]` *(camera framing `[PROPOSED]`)*.

**Narration card:** `[PROPOSED — Requires User Approval]` *"Der se hi sahi, par Neelkanth Mahadev ke darshan ho hi gaye — Kumbhkaran ki neend ke baad bhi."*  
**Checkpoint committed** only after Scene 7 mounts ready.  
**Transition out:** Walk back toward the scooters to set off for the next destination → cut to Scene 8

---

### Scene 8 — Ride to Baal Kuwari & Pre-Climb Maggi Stop (GAMEPLAY · Act 2)

**Camera:** Third-person scooter follow on shadowed forest mountain curves → third-person walk mode at the trailhead base clearing  
**What happens:**  
Leaving **Neelkanth Mahadev Temple** back on their parked scooters, all four friends ride along a scenic forest mountain route (`segment: 'to_baalkuwari'`) toward the **Baal Kuwari** trailhead `[CORE]`. At the trailhead clearing beneath tall trees and the stone staircase gate, the group pauses at a distinct **pre-climb roadside Maggi stall** before beginning the ~400-step ascent `[CORE]`. *(Visually separate from Scene 6's valley overlook dhaba.)*

**Director's note:** Neelkanth Mahadev and Baal Kuwari Temple are **two separate destinations** connected by this scooter journey, and eating Maggi before starting the stairs preserves the real sequence without invented dialogue.  
**Transition out:** Gather at the base archway & step onto the stone steps (`Press E`) → Scene 9

---

### Scene 9 — Baal Kuwari: The ~400 Stairs (GAMEPLAY · Act 2)

**Camera:** Third-person walk/climb follow looking smoothly up angled stone flights beneath Himalayan trees  
**What happens:**  
At the foot of Baal Kuwari, Srishti climbs a forested hillside staircase representing **~400 stone steps**, organized cleanly into **4 playable segmented flights (~100 steps per flight)** joined by flat rest landings at ~100, ~200, and ~300 steps so steady walking/climbing feels tactile rather than 400 repetitive taps `[CORE]`.

**Mechanics:**
- Smooth walking movement ascends stair treads naturally with articulated climb steps and a calm HUD tracker (`Step ~X / 400 · Flight Y/4`) `[CORE]`.
- **Ishaan's Supportive Climb Assistance:** On steeper upper stretches and rest landings, Ishaan slows beside or slightly ahead of Srishti, turns back with a helping-hand reach animation (`E` / Tap `"Take Ishaan's Hand"`), and climbs steadily with her (`[CORE]`).
- **Manish & Yash** accompany the group along the staircase flights and pause warmly on landings `[CORE]`.
- Rest-landing overlook Polaroid memory `[OPTIONAL]`.

**Checkpoint committed** at step ~200 landing (`stairStepCount: 200`).  
**Transition out:** Reaching step ~400 crests onto the hilltop courtyard arch → Scene 10

---

### Scene 10 — Baal Kuwari Temple Arrival & Summit Memory (CINEMATIC / GAMEPLAY · Act 2)

**Camera:** Brief tranquil arrival sweep (~5–6s, skippable) revealing the hilltop shrine, transitioning smoothly into summit courtyard walk camera  
**What happens:**  
Srishti, Ishaan, Manish, and Yash arrive at peaceful **Baal Kuwari Temple** perched above the pines `[CORE]`. After taking in the serene summit view, Srishti can ring the small summit bell, take a hilltop group Polaroid (`scene10_baalkuwari`), and receive a gentle **evening bus reminder** to head down calmly together before dusk `[CORE]`.

**Transition out:** Head toward the descent trail / gate (`Press E`) → Scene 11

---

### Scene 11 — Evening Safe Return to Rishikesh (GAMEPLAY · Act 3)

**Camera:** Warm golden-hour mountain follow framing both scooters cruising steadily downhill (`segment: 'to_hotel_return'`)  
**What happens:**  
Because Srishti has an evening bus back toward Delhi, Ishaan and his friends organize a brisk, coordinated **time-sensitive yet safe** return ride down through warming afternoon light toward their Rishikesh hotel `[CORE]`. Emphasizes steady lane keeping, calm braking around gentle traffic, and Scooter 2 keeping close escort—with zero reckless speeding or stunt mechanics `[CORE]`.

**Transition out:** Pull smoothly off at the hotel forecourt → Scene 12

---

### Scene 12 — Return to Rishikesh Hotel, Original Friends & Gentle Farewell (GAMEPLAY / CINEMATIC · Act 3)

**Camera:** Warm early-evening third-person walk camera outside the Rishikesh hotel courtyard showing its ground-floor veranda (Ishaan & friends' room floor) and first-floor exterior balcony/stairs (Srishti's room floor)  
**What happens:**  
Back in the shared hotel courtyard, parked scooters rest beside the entrance as Srishti walks with Ishaan, Manish, and Yash toward **Srishti's original group of friends** waiting by the hotel steps `[CORE]`. Srishti interacts (`E` / Tap `"Rejoin Original Friends & Farewell"`) to reunite with her group while Ishaan, Manish, and Yash share a warm, gentle farewell wave and closing trip Polaroid (`scene12_hotel_farewell`) — closing the Rishikesh trip cleanly (`End of Phase 3 Story`) and pointing to the **separate later Bhai Dooj Epilogue** ahead (`Phase 4+`) without depicting Ishaan directly dropping her at the bus stand `[CORE]`.

**Transition out:** Phase 3 Completion / Chapter Log Replay (`Scenes 13–14` preserved for the later Bhai Dooj Epilogue phase)

---

### Scene 13 — Bhai Dooj Tilak (GAMEPLAY · Act 3)

**Camera:** Fixed — intimate medium-close front view facing Ishaan, with a brass puja thali and diya in the warm foreground `[CORE]` *(exact ceremonial prop layout — roli bowl, akshat rice grains, mithai, brass diya — `[PROPOSED — Ceremonial Staging Pending Creator Confirmation]`)*  
**What happens:**  
The emotional finale. Srishti performs the **interactive Bhai Dooj tilak** for Ishaan (`[CORE]`), followed by the heartfelt personal message.

**Interaction Mechanics (Both Modes Share All 4 Steps — Exact Sequence `[PROPOSED]`):**
- **Mode A: Draw Mode `[CORE]`**
  1. *Pick up Roli:* Click/tap the roli bowl on the thali; tip glows warm vermilion.
  2. *Draw the Tilak:* Click/touch and drag upward between Ishaan's eyebrows along a soft vertical guide; reaching the 70% stroke threshold sets the tilak cleanly with a gentle chime.
  3. *Offer Akshat (Rice Grains):* Tap the rice bowl on the thali to gently place akshat grains onto the tilak (`[CORE]` preserved ritual beat).
  4. *Light / Steady the Diya Flame:* Click/hold the brass diya so the warm flame lights/brightens and bathes the scene in golden light.
- **Mode B: Tap-to-Apply Accessibility Mode `[CORE Accessibility]`**
  - An explicit toggle (`"Draw Mode / Tap Mode"`) lets any player on small screens or with touch/motor constraints complete the exact same 4 steps via simple guided taps: **Step 1 Tap Roli → Step 2 Tap Forehead (applies tilak) → Step 3 Tap Akshat (places rice) → Step 4 Tap Diya (lights/brightens flame)**. No steps are skipped.

**Finale Flourish & Personal Message:**
- Ishaan smiles warmly; optional soft **celebration flowers/petals** bloom gently around the frame `[OPTIONAL]`, and collected polaroids float gently toward the finale gallery.
- The **heartfelt personal message** written exclusively by the creator opens on screen. **AI will never generate or alter this message.**

**Checkpoint committed** at scene mount.  
**Transition out:** Message acknowledged → soft golden dissolve → Scene 14

---

### Scene 14 — Inspectable 3D Memory Gallery (ENDING/SYSTEM · Epilogue)

**Camera:** Interactive 3D orbital inspection camera around floating polaroid cards `[CORE]`  
**What happens:**  
Restored from the original vision: all collected polaroids float gently in a warm 3D memory space `[CORE]`. Players can **orbit/rotate the 3D gallery** and **click/tap any polaroid** to enlarge it cleanly with its illustrated artwork and story caption (including an accessible 2D reader overlay for mobile legibility). The creator's heartfelt Bhai Dooj message remains accessible to re-read anytime.

**Additional elements:**
- **`[OPTIONAL]`** "Save Keepsake Poster" button generating a downloadable composite of collected polaroids + title.
- Soft ambient piano/flute/guitar music loops gently; no timer or forced exit.

**Exit:** Player closes tab or restarts journey from beginning.

---

## Section 4: Gameplay Mechanics & Unified Controls

### Scene-by-Scene Mechanics Table

| Scene | Mechanics Active | Classification |
|-------|-----------------|----------------|
| 0 | Cozy lamp & open book 3D title backdrop; loading UI & progress bar | [CORE] |
| 1 | 3D library reveal; narrative panel advance (tap/click/`Space`) | [CORE] |
| 2 | Auto-play Mahakumbh ~2-min flash cinematic | [CORE] |
| 3 | Walk mode; Kumbhkaran wake-up interactions (Alarm clock, Water bottle splash, Headboard knock) | [CORE] |
| 4 | Auto-play two-scooter departure cinematic | [CORE] |
| 5 | Spline-based scooter driving; Scooter 2 AI-follow; soft boundaries + guardrails; route-end stopping; polaroid stops | [CORE] (Honk/Wave/Cow/Prayer flags: [OPTIONAL]) |
| 6 | Third-person walk mode; dhaba interactions (eat Maggi, sip chai, take dhaba photo) | [CORE] (Stall owner chat: [OPTIONAL]) |
| 7 | Neelkanth walk mode; ring temple bell; light a diya; darshan pause | [CORE] |
| 8 | Auto-play cinematic scooter ride connecting Neelkanth Mahadev to Baal Kuwari | [CORE] |
| 9 | ~400 stairs climb rhythm; step counter; rest landings; Ishaan hand-assist interaction | [CORE] (Rest-landing polaroids: [OPTIONAL]) |
| 10 | Auto-play Baal Kuwari temple arrival reveal cinematic at top | [CORE] |
| 11 | Free walk exploration; viewpoints; guaranteed Srishti + Ishaan mountain polaroid | [CORE] (Companion chats & bonus viewpoint: [OPTIONAL]) |
| 12 | Auto-play dusk descent cinematic ride home | [CORE] |
| 13 | Interactive Bhai Dooj tilak (Draw Mode & 4-step Tap-to-Apply Mode: Roli → Forehead → Akshat → Diya); creator letter | [CORE] (Finale flowers: [OPTIONAL]) |
| 14 | Inspectable floating 3D memory gallery (rotate/click polaroids + readable overlay); creator letter access | [CORE] (Share poster: [OPTIONAL]) |

---

### Scooter Movement, Spline Physics & Route-End Rules [CORE]

Rather than fragile open-world physics, driving uses a **guided spline-road architecture** that guarantees cinematic camera framing while giving the player satisfying manual control:

1. **Spline Representation:**
   - Road centerline is defined by a 3D `THREE.CatmullRomCurve3` with uniform arc-length parameterization.
   - At any normalized progression $t \in [0, 1]$, the spline provides world position $\mathbf{P}(t)$, unit forward tangent $\mathbf{T}(t)$, and lateral right normal $\mathbf{R}(t)$.

2. **Delta-Time Movement, Braking & Stopping Distance:**
   - Forward scooter speed is integrated in meters/second (never units/frame):
     $$\text{speed} = \operatorname{clamp}\left(\text{speed} + (\text{throttle} \cdot a_{\text{accel}} - \text{brake} \cdot a_{\text{brake}}) \cdot \Delta t - v_{\text{drag}} \cdot \text{speed} \cdot \Delta t,\; 0,\; v_{\text{max}}\right)$$
     with cruising top speed $v_{\text{max}} = 12.0\,\text{m/s}$ and braking deceleration $a_{\text{brake}} = 12.0\,\text{m/s}^2$ (predictable full stop within $\approx 6.0\,\text{m}$ so players can easily pull over at roadside viewpoints).
   - Spline distance advancement: $\Delta d = \text{speed} \cdot \Delta t$; $\Delta t_{\text{spline}} = \Delta d / \text{totalSplineLength}$.
   - **No High-Speed Reverse:** Holding `S` / `↓` decelerates smoothly to `0 m/s`. *(Optional slow foot-push reposition at `≤ 1.0 m/s` applies only if already stopped and explicitly stepping back at a missed pull-off; scooters do not race backward down mountain roads.)*

3. **Scooter Width Clearance, Lateral Motion & Soft Boundaries:**
   - The road surface is $W = 7.0\,\text{m}$ wide ($[-3.5\,\text{m}, +3.5\,\text{m}]$). Accounting for a stylized scooter body half-width of $0.4\,\text{m}$ ($0.8\,\text{m}$ full width), safe centerline lateral limits keep the outer wheels clear of guardrails and cliff edges:
     - **Lateral Integration & Visual Lean:** Steering applies lateral velocity $v_x$ smoothed by $\Delta t$ so $x \leftarrow \operatorname{clamp}(x + v_x \cdot \Delta t, -2.9\,\text{m}, +2.9\,\text{m})$ (outer chassis stays within $\pm 3.3\,\text{m}$, preserving $0.2\,\text{m}$ safety clearance inside the $3.5\,\text{m}$ road edge). The scooter visual group rolls proportionally (bank/lean up to $\pm 15^\circ$) and applies a subtle heading yaw offset ($\pm 10^\circ$ relative to $\mathbf{T}(t)$).
     - **Soft Boundary Restoring Force:** Beyond $|x| > 2.3\,\text{m}$, a smooth spring acceleration nudges the scooter gently back toward the lane:
       $$a_{\text{restore}} = -\operatorname{sign}(x) \cdot (|x| - 2.3) \cdot k_{\text{spring}}$$

4. **Constrained Companion Follow-Distance Controller (Scooter 2 — Manish & Yash):**
   - **No Overlap at Spawn:** At Scene 5 entry ($t=0$), Scooter 1 spawns at $d_1(0) = 6.0\,\text{m}$, $x_1 = +1.1\,\text{m}$, while Scooter 2 spawns staggered behind in the adjacent lane at $d_2(0) = 1.5\,\text{m}$, $x_2 = -1.2\,\text{m}$.
   - **Constrained Rubber-Band Damping:** Pure exponential damping lags beyond a tight margin under sudden acceleration or hard braking. Therefore, Scooter 2 uses damped tracking toward $4.5\,\text{m}$ **plus a hard bounded follow-gap clamp** $[3.0\,\text{m}, 7.0\,\text{m}]$:
     $$d_2^{\text{raw}} = \operatorname{damp}\left(d_2,\; d_1 - 4.5\,\text{m},\; \lambda_{\text{smooth}},\; \Delta t\right)$$
     $$d_2 = \operatorname{clamp}\left(d_2^{\text{raw}},\; d_1 - 7.0\,\text{m},\; d_1 - 3.0\,\text{m}\right)$$
     Since scooter length is $\approx 1.8\,\text{m}$, enforcing $d_1 - d_2 \ge 3.0\,\text{m}$ guarantees zero rear-end clipping even under full braking, while $d_1 - d_2 \le 7.0\,\text{m}$ keeps Manish & Yash visibly framed behind/beside Scooter 1 (settling cleanly to $\approx 4.5\,\text{m}$ during steady cruising) in adjacent track $x_2 = -1.2\,\text{m}$.

5. **Deterministic Route-End Stopping & Final Parking (Dhaba Arrival):**
   - Entering the final **$18.0\,\text{m}$** of the spline (`remainingDistance <= 18.0m`, roughly $3\times$ braking distance) activates the **Arrival Assist Zone**: player throttle overrides smoothly taper, speed lerps cleanly to `0 m/s` at the route terminus, and both scooters glide into non-overlapping side-by-side dhaba parking slots ($x_1 = +1.3\,\text{m}$, $x_2 = -1.3\,\text{m}$, $2.6\,\text{m}$ lateral separation) before prompting entry to Scene 6.

---

### Unified Control Reference Table

| Action | Desktop Keyboard | Desktop Mouse | Mobile Touch (Option A: Joystick) | Mobile Touch (Option B: Dual-Zone Buttons) |
|--------|-----------------|---------------|----------------------------------|-------------------------------------------|
| **Driving (Scooter)** | | | | |
| Throttle / Accelerate | `W` / `↑` | — | Left-zone joystick up | Right-zone: Green "Gas" pedal |
| Brake / Slow Down | `S` / `↓` | — | Left-zone joystick down | Right-zone: Red "Brake" pedal |
| Steer Left | `A` / `←` | — | Left-zone joystick left | Left-zone: "◄ Steer Left" |
| Steer Right | `D` / `→` | — | Left-zone joystick right | Left-zone: "Steer Right ►" |
| Companion Honk `[OPTIONAL]` | `H` | — | Dedicated horn icon | Dedicated horn icon |
| **Walking & Exploration** | | | | |
| Move Forward / Back | `W` / `S` (or `↑`/`↓`) | — | Left-zone joystick up / down | Left-zone D-pad up / down |
| Strafe Left / Right | `A` / `D` | — | Left-zone joystick left / right | Left-zone D-pad left / right |
| Orbit / Look Around | `Q` / `R` (or `←`/`→` in walk mode) | Click + drag on canvas | Right-zone one-finger drag | Right-zone one-finger drag |
| **Interactions** | | | | |
| Interact / Confirm | `E` / `Enter` | Left click target | Tap target / HUD action button | Tap target / HUD action button |
| Advance Dialogue / Climb | `Space` / `Enter` | Left click card | Tap card / step prompt | Tap card / step prompt |
| Capture Polaroid | `P` | Click shutter button | Tap shutter button | Tap shutter button |
| Tilak Draw Mode | — | Left click + drag up | Touch + drag up on forehead | Touch + drag up on forehead |
| Tilak Tap-to-Apply Mode | `Space` / `Enter` | Left click step target | 4-step tap (Roli → Forehead → Akshat → Diya) | 4-step tap (Roli → Forehead → Akshat → Diya) |
| **System & Menus** | | | | |
| Pause / Menu | `Esc` | Click pause icon | Tap pause icon (top right) | Tap pause icon (top right) |
| Guided Mode `[OPTIONAL]` | `G` | Click firefly toggle | Tap firefly toggle | Tap firefly toggle |
| Audio Mute Toggle | `M` | Click speaker icon | Tap speaker icon | Tap speaker icon |

### Input Conflict, Focus Loss & Multitouch Ownership Rules [CORE]
1. **Zero Duplicate Bindings:** `E` is reserved strictly for **Interact / Confirm**. Camera keyboard orbit uses `Q`/`R` (plus `←`/`→` during on-foot exploration only, where driving arrows aren't active).
2. **Focus Loss & Pointer Cancellation:** Listening to `window` `blur`, `document` `visibilitychange`, and `pointercancel` immediately clears `pressedKeys.clear()`, resets virtual joystick/pedal outputs to `0`, and cleanly resets any incomplete tilak stroke so controls never become "stuck".
3. **Multitouch `pointerId` Ownership:** Each touch surface tracks explicit `pointerId` tokens (`movePointerId` on the left movement/steer zone; `actionPointerId` on right-zone gas/brake pedals or camera swipe). Releasing one thumb never cancels the other thumb's active pointer.
4. **Browser Gesture Suppression:** Interactive canvases and mobile control layers apply CSS `touch-action: none` and `user-select: none` to block accidental pinch-zoom, pull-to-refresh, or text highlighting.

### Guided Mode — Firefly Companion [OPTIONAL]
When Guided Mode is enabled, a small, glowing firefly spirit drifts gently toward the active interaction objective or along the mountain route. It provides soft visual guidance without obscuring dialogue or forcing automated camera hijacks.

---

## Section 5: Character & Environment Art Direction

### Visual Style
- **Low-poly stylized** — warm, expressive, hand-painted diorama feel (inspired by *A Short Hike* and Studio Ghibli naturalism).
- **Warm palette** — ochre, terracotta, pine green, Himalayan slate blue, dusk amber, diya gold.
- **Handcrafted feel** — slight texture noise on surfaces, hand-drawn UI borders, polaroid frames.
- **Music & Audio Palette (Approved)** — continuous mountain wind/ambience layered with soft acoustic guitar, expressive flute, and emotional piano.

### Character Designs

| Character | Real Name & Role | Stylized Design Notes *(Visual styling `[PROPOSED — Pending Photo Reference]`)* |
|-----------|------------------|-------------------------------------------------------------------------------------|
| **Srishti** (Player) | Younger sister; pillion on Scooter 1 | Warm-toned stylized traveler silhouette, backpack, travel outfit adapted from creator photo references. |
| **Ishaan** ("Bhai" / "Kumbhkaran") | Elder brother figure; driver on Scooter 1 | Taller stylized silhouette; tousled sleepy hair in Scene 3; casual riding outfit adapted from photo references. |
| **Manish** | Friend on Scooter 2 | Distinct stylized silhouette & travel jacket/hoodie adapted from photo references. *(Plan does not assume whether Manish or Yash drove Scooter 2.)* |
| **Yash** | Friend on Scooter 2 | Distinct stylized silhouette & travel outfit/backpack adapted from photo references. *(Plan does not assume whether Manish or Yash drove Scooter 2.)* |

### Character Rig — Mixamo-Compatible Humanoid Skeleton
All characters use a Mixamo-compatible humanoid skeleton hierarchy:

```
Hips
  └─ Spine
       └─ Chest
            ├─ Neck
            │    └─ Head
            ├─ LeftShoulder → LeftArm → LeftForeArm → LeftHand
            └─ RightShoulder → RightArm → RightForeArm → RightHand
  ├─ LeftUpLeg → LeftLeg → LeftFoot → LeftToeBase
  └─ RightUpLeg → RightLeg → RightFoot → RightToeBase
```

This replaces the previous "3-bone rig" concept. A standard Mixamo-compatible skeleton allows:
- Reuse of Mixamo animation library clips
- Standard retargeting between characters
- Animation blending in Three.js `AnimationMixer`

### Environment Palette Table

| Environment | Primary Colors | Accent Colors | Mood |
|-------------|---------------|---------------|------|
| Loading & Kitaabi Dastaan 3D library `[PROPOSED]` | Deep indigo, warm wood, paper cream | Cozy reading lamp amber | Intimate, literary |
| Mahakumbh `[PROPOSED]` | Saffron, marigold, white | River silver | Vast, fleeting |
| Rishikesh stay morning `[PROPOSED]` | Warm sandstone, terracotta | Morning gold | Sleepy, playful |
| Mountain road | Pine green, rock grey, sky blue | Prayer flag colors | Open, adventurous |
| Roadside dhaba | Warm wood, iron kadhai grey | Steam white, chai gold | Cozy, ground-level |
| Neelkanth Mahadev temple | Stone grey, marigold, vermillion | Lit diya gold | Sacred, serene |
| Baal Kuwari approach path & ~400 stairs | Deep forest green, pale limestone | Sun shafts, flags | Effortful, ascending |
| Baal Kuwari temple (summit) | White stone, gold, open sky | Panoramic blue | Earned, expansive |
| Home — Bhai Dooj ceremony `[PROPOSED]` | Warm interior amber, wood | Diya glow, marigold | Ceremonial, tender |

### Lighting & Time-of-Day Progression

| Scene | Time of Day | Sun Angle | Ambient Color | Fog Density |
|-------|-------------|-----------|---------------|-------------|
| 0–1 | Cozy evening/night indoor | None (reading lamp `PointLight`) | Deep indigo + warm amber | Low |
| 2 | Dawn (Mahakumbh flash) | Low (5–15°) | Blue-gold | Medium-high |
| 3–4 | Late morning (after Kumbhkaran delay) | Rising (35–50°) | Warm morning gold | Low-medium |
| 5 | Late morning | High (55–65°) | Clear mountain blue-white | Low |
| 6–7 | Midday to early afternoon | High-mid (65–75°) | Warm neutral light | Very low |
| 8–10 | Mid-afternoon | Descending (40–55°) | Warm golden shift | Low |
| 11 | Late afternoon / golden hour | Low (20–30°) | Long shadows, rich amber | Low-medium |
| 12 | Dusk | Very low (5–10°) | Purple-orange twilight | Medium |
| 13–14 | Indoor evening | None (diya `PointLight`) | Warm diya orange-gold | None |

---

## Section 6: Technology Stack & Dependency Baseline

### Core Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16 (App Router) | Routing, SSR shell, metadata, Vercel deployment |
| 3D Rendering | React Three Fiber (R3F v9) | Declarative Three.js in React 19 |
| 3D Helpers | @react-three/drei v10 | Camera controls, loaders (`useGLTF`), helpers |
| Physics | @react-three/rapier v2 | Rigid-body scooter physics (`[DEFERRED]`) |
| State Management | Zustand v5 | UI state, `requestedSceneId`/`committedSceneId`, checkpoints |
| Animation | GSAP | Scoped cinematic camera & transition timelines |
| Styling | Tailwind CSS v4 | UI overlays, responsive HUD |
| UI Animation | Motion (`motion/react`) | React 19 compatible UI panel transitions |
| Audio | Howler.js | Ambient audio, sound effects, music cues |
| Performance Detection | Native WebGL2 Probe + Rolling FPS Monitor | Offline-safe quality profile selection (`High / Balanced / Low`) |
| External GPU Benchmark | `@pmndrs/detect-gpu` (`[DEFERRED]`) | Deferred to post-v1.0 QA unless verified & benchmark-hosted locally |
| Mobile Joystick | nipple.js | Virtual joystick for touch controls |
| Language | TypeScript | Strict static typing |
| 3D Authoring | Blender | Low-poly stylized asset creation & NLA animation |
| Compression | `@gltf-transform/cli` + Draco | GLB mesh & WebP texture compression |

### Verified Compatible Dependency Baseline [CORE]

> **Runtime & Lifecycle Policy (Verified Baseline):**  
> - **Node.js Requirement:** **`>=20.9.0`** (LTS) required by Next.js 16 and modern ESM build tooling.  
> - **Next.js Support Status:** Next.js 14 is EOL/unsupported. **Next.js 15 remains in Maintenance LTS with security patches through January 31, 2027** (not unsupported). **Next.js 16** (Active LTS) is selected as our clean new-project baseline and pairs with **React 19** (`peerDependencies: react ^19.0.0`).  
> - **Lockfile & Peer-Range Discipline:** React 19 must **not** drift beyond `@react-three/fiber`'s declared `<19.4` peer range (`>=19 <19.4`). Therefore, `react` and `react-dom` MUST use an exact pin (or tilde pin within `19.3.x`, never an unbounded `^19.x` caret) alongside a committed **`package-lock.json`** (`npm ci`).  
> - **Motion / Framer Motion Note:** Legacy `framer-motion` (<v12) conflicted with React 19; **`framer-motion` v12+ and its successor `motion` (`motion/react`) both support React 19** (Framer Motion does not universally conflict with React 19). We standardize on `motion` (`motion/react`) for clean new-project imports.  
> - **External GPU Benchmark Deferral:** Because `@pmndrs/detect-gpu` package metadata could not be directly verified from raw npm registry JSON in offline Phase 0 and external GPU lookup defaults to UNPKG CDN benchmark fetches, external benchmark-based GPU detection is **`[DEFERRED]`**. `[CORE]` quality scaling uses zero-dependency native WebGL2/hardware heuristics + rolling runtime FPS adaptation (`high / balanced / low`).  
> - **Implementation-Time Registry Gate:** Before running `npm install`, confirm exact live patch & peer metadata via `npm view <pkg> version peerDependencies` and lock exact compatible versions into `package.json` + `package-lock.json`.

| Package | Target Baseline | Lockfile Pinning Policy | Peer Compatibility & Notes |
|---------|----------------|------------------------|----------------------------|
| `next` | `16.4.6` (Active LTS) | Lock exact in `package-lock.json` | Requires Node `>=20.9.0`, React `^19.0.0`, TS `>=5.1.0` |
| `react` | `19.3.1` | **Exact pin (`"19.3.1"`)** | Strictly stays inside R3F v9 `>=19 <19.4` peer range |
| `react-dom` | `19.3.1` | **Exact pin (`"19.3.1"`)** | Must match `react` exact version |
| `@react-three/fiber` | `9.8.2` | Exact / verified `9.8.x` | PeerDeps: `react >=19 <19.4`, `three >=0.156` |
| `@react-three/drei` | `10.7.9` | Exact / verified `10.7.x` | Aligned with R3F v9, React 19, modern `three` |
| `three` | `0.186.1` | Exact / aligned with types | Matched to `@types/three` (`0.186.x`) |
| `@types/three` | `0.186.0` | Exact / aligned with `three` | TypeScript definitions aligned with `three` |
| `zustand` | `5.1.0` | Exact / `~5.1.0` | React 19 compatible UI/progress store |
| `gsap` | `3.15.1` | Exact / `~3.15.0` | Scoped timelines (`gsap.context`) for 3D transitions |
| `motion` | `14.11.1` | Exact / `~14.11.0` | React 19 compatible; import from `motion/react` |
| `howler` | `2.2.4` | Exact (`2.2.4`) | Audio sprites & mute-safe Web Audio control |
| `@types/howler` | `2.2.13` | Exact (`2.2.13`) | Type definitions for Howler |
| `nipplejs` | `1.0.4` | Exact / `~1.0.4` | Touch virtual joystick |
| `tailwindcss` | `4.3.5` | Exact / `~4.3.0` | Tailwind v4 via `@tailwindcss/postcss` and `postcss` |
| `typescript` | `>=5.1.0` (verified `5.9.x` / `7.0.2`) | Lock exact in `package-lock.json` | Next.js 16.3+ supports TS 5.1+ through TS 7.x |
| `@react-three/rapier` | `2.x` | **[DEFERRED]** | Post-v1.0 rigid-body physics (v2 supports React 19 + R3F v9) |
| `@pmndrs/detect-gpu` | *(Verify via `npm view` before use)* | **[DEFERRED]** | Post-v1.0 QA evaluation; replaced for `[CORE]` by native WebGL2/FPS probe |

**Next.js Configuration & Lockfile Verification (at Phase 1A start):**
1. Verify Node.js (`node -v` shows `>=20.9.0`) and verify live npm peer compatibility before locking `package.json`:
   ```bash
   npm view @react-three/fiber peerDependencies
   ```
2. Configure `next.config.mjs` to transpile 3D ecosystem packages cleanly:
   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
   };
   export default nextConfig;
   ```
3. Commit `package-lock.json` and verify resolved tree with zero `ERESOLVE` overrides or mismatched React peers:
   ```bash
   npm ls next react react-dom @react-three/fiber @react-three/drei three
   ```

---

### Valid Next.js Browser-Only Canvas Boundary [CORE]

In the Next.js App Router, attempting to invoke `next/dynamic` with `{ ssr: false }` inside a Server Component (`app/page.tsx`) causes evaluation errors.

To enforce a strict browser-only Canvas boundary:
1. `src/app/page.tsx` remains a Server Component for metadata, Open Graph tags, and root layout.
2. `src/components/canvas/ExperienceWrapper.tsx` is a Client Component (`'use client'`) that dynamically imports `Experience.tsx` with `{ ssr: false }` and renders `<LoadingScreen />` immediately during SSR/hydration.
3. At client module initialization inside `Experience.tsx`, configure local Draco decoding once globally: `useGLTF.setDecoderPath('/draco/')`.

```tsx
// src/components/canvas/ExperienceWrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

const Experience = dynamic(() => import('@/components/canvas/Experience'), {
  ssr: false,
  loading: () => <LoadingScreen progress={0} status="Initializing Himalayan Journey..." />,
});

export default function ExperienceWrapper() {
  return <Experience />;
}
```

---

### WebGL2 Requirement, Context Loss & Fallback Strategy [CORE]

1. **Strict WebGL2 Hardware Requirement:**
   - Modern `three` (`>=0.163`, including `0.186.x`) requires **WebGL2** and does **not** support WebGL 1 fallback rendering.
   - Before mounting `<Experience />`, `ExperienceWrapper` tests specifically for WebGL2 support (`const gl = testCanvas.getContext('webgl2')`) using an off-DOM probe canvas, immediately releasing the test context (`gl?.getExtension('WEBGL_lose_context')?.loseContext()`) so no GPU slot leaks.
   - If WebGL2 is unavailable, blocked, or disabled, immediately mount `<FallbackStorybookView />` — a responsive 2D illustrated storybook delivering all 15 scenes, Hinglish narration, polaroid gallery, audio cues, interactive 4-step tilak fallback, and the heartfelt personal message.

2. **WebGL Context Loss & Deterministic Recovery:**
   - Attach `webglcontextlost` and `webglcontextrestored` listeners on `gl.domElement` inside `onCreated`:
     - On `webglcontextlost`: call `event.preventDefault()`, set `contextLostPaused = true` in store/refs (independent from `userPaused` and `tabHiddenPaused`), pause `sceneTimelineRef`, increment `contextLossCount`, and display *"Graphics paused. Restoring mountain view..."*.
     - On `webglcontextrestored`: reset Three.js clock (`clock.getDelta()`), prompt active scene materials/textures and `AnimationMixer` state to revalidate, clear `contextLostPaused = false`, and resume simulation **only if `!userPaused && !tabHiddenPaused`**.
     - **Escalation Fallback:** If context restoration times out (`> 8s`) or context loss triggers twice in the same session due to device VRAM exhaustion, offer a clear one-tap switch to `<FallbackStorybookView />` while keeping `committedSceneId` and `collectedPolaroids` intact.

---

## Section 7: Technical Architecture & Folder Structure

### Named Manager Architecture

The experience uses four named manager modules with strict separation of concerns so simulation, asset memory, camera, and UI never collide.

#### SceneManager
- Separates **`requestedSceneId`** (target destination currently loading/preparing) from **`committedSceneId`** (last verified, mounted, and ready scene).
- Drives `transitionPhase`: `'idle' | 'fading_out' | 'loading' | 'mounting' | 'fading_in' | 'error'`.
- Maintains a monotonic **`transitionTokenRef`** and **`retryNonce`** so stale/cancelled `onSceneReady(token, sceneId)` callbacks are rejected (`if (token !== transitionTokenRef.current) return;`).
- Commits `committedSceneId` and triggers `ProgressStore.saveCheckpoint()` **only after** the destination scene mounts and fires a token-valid `onSceneReady()`.

#### CameraDirector
- Owns the camera mode for the active scene: `'cinematic' | 'follow' | 'orbit' | 'fixed'`.
- Reads declarative camera config from `sceneConfig.ts`.
- Runs camera paths inside an isolated `sceneTimelineRef` (GSAP context) so pausing gameplay pauses camera tweens without freezing UI animations.

#### AssetManager & Shared Resource Ownership
- **R3F Automatic Unmount Disposal Rule:** By default, React Three Fiber traverses unmounting components and calls `.dispose()` on geometries, materials, and textures. Because Drei's `useGLTF` caches parsed assets globally by URL via `suspend-react`, unmounting without protection would destroy cached GPU buffers while leaving broken references in the cache.
- **Protection Invariant (`dispose={null}`):** Every component wrapping a `useGLTF`-loaded resource (both Shared and Scene-Owned) **must** pass `dispose={null}` on its root `<group>` (matching `gltfjsx` convention). `AssetManager` acts as the **single authority** owning cache lifetimes:
  1. **Persistent Shared Assets (Session-Owned — Never Disposed Mid-Session):** `srishti.glb`, `ishaan.glb`, `manish.glb`, `yash.glb`, `scooter.glb`, shared WebP palette atlas, and core UI audio remain cached across the full session and are never passed to `useGLTF.clear()` or `.dispose()` between scenes.
  2. **Scene-Owned Assets (Evicted Post-Unmount & Post-Commit Only):** Environment GLBs and scene-specific props preload before transition and may be evicted **only after** React has unmounted the outgoing scene, the destination scene has committed `onSceneReady()`, and no active scene references the URL. When permitted, `AssetManager.disposeSceneOwned(prevId)` clears `useGLTF.clear(url)` and traverses retained scene-owned groups to `.dispose()` non-shared geometries, materials, and textures (explicitly skipping any shared palette atlas texture).
- Provides graceful placeholder mesh fallback + error logging if an optional prop fails.

#### ProgressStore (Zustand)
- Stores slow-changing UI & lifecycle state: `requestedSceneId`, `committedSceneId`, `transitionPhase`, `retryNonce`, `collectedPolaroids`, `stairStepCount`, `audioMuted`, `guidedMode`, and independent pause flags (`userPaused`, `tabHiddenPaused`, `contextLostPaused`).
- Serializes checkpoints to `localStorage` inside guarded `try/catch` blocks only upon verified `committedSceneId` commits and stable scene milestones.

---

### Simulation vs. UI State Rule

> **Fast-changing simulation values** (position, velocity, rotation, scooter speed, camera target, held input flags) are stored in **`useRef`** — read inside `useFrame`, causing zero React re-renders.
>
> **Slow-changing UI & transition state** (`requestedSceneId`, `committedSceneId`, `transitionPhase`, `retryNonce`, polaroid list, settings) lives in **Zustand** — driving UI overlays cleanly.

---

### Safe Scene Transition, Failure Recovery & Retry Contract [CORE]

To prevent blank screens, stale `onSceneReady` races, or orphaned GPU resources during slow mobile networks, every transition follows this exact state machine:

1. **Preload Target (Early Background Fetch):** `AssetManager.preloadScene(nextId)` begins fetching scene-owned assets for `nextId` while the player nears the end of the current scene.
2. **Curtain Fade-Out (`350ms`):** Increment `transitionToken = ++transitionTokenRef.current`. Set `transitionPhase = 'fading_out'`. Clear held inputs, pause `sceneTimelineRef`, and fade curtain to black (`350ms`). **The outgoing scene (`committedSceneId`) remains mounted behind the curtain.**
3. **Request & Load (Outgoing Scene Still Retained):** Set `transitionPhase = 'loading'` and `requestedSceneId = nextId`. Await `AssetManager.ensureSceneLoaded(nextId)` with a 10-second timeout while keeping the outgoing scene safely alive in case recovery is needed.
4. **Mount Destination Behind Curtain:** Once assets resolve, unmount outgoing scene and mount destination (`transitionPhase = 'mounting'`) inside `<SceneErrorBoundary resetKey={`${requestedSceneId}-${retryNonce}`}>` + `<Suspense fallback={null}>`, passing `transitionToken` into the scene component.
5. **Token-Guarded Commit, Checkpoint & Safe Eviction:** When destination finishes initializing, it calls `onSceneReady(token, sceneId)`:
   - Ignore if `token !== transitionTokenRef.current` or `sceneId !== requestedSceneId`.
   - Set `committedSceneId = requestedSceneId`.
   - Persist checkpoint (`saveCheckpoint()`).
   - Call `AssetManager.disposeSceneOwned(previousCommittedId)` now that the outgoing scene has unmounted and is safe to evict.
6. **Curtain Fade-In (`350ms`):** Set `transitionPhase = 'fading_in'`, fade curtain clear, then enter `'idle'`.

**Transition Failure, ErrorBoundary Reset & Retry Contract:**
- If asset loading fails, times out (`> 10s`), or `<SceneErrorBoundary>` catches a mount/render exception during `'loading'` or `'mounting'`:
  - Set `transitionPhase = 'error'`.
  - **Do NOT update `committedSceneId`** and **do NOT overwrite `localStorage`**.
  - Display an accessible recovery card over the curtain with two deterministic paths:
    - **`[Retry {Target Scene}]`**: Evicts any partially failed cache entries (`useGLTF.clear(failedUrl)`), increments `retryNonce` (which resets the failed `ErrorBoundary` key and `<Suspense>` state), allocates a fresh `transitionToken`, and restarts Step 3 (`'loading'`).
    - **`[Return to {Committed Scene}]`**: Resets `requestedSceneId = committedSceneId`, increments `retryNonce` (cleanly remounting/reactivating the committed scene at its safe entry transform if it was already swapped during `'mounting'`), resets `CameraDirector`, and fades curtain back in (`'idle'`).

---

### Checkpoint Save & Restoration Contract [CORE]

1. **Storage Schema:**
   ```typescript
   interface CheckpointData {
     version: number;                  // Schema version for safe migrations (e.g. 2)
     committedSceneId: number;         // Only verified committed scenes (0 to 14)
     collectedPolaroids: string[];     // IDs of captured polaroids
     stairStepCount?: number;          // Scene 9 mid-climb restoration (e.g. step 200)
     audioMuted: boolean;
     guidedMode: boolean;
     timestamp: number;
   }
   ```
2. **Safe Storage Handling (`try/catch`):** All `localStorage.getItem` and `localStorage.setItem` calls run inside `try/catch` wrappers. If storage is disabled, in Safari Private Browsing (`QuotaExceededError`), or blocked by iframe `SecurityError`, progress degrades silently to in-memory session state without crashing.
3. **When Saved:** Written to `localStorage['road_made_us_family_checkpoint']` ONLY after `committedSceneId` commits (or at Scene 9's verified step-200 rest state).
4. **Deterministic Restoration:**
   - On startup, `useCheckpoint` parses and validates schema + `version`. Invalid/corrupt JSON is discarded safely to Scene 0.
   - If a valid checkpoint with `committedSceneId > 1` exists, Scene 0 presents `[Continue from {Scene Name}]` or `[Start Fresh]`.
   - Restoring triggers a normal guarded transition (`requestSceneTransition(checkpoint.committedSceneId)`), places Srishti/scooters at the scene's deterministic spawn transform (or step 200 landing in Scene 9), restores `collectedPolaroids`, and initializes `CameraDirector`.

---

### Pause, Focus Loss & Context-Recovery Lifecycle [CORE]

Pause state is derived from three independent flags so one recovery event never accidentally overrides another active pause:
`isPaused = userPaused || tabHiddenPaused || contextLostPaused`

1. **On Any Pause Trigger (`Esc`, HUD Pause, `window` `blur`, `visibilitychange`, or `webglcontextlost`):**
   - **Clear Held Inputs:** Immediately clear `pressedKeys.clear()`, zero virtual joystick/pedal refs, and abort active tilak draw drags so throttles or keys never stick.
   - **Freeze Simulation:** `pausedRef.current = true` so all `useFrame` physics, spline math, and `AnimationMixer` updates exit early.
   - **Scoped GSAP Pause:** Pause ONLY gameplay/camera `sceneTimelineRef` (`sceneTimelineRef.current?.pause()`). Never pause `gsap.globalTimeline`, so `<PauseMenu />` and recovery UI stay responsive.
   - **Mute-Respecting Audio State:** Never override `audioMuted`. If `!audioMuted`, suspend Web Audio cleanly (`Howler.ctx?.suspend()`); if `audioMuted === true`, keep audio strictly silent (`0`).
2. **On Resume / Context Restored:**
   - Only resume simulation when **all** pause flags are `false` (`!userPaused && !tabHiddenPaused && !contextLostPaused`).
   - Call `clock.getDelta()` once before setting `pausedRef.current = false` to swallow accumulated pause elapsed time and prevent delta-time physics jumps.
   - Resume `sceneTimelineRef.current?.resume()` and resume Howler context **only if `!audioMuted`**.

---

### Folder Structure

```
meowwww/
├── public/                         # Static assets served from root
│   ├── draco/                      # Copied from three/examples/jsm/libs/draco/gltf/
│   ├── models/                     # @gltf-transform/cli optimized .glb models
│   │   ├── characters/             # srishti.glb, ishaan.glb, manish.glb, yash.glb
│   │   ├── vehicles/               # scooter.glb (shared geometry instantiated twice)
│   │   ├── environments/           # library.glb, dhaba.glb, neelkanth.glb, baal-kuwari-stairs.glb, baal-kuwari.glb
│   │   └── props/                  # lamp.glb, alarm.glb, thali.glb, diya.glb, chai-cup.glb, maggi-bowl.glb
│   ├── textures/                   # Shared 512x512 WebP palette texture atlas
│   └── audio/                      # Compressed .webm / .mp3 mountain ambience, guitar, flute, piano & SFX
├── src/
│   ├── app/
│   │   ├── page.tsx                # Server Component: metadata, layout, mounts ExperienceWrapper
│   │   ├── layout.tsx              # Root HTML & typography setup
│   │   └── globals.css             # Tailwind v4 (`@import "tailwindcss";`) & touch-action utilities
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── ExperienceWrapper.tsx # 'use client' — Dynamic SSR-disabled boundary + WebGL2 check
│   │   │   ├── Experience.tsx      # Root R3F Canvas, useGLTF.setDecoderPath('/draco/'), Context Loss handler
│   │   │   ├── managers/
│   │   │   │   ├── SceneManager.tsx       # requestedSceneId / committedSceneId + token state machine
│   │   │   │   ├── SceneErrorBoundary.tsx # Reset-keyed React ErrorBoundary for transition recovery
│   │   │   │   ├── CameraDirector.tsx     # Scoped GSAP camera mode switcher
│   │   │   │   └── AssetManager.tsx       # Shared dispose={null} vs. scene-owned lifecycle cache
│   │   │   ├── scenes/
│   │   │   │   ├── Scene00_Loading.tsx
│   │   │   │   ├── Scene01_KitaabiDastaan.tsx
│   │   │   │   ├── Scene02_Mahakumbh.tsx
│   │   │   │   ├── Scene03_KumbhkaranAwakens.tsx
│   │   │   │   ├── Scene04_ScooterDeparture.tsx
│   │   │   │   ├── Scene05_MountainRoad.tsx
│   │   │   │   ├── Scene06_MaggiChai.tsx
│   │   │   │   ├── Scene07_Neelkanth.tsx
│   │   │   │   ├── Scene08_RideToBaalKuwari.tsx
│   │   │   │   ├── Scene09_The400Stairs.tsx
│   │   │   │   ├── Scene10_BaalKuwariArrival.tsx
│   │   │   │   ├── Scene11_SummitViewpoints.tsx
│   │   │   │   ├── Scene12_DescentHome.tsx
│   │   │   │   ├── Scene13_BhaiDoojTilak.tsx
│   │   │   │   └── Scene14_MemoryGallery3D.tsx
│   │   │   ├── characters/
│   │   │   │   ├── Srishti.tsx
│   │   │   │   ├── Ishaan.tsx
│   │   │   │   ├── Manish.tsx
│   │   │   │   └── Yash.tsx
│   │   │   ├── vehicles/
│   │   │   │   └── Scooter.tsx     # Reusable scooter geometry (2 instances, dispose={null})
│   │   │   ├── environment/
│   │   │   │   ├── MountainRoad.tsx
│   │   │   │   ├── Dhaba.tsx
│   │   │   │   ├── NeelkanthTemple.tsx
│   │   │   │   ├── BaalKuwariStairs.tsx
│   │   │   │   └── BaalKuwariTemple.tsx
│   │   │   └── effects/
│   │   │       ├── FireflyGuide.tsx
│   │   │       └── Particles.tsx
│   │   └── ui/
│   │       ├── FallbackStorybookView.tsx # WebGL2-unsupported / context-exhausted 2D storybook
│   │       ├── NarrationCard.tsx   # Responsive Hinglish dialogue & narration overlay
│   │       ├── PolaroidFrame.tsx   # 3D/2D polaroid card viewer
│   │       ├── LoadingScreen.tsx   # Initial loading progress bar & resume prompt
│   │       ├── PauseMenu.tsx       # Pause overlay independent of scene GSAP timeline
│   │       ├── HUD.tsx             # Audio, quality selector, guide toggle, pause & polaroid counter
│   │       └── MobileControls.tsx  # Dual-zone multitouch pointerId controls & nipplejs joystick
│   ├── store/
│   │   └── progressStore.ts        # Zustand — UI, scene transition & pause-flag state only
│   ├── hooks/
│   │   ├── useScooterPhysics.ts    # Simulation refs — zero React re-renders
│   │   ├── useClimbRhythm.ts       # ~400-stair progression & assist controller
│   │   └── useCheckpoint.ts        # try/catch localStorage serialization & restoration
│   └── lib/
│       ├── sceneConfig.ts          # Scene definitions: asset ownership, camera mode, lighting preset
│       ├── qualityProfile.ts       # Native WebGL2 hardware probe + rolling FPS quality scaler
│       └── checkpoint.ts           # Save schema parser & validator
├── private-assets/                 # 🔒 Gitignored — personal photos and reference notes
├── personal-photos/                # 🔒 Gitignored — real trip photo references
├── ASSET_CREDITS.md                # Attribution and licenses for 3D/audio assets
├── .gitignore                      # Configured to protect personal media
├── next.config.mjs                 # Next.js 16 config with transpilePackages
├── postcss.config.mjs              # Tailwind v4 `@tailwindcss/postcss` config
├── tsconfig.json                   # Strict TypeScript compiler options
├── package-lock.json               # Committed lockfile preventing React peer drift
└── package.json                    # Exact compatible Next.js 16 / React 19 / R3F 9 / Drei 10 baseline
```

### Zustand Store Shape

```typescript
// store/progressStore.ts — UI & LIFECYCLE STATE ONLY
type TransitionPhase =
  | 'idle'
  | 'fading_out'
  | 'loading'
  | 'mounting'
  | 'fading_in'
  | 'error';

type QualityProfile = 'high' | 'balanced' | 'low';

interface ProgressStore {
  // Decoupled Scene Lifecycle & Retry Guard
  requestedSceneId: number;
  committedSceneId: number;
  transitionPhase: TransitionPhase;
  transitionError: string | null;
  retryNonce: number;
  requestSceneTransition: (targetId: number) => void;
  commitSceneReady: (sceneId: number) => void;
  failTransition: (message: string) => void;
  retryTransition: () => void;
  revertToCommittedScene: () => void;

  // Collection & Scene Progress
  collectedPolaroids: string[];
  addPolaroid: (id: string) => void;
  stairStepCount: number;
  setStairStepCount: (step: number) => void;

  // Independent Pause & Context State
  userPaused: boolean;
  tabHiddenPaused: boolean;
  contextLostPaused: boolean;
  setUserPaused: (paused: boolean) => void;
  setTabHiddenPaused: (paused: boolean) => void;
  setContextLostPaused: (lost: boolean) => void;

  // Settings & Quality
  audioMuted: boolean;
  guidedMode: boolean;
  qualityProfile: QualityProfile;
  toggleAudio: () => void;
  toggleGuidedMode: () => void;
  setQualityProfile: (profile: QualityProfile) => void;

  // Checkpoints (try/catch guarded; saves committedSceneId only)
  saveCheckpoint: () => void;
  restoreCheckpoint: (data: CheckpointData) => void;
}

// Fast-changing simulation values live strictly in useRef inside canvas hooks:
// const transitionTokenRef = useRef(0);
// const scooterPos = useRef(new THREE.Vector3());
// const scooterSpeed = useRef(0);
// const lateralOffset = useRef(1.1);
// const pausedRef = useRef(false);
```

---

## Section 8: 3D Asset Pipeline (Blender → GLB)

### Pipeline Overview

```
Blender (.blend)
     │
     ├─ Apply Object Transforms in Object Mode (Ctrl+A → All Transforms) prior to rigging
     ├─ Apply ONLY constructive non-armature modifiers (Mirror, Solidify, Bevel)
     ├─ Keep Armature modifier LIVE & unapplied on rigged/skinned characters
     ├─ Merge vertices by distance & check low-poly triangle budgets
     │
     ▼
Export as .glb (File → Export → glTF 2.0, Skinning & Deformation Bones Only)
     │
     ▼
npx @gltf-transform/cli optimize input.glb output.glb --compress draco --texture-compress webp --texture-size 1024
     │
     ▼
Loaded in R3F via AssetManager + useGLTF (with useGLTF.setDecoderPath('/draco/'))
```

### Blender Standards

#### Scale & Object Transforms
- **1 Blender unit = 1 metre.**
- Use `Ctrl+A → All Transforms` in Object Mode to bake Location (`0,0,0`), Rotation (`0,0,0`), and Scale (`1,1,1`) into object transforms **before rigging or keyframing**. *(Note: `Ctrl+A` applies Object Transforms only — it does NOT apply modifiers.)*

#### Modifiers on Static Props vs. Skinned Characters
- **Static Props & Environments:** Apply all constructive modifiers (Mirror, Solidify, Bevel, Boolean) cleanly before export.
- **Skinned / Rigged Characters (Critical Rule):** Apply constructive modeling modifiers **prior** to parenting to the armature, and **NEVER apply the `Armature` modifier**. Applying an `Armature` modifier freezes the mesh into a static pose statue and permanently strips bone weights and skeletal animations.

#### Origins
- **Characters:** origin at foot centre (`0, 0, 0` between feet)
- **Vehicles (scooters):** origin at geometric centre at ground level (`y = 0`)
- **Props:** origin at interaction point or geometric centre

#### Attachment Points
Empty objects parented to the armature/scooter root, named consistently:

| Attachment Point | Purpose |
|-----------------|---------|
| `attach_seat_driver` | Driver character sits here (Ishaan on Scooter 1; Scooter 2 driver socket) |
| `attach_seat_pillion` | Pillion character sits here (Srishti on Scooter 1; Scooter 2 pillion socket) |
| `attach_hand_L` | Left hand reach (stair assist) |
| `attach_hand_R` | Right hand reach (stair assist) |
| `attach_tilak_brush` | Tilak application target / brush socket |

#### Animation Naming Conventions
All animation clips must use `snake_case`:

| Clip Name | Description |
|-----------|-------------|
| `idle` | Standing idle |
| `walk_cycle` | Looping walk |
| `run_cycle` | Looping run |
| `sit_idle` | Seated idle (scooter) |
| `climb_step` | Single stair-step motion |
| `wave` | Greeting wave |
| `reach_back` | Ishaan reaching hand back (stair assist) |
| `tilak_receive` | Ishaan holding still for tilak |
| `kumbhkaran_sleep` | Exaggerated sleeping pose |
| `kumbhkaran_wake` | Slow comedic wake-up |

#### Animation Export & Rigging Settings (Blender → glTF 2.0) [CORE]
To ensure clean animation playback and 1:1 timing in Three.js `AnimationMixer`:
1. **Scene Frame Rate:** Under *Scene Properties → Format → Frame Rate*, set Blender's project frame rate explicitly to **`30 fps`** so authored action lengths match runtime playback without speed drift.
2. **Armature Configuration:** Under *Data → Armature*, enable **"Export Deformation Bones Only"** and ensure **Skinning** is enabled so IK/control rigs are omitted while deformation weights export cleanly.
3. **NLA Track Baking:** Push each finished action down into its own named NLA track in Blender's NLA Editor, and enable **"Group by NLA Track"** in the glTF exporter so Three.js receives crisp named `AnimationClip` tracks.
4. **Sampling Rate:** Set sampling step to `1` (matching `30 fps`) with **Optimize Animation Size** enabled.

#### Texture & Mesh Compression Architecture
1. **Verified `@gltf-transform/cli` Commands `[CORE]`:**
   - Standard optimization pipeline (geometry Draco compression + WebP texture conversion + resizing):
     ```bash
     npx @gltf-transform/cli optimize input.glb output.glb --compress draco --texture-compress webp --texture-size 1024
     ```
   - Standalone Draco tuning (when custom quantization bits or speeds are needed):
     ```bash
     npx @gltf-transform/cli draco input.glb output.glb --method edgebreaker --encode-speed 5
     ```
   - **Local Draco Decoder Setup:** Copy `draco_decoder.js`, `draco_decoder.wasm`, and `draco_wasm_wrapper.js` from `node_modules/three/examples/jsm/libs/draco/gltf/` into `/public/draco/`, and call `useGLTF.setDecoderPath('/draco/')` globally at client entry.
2. **Texture Architecture `[CORE vs DEFERRED]`:**
   - **`[CORE]` Baseline:** Stylized low-poly assets share a **Palette Texture Atlas** (`512×512` `.webp`, `<100 KB`), minimizing texture uploads and material draw calls.
   - **`[DEFERRED]`:** KTX2 / Basis Universal GPU compressed textures (via `@react-three/drei`'s `useKTX2`) are deferred to post-v1.0 if large high-res backdrops are ever added. *(If enabled later, copy Basis transcoder files from `three/examples/jsm/libs/basis/` to `/public/basis/`.)*

#### Geometry & Draw Budgets
- Merge redundant vertices by distance (`weld` in Blender / `gltf-transform optimize`).
- *(Technical Note: 65,535 (`uint16`) is a legacy WebGL 1.0 16-bit index buffer limit per draw buffer, bypassed in WebGL 2.0; stylized low-poly assets should stay far below that ceiling anyway.)*
- **Low-Poly Triangle Budgets:**
  - Each character: **2,000–5,000 triangles**
  - Scooter: **3,000–6,000 triangles**
  - Active visible scene total on mobile: **< 60,000 triangles** and **< 50 draw calls/frame**

#### Compression File Size Targets

| Asset Type | Target File Size | Format |
|-----------|-----------------|--------|
| Character GLB (each) | < 200 KB | Draco-compressed `.glb` |
| Scooter GLB | < 150 KB | Draco-compressed `.glb` |
| Environment GLB (per scene) | < 500 KB | Draco-compressed `.glb` |
| Palette Atlas Texture | < 100 KB | `.webp` |

#### License Tracking
All third-party/CC0/CC-BY assets must be logged in `ASSET_CREDITS.md` (`Asset Name | Source URL | License | Modifications Made`) before inclusion.

---

## Section 9: Desktop/Mobile Performance Strategy

### Native Quality Profile & Adaptive Scaling [CORE]
Because external GPU benchmark libraries require unverified runtime CDN benchmark fetches (and `@pmndrs/detect-gpu` is deferred pending live registry verification during QA), `[CORE]` quality scaling uses a zero-dependency **Native WebGL2 Probe + Device Heuristic + Rolling FPS Monitor** (`src/lib/qualityProfile.ts`), plus a manual profile selector in HUD/Pause Menu:

| Quality Profile | Target Devices | FPS Target | Shadows | DPR Cap | Max Active Particles |
|-----------------|---------------|-----------|---------|---------|---------------------|
| **`high`** (Desktop) | Dedicated/modern desktop GPU (`pointer: fine`) | 60 fps | `PCFSoftShadowMap` | `2.0` (`[1, 2]`) | 1,500 |
| **`balanced`** (Mobile & Mid Desktop) | All flagship/mid-range iOS & Android (`pointer: coarse`) and integrated desktop GPUs | 30–60 fps | Disabled (contact decals only) | **`1.5` (`[1, 1.5]`)** | 500 |
| **`low`** (Entry Mobile / Auto-Downscale) | Low-RAM devices (`deviceMemory <= 2`) or rolling 3s FPS `< 26` fallback | 30 fps | Disabled | `1.0` | 0 |

> **Reconciled Mobile Rule:** **All mobile devices (including flagship iOS/Android phones) initialize at `balanced` or `low`, strictly cap DPR at `1.5`, and disable real-time shadow maps**, substituting lightweight circular ground contact decals to prevent thermal throttling and VRAM spikes.

### Mobile-Specific Performance Optimizations [CORE]

| Optimization Area | Technical Implementation |
|-------------------|--------------------------|
| **Device Pixel Ratio (DPR)** | Hard cap `Math.min(window.devicePixelRatio, 1.5)` across all mobile devices; `2.0` permitted on `high` Desktop only. |
| **Draw Call Batching** | Instance repetitive pine trees, boulders, and prayer flag poles via `<instancedMesh />`, keeping draw calls `< 50` per frame. |
| **Foliage LOD & Culling** | Detailed mesh `< 20m`; simplified low-poly/billboard `20m–40m`; frustum culled `> 40m`. |
| **Audio Optimization** | Serve compressed `.webm` with `.mp3` fallback via Howler audio sprites. |
| **Ground Contact Decals** | Replace dynamic shadow maps on mobile with soft circular grounding decals beneath scooters and characters. |

### Reproducible Performance & Memory Profiling Protocol [CORE]
1. **Browser Diagnostics (Accurate Scope):**
   - **JS Heap (`< 120 MB`):** Measured via Chrome DevTools Memory / Performance timeline (JS object memory only — JS heap does NOT measure GPU VRAM).
   - **WebGL Resource Bounds (VRAM Proxy):** Because browsers restrict exact byte-level VRAM queries from JS, record Three.js `renderer.info.memory` (`geometries` & `textures`) and `renderer.info.render` (`calls < 50`, `triangles < 60,000` on mobile) across **3 consecutive full Scene 0→14 playthrough loops** with zero monotonic resource growth, alongside Chrome Task Manager / `chrome://inspect` GPU process memory observation.
2. **Standardized Benchmark Test:**
   - **60-Second Mountain Road Cruise Test:** Drive steady cruise on Scene 5 for 60 seconds; verify desktop `high` sustains `60 fps (±5)` and target mid-range Android (`balanced`, Snapdragon 680/720G class, 4GB RAM via USB `chrome://inspect`) sustains `>= 30 fps` average and `>= 25 fps` 1% low.
3. **Physical Device & Dev Diagnostics:**
   - Android via USB `chrome://inspect`; iOS via Mac Safari Web Inspector.
   - Dev builds use `<Stats />` or `r3f-perf` in `NODE_ENV === 'development'` only.

### R3F Canvas Settings by Profile

```typescript
// 'high' (Desktop Only)
<Canvas dpr={[1, 2]} shadows="soft" gl={{ antialias: true }} />

// 'balanced' (Mobile Cap & Mid Desktop)
<Canvas dpr={[1, 1.5]} shadows={false} gl={{ antialias: false }} />

// 'low' (Low-End / Thermal Auto-Downscale)
<Canvas dpr={1} shadows={false} gl={{ antialias: false, powerPreference: 'low-power' }} />
```

### Loading Strategy
- Scene 0 preloads **Persistent Shared Assets** (4 characters, scooter, shared palette atlas) + Scene 1 library assets before offering "Begin".
- Each subsequent scene's **Scene-Owned Assets** preload quietly during the preceding scene; outgoing scene-owned assets are disposed safely only after the new scene commits `onSceneReady()`.

---

## Section 10: Development Phases & Milestones

---

### Phase 1A — Minimum Project & Canvas Shell [CORE]

> **Sequencing & Readiness Rule:** Project initialization, verified dependencies, and the SSR-safe browser-only canvas wrapper must exist *before* Milestone 0's playable vertical slice can run. **Unconfirmed creative choices in Section 14 (friend driver identity, Hinglish wording approvals, photo references, personal message, hosting privacy) do NOT block Phase 1A neutral technical scaffolding.**
>
> **Only Technical Prerequisites for Phase 1A:**
> 1. **Node.js `>=20.9.0`** and `npm` available on the development machine.
> 2. **Creator approval** of this v2.3 technical baseline & lockfile policy (`package.json` exact React pins + `package-lock.json`).
> 3. **Vercel preview project access** (or local build verification if cloud CI setup waits until Milestone 0).

**Goal:** Initialize a clean Next.js 16 + React 19 + R3F 9 shell with WebGL2 detection and Vercel preview CI.

**Tasks:**
- Verify Node.js (`>=20.9.0`) and run `npm view <pkg> version peerDependencies` against live registry for all baseline packages before locking `package.json`
- Initialize Next.js `16.4.6` + **exact-pinned** `react` / `react-dom` (`"19.3.1"`, strictly inside R3F `<19.4` peer range) + TypeScript (`>=5.1.0`) + Tailwind CSS v4 (`@tailwindcss/postcss`)
- Install `@react-three/fiber` (`9.8.x`), `@react-three/drei` (`10.7.x`), `three` + `@types/three` (`0.186.x`), `zustand` (`5.1.x`), `gsap` (`3.15.x`), `motion` (`14.11.x`), `howler` (`2.2.4`), `nipplejs` (`1.0.x`), and commit **`package-lock.json`**
- Verify resolved tree via `npm ls next react react-dom @react-three/fiber @react-three/drei three`
- Configure `next.config.mjs` with `transpilePackages: ['three', '@react-three/fiber', '@react-three/drei']`
- Copy Draco decoder binaries from `node_modules/three/examples/jsm/libs/draco/gltf/` into `/public/draco/` and set `useGLTF.setDecoderPath('/draco/')`
- Create `ExperienceWrapper.tsx` (`'use client'`) with `dynamic(..., { ssr: false })`, strict `webgl2` probe (`loseContext()` cleanup), `<FallbackStorybookView />` shell, and `<LoadingScreen />`
- Deploy minimal neutral shell to Vercel preview URL

**Measurable Acceptance Criteria:**
- [ ] Zero `ERESOLVE` peer dependency errors or React version mismatches on `npm ci`; `package-lock.json` committed
- [ ] Zero SSR hydration warnings or Node-side `window`/`WebGL2` evaluation errors
- [ ] **Initial Route Bundle Budget:** First Load JS for initial SSR route shell + UI/store `< 350 KB` gzipped (dynamically code-split 3D `<Experience />` chunk excluded from initial blocking SSR bundle and separately budgeted at `< 450 KB` gzipped)
- [ ] Public Vercel preview deployment boots cleanly on desktop and mobile (rendering `<FallbackStorybookView />` gracefully when WebGL2 is disabled)

---

### Milestone 0 — Playable Vertical Slice [CORE]

> **Gate Requirement:** Runs inside Phase 1A's verified Canvas shell. All Milestone 0 criteria must pass before expanding into the full 15-scene architecture.

A self-contained playable demo proving the core 3D driving loop, attachment seating, and input system in isolation:
- Short mountain road segment (1 `CatmullRomCurve3` spline, `~250m`, `7.0m` road width)
- Two scooter instances sharing `scooter.glb` (`dispose={null}`)
- Four character meshes (`Srishti`, `Ishaan`, `Manish`, `Yash`) seated via `attach_seat_driver` & `attach_seat_pillion`
- Manual steering, throttle, braking (`~6m` emergency stopping distance from `12 m/s`), lateral lane lean, and soft boundary restoring force (`|x| > 2.3m`, centerline clamp `±2.9m` accounting for `0.4m` scooter half-width)
- Scooter 2 staggered spawn at $t=0$ running the **constrained follow-distance controller** (`3.0m–7.0m` hard-clamped gap, settling to `~4.5m` steady cruise)
- Deterministic route-end parking zone (`remainingDistance <= 18.0m`) stopping cleanly side-by-side (`x1 = +1.3m`, `x2 = -1.3m`) at a roadside chai stop marker with interactive `E` / tap prompt and audio chime
- Desktop keyboard (`WASD`/Arrows) + Mobile dual-zone touch buttons & `nipplejs` joystick with independent `pointerId` ownership and focus-loss reset

**Measurable Acceptance Criteria:**
- [ ] **60s Mountain Road Benchmark (Desktop):** Sustained `60 fps (±5)` on Chrome, Edge, Firefox, Safari (`high` profile)
- [ ] **60s Mountain Road Benchmark (Mobile):** Sustained `>= 30 fps` average and `>= 25 fps` 1% low on physical mid-range Android (`balanced`, Snapdragon 680/720G class via USB `chrome://inspect`) and iPhone Mobile Safari
- [ ] **Input Responsiveness:** Latency `< 50ms` from keyboard/touch input to steering/throttle reaction
- [ ] **Constrained Follow Gap:** Scooter 2 maintains `3.0m–7.0m` bounded spline gap across hard braking and acceleration (settling to `~4.5m` steady cruise), zero overlap at spawn, zero rear-end clipping
- [ ] **Zero React Render Loops:** `0` React re-renders inside driving canvas components during continuous driving (verified via React DevTools Profiler)
- [ ] **JS Heap & Resource Bounds:** JS heap `< 120 MB`; `renderer.info.render.calls < 50`; `renderer.info.render.triangles < 60,000`
- [ ] **Multitouch & Focus Safety:** Simultaneous thumb steering + gas works via independent `pointerId`s; tab `blur` / `pointercancel` clears all held inputs cleanly

---

### Phase 1B — Scene Router, Checkpointing & Lifecycle Managers [CORE]

**Goal:** Implement the production state machine, shared `dispose={null}` asset protection, transition recovery, checkpointing, and pause system.

**Tasks:**
- Implement `SceneManager` with decoupled `requestedSceneId`, `committedSceneId`, `transitionPhase`, `transitionTokenRef`, and `retryNonce`
- Implement `<SceneErrorBoundary resetKey={`${requestedSceneId}-${retryNonce}`}>` retaining outgoing scene during `'loading'` and resetting cleanly on retry/revert
- Implement `AssetManager` enforcing `dispose={null}` on all `useGLTF` components, retaining Persistent Shared Assets session-wide, and selectively disposing Scene-Owned Assets post-unmount & post-commit
- Implement `CameraDirector` with isolated `sceneTimelineRef` GSAP context
- Implement `try/catch`-guarded `localStorage` checkpoint save/restore (`useCheckpoint.ts`)
- Implement independent pause flags (`userPaused`, `tabHiddenPaused`, `contextLostPaused`), mute-respecting audio suspend, and `clock.getDelta()` reset
- Wire WebGL2 context loss & restoration escalation to `<FallbackStorybookView />`

**Measurable Acceptance Criteria:**
- [ ] Transitions commit `committedSceneId` and save checkpoints ONLY after token-matched `onSceneReady(token, sceneId)` fires (stale callbacks rejected)
- [ ] Forced asset load error / ErrorBoundary fault leaves `committedSceneId` and `localStorage` untouched, and both `[Retry]` and `[Return]` restore cleanly
- [ ] Shared character/scooter models remain cached with zero disposal crashes or invisible meshes across repeated transitions
- [ ] WebGL context restoration does not unpause simulation while `userPaused` or `tabHiddenPaused` remains `true`

---

### Phase 2 — Core Driving & Exploration Mechanics [CORE]

**Goal:** Integrate Milestone 0 driving into Scene 5 and build third-person exploration, climb rhythm, and Hinglish narration systems.

**Tasks:**
- Integrate delta-time spline driving, `[OPTIONAL]` companion honk/wave, roadside flags, and cow encounter (`Scene05_MountainRoad.tsx`)
- Build third-person walk controller with courtyard/dhaba collision bounds (Scenes 3, 6, 7, 11)
- Build Scene 3 Kumbhkaran wake-up sequence (`[CORE]` interactions; alarm/water/headboard staging `[PROPOSED]`)
- Build Scene 6 dhaba interactions (`[CORE]` eat Maggi, sip chai, capture dhaba photo; `[OPTIONAL]` stall owner chat)
- Build Scene 7 Neelkanth Mahadev interactions (`[CORE]` ring bell, light a diya, darshan pause)
- Build Scene 9 ~400-stair rhythm climb, Ishaan hand-assist interaction (`[CORE]`), and rest-landing polaroids (`[OPTIONAL]`)
- Build responsive Hinglish `NarrationCard` UI with `Space` / touch advance

**Measurable Acceptance Criteria:**
- [ ] Seamless transition from driving (Scene 5) to walk exploration (Scene 6) with zero stuck keys
- [ ] All wake-up, dhaba, temple, and stair interactions trigger cleanly on keyboard, mouse, and mobile touch
- [ ] Hinglish narration cards fit mobile screens cleanly without clipping controls

---

### Phase 3 — Baal Kuwari & Safe Return (Scenes 8–12) [CORE]

**Goal:** Deliver the complete playable continuation from Neelkanth Mahadev through the forest route to Baal Kuwari, the distinct pre-climb Maggi stop, the segmented ~400-stair climb with Ishaan helping Srishti and Manish & Yash accompanying, calm summit temple arrival, safe evening scooter return, and Rishikesh hotel reunion & gentle farewell.

**Two Planned Phase 3 Checkpoints (Commits):**
1. **Commit 1 — Baal Kuwari Route, Staircase, Temple & Core Gameplay:**
   - Updated `MASTER_PLAN.md` chronology, `sceneConfig.ts`, `mountainSpline.ts` (`'to_baalkuwari'`), `chapters.ts`, `checkpoint.ts`, and `progressStore.ts`
   - Playable Scene 8 (`Route to Baal Kuwari` + distinct walkable `Pre-Climb Maggi Stop` before stairhead)
   - Playable Scene 9 (`4` continuous forested staircase segments totaling `~400` stone steps, smooth step counter, rest landings + milestone checkpoint at step `200`, companion climbing continuity)
   - Playable Scene 10 (`Baal Kuwari Temple Arrival & Summit Sanctuary` with bell, overlook exploration & summit Polaroid)
   - Passing `npm.cmd run typecheck` and `npm.cmd run build`, committed & pushed to `origin/main`
2. **Commit 2 — Companion Helping Interactions, Cinematics, Safe Return Ride & Hotel Farewell:**
   - Articulate `'climb_step'`, `'hand_assist_reach'`, and `'cheer_wave'` poses + interactive **"Take Ishaan's Hand"** climb assistance & shared rest pacing in Scene 9
   - Scene 10 serene hilltop arrival cinematic reveal + evening bus reminder
   - Scene 11 (`Evening Safe Return` downhill scooter segment `'to_hotel_return'` with calm pacing & Scooter 2 escort — zero reckless driving)
   - Scene 12 (`Rishikesh Hotel Return`: ground/1st floor hotel courtyard context, Srishti rejoining her original friends without depicting a bus-stand dropoff, gentle farewell wave + Trip Complete card)
   - Passing `npm.cmd run typecheck` and `npm.cmd run build`, committed & pushed to `origin/main`

**Known Deferred Issue (Intentional Exclusion from Phase 3 Fix):**
- Some hillside mountain geometry and trees across road/temple segments still appear to float visually in rendered builds; recorded as an open visual-polish item for dedicated environment inspection rather than claimed fixed in Phase 3.

### Known Deferred Visual Issues Log
| Issue | Scope | Status |
|-------|-------|--------|
| Floating hillside trees & mountain slope gaps | Mountain road / viewpoint / dhaba / temple edges | **Deferred (Known Visual Polish Item — Do Not Mark Fixed)** |

---

### Phase 4 — Prologue, Epilogue & Stylized Asset Production [CORE]

**Goal:** Replace greybox geometry with stylized low-poly Himalayan GLB assets meeting pipeline rules.

**Tasks:**
- Model and skin Srishti, Ishaan, Manish, and Yash using Mixamo humanoid skeletons (Scene Frame Rate `30 fps`; keep `Armature` modifier live and unapplied)
- Model shared scooter, cozy lamp/library, Rishikesh room, mountain road, dhaba, Neelkanth Mahadev, Baal Kuwari stairs & temple, and tilak thali props
- Export NLA-baked clips with "Export Deformation Bones Only"
- Optimize via `npx @gltf-transform/cli optimize input.glb output.glb --compress draco --texture-compress webp --texture-size 1024`
- Build shared `512×512` WebP palette texture atlas (`< 100 KB`) and populate `ASSET_CREDITS.md`

**Measurable Acceptance Criteria:**
- [ ] Zero skinned characters frozen by accidentally applied `Armature` modifiers; Blender 30 fps clips match runtime `AnimationMixer` durations 1:1
- [ ] GLB targets met: Characters `< 200 KB`, Scooter `< 150 KB`, Environments `< 500 KB`
- [ ] Active mobile scene stays under `< 60,000` triangles and `< 50` draw calls
- [ ] `ASSET_CREDITS.md` documents 100% of third-party assets & licenses

---

### Phase 5 — Ceremonial Finale, Polish & Audio [CORE]

**Goal:** Complete the interactive Bhai Dooj tilak, music soundscape, and 3D memory gallery.

**Tasks:**
- Implement fixed-camera Bhai Dooj tilak (Scene 13) supporting both **4-step Draw Mode** and **4-step Tap-to-Apply Accessibility Mode** (Roli → Forehead → Akshat Rice → Diya Flame)
- Add `[OPTIONAL]` celebratory finale flowers & petal burst
- Place creator's real heartfelt personal message
- Polish Scene 14 inspectable 3D floating polaroid gallery (orbit + tap-to-read modal) + `[OPTIONAL]` share poster generator
- Integrate Howler audio: mountain ambience, soft acoustic guitar, flute, emotional piano, and SFX

**Measurable Acceptance Criteria:**
- [ ] Both Draw Mode and 4-step Tap-to-Apply Mode complete all 4 ritual steps (including Akshat rice offering and diya lighting) cleanly on mouse and touch
- [ ] Audio initializes gracefully on user interaction and strictly respects `audioMuted` across pause/resume
- [ ] Scene 14 allows smooth 3D orbit/rotation and legible polaroid/letter reading on mobile portrait and desktop

---

### Phase 6 — Performance Optimization, QA & Launch [CORE]

**Goal:** Cross-browser hardening, physical mobile benchmarking, and production deployment.

**Tasks:**
- Verify native WebGL2/FPS quality scaling (mobile DPR capped at `1.5`, shadows disabled on mobile, `<instancedMesh />` foliage)
- Execute physical Android USB (`chrome://inspect`) and iOS Safari Web Inspector 60-second benchmark & 3-cycle memory leak check
- Verify Lighthouse Mobile performance audit (`>= 70`)
- Validate `<FallbackStorybookView />` on forced WebGL2 failure/context exhaustion
- Configure Vercel production deploy + custom domain and complete creator end-to-end playtest

**Measurable Acceptance Criteria:**
- [ ] Mobile Lighthouse Performance Score `>= 70`
- [ ] Bounded `renderer.info.memory` geometries/textures across 3 consecutive full Scene 0→14 playthrough loops (zero monotonic GPU resource leaks)
- [ ] Verified on Chrome, Firefox, Safari (desktop) + Chrome Android & Safari iOS (mobile)
- [ ] Creator signs off on emotional pacing and factual accuracy

---

## Section 11: Feature Classification & Minimum Viable Scope

All features are categorized cleanly into **[CORE]**, **[OPTIONAL]**, or **[DEFERRED]** — nothing is silently stripped:

### Complete Feature Classification Matrix

| Feature / Scene | Classification | Role & Notes |
|-----------------|----------------|--------------|
| Scene 0: Cozy Lamp & Open Book Title Backdrop | **[CORE]** | Sets literary cozy tone during asset preload |
| Scene 1: Kitaabi Dastaan 3D Curved Library Reveal | **[CORE]** | Online book community meeting & first "Bhai" |
| Scene 2: Mahakumbh ~2-Minute Flash | **[CORE]** | Preserves real ~2-minute meeting in vast crowd |
| Scene 3: Kumbhkaran Wake-up (Alarm, Water Splash, Headboard Knock `[PROPOSED]`) | **[CORE]** | Comedic wake interactions for Ishaan |
| Scene 4: Two-Scooter Departure | **[CORE]** | Srishti + Ishaan (Scooter 1); Manish & Yash (Scooter 2) |
| Scene 5: Mountain Road Driving & Constrained Follow Physics | **[CORE]** | Manual driving, bounded Scooter 2 follow (`3–7m`), soft boundaries, route stop, pull-off polaroids |
| Scene 5: Companion Honk/Wave, Prayer Flags, Cow Encounter | **[OPTIONAL]** | Playful roadside details; toggleable without blocking |
| Scene 6: Dhaba Stop (Eat Maggi, Drink Chai, Take Dhaba Photo) | **[CORE]** | Maggi eating, chai warmth, dhaba polaroid |
| Scene 6: Stall Owner Greeting | **[OPTIONAL]** | Warm local hospitality flourish `[PROPOSED]` |
| Scene 7: Neelkanth Mahadev (Ring Bell, Light a Diya, Darshan Pause) | **[CORE]** | Separate temple darshan; lighting diya replaces passive cupping alone |
| Scene 8: Scooter Ride Connecting Neelkanth to Baal Kuwari | **[CORE]** | Preserves geographic separation of the two temples |
| Scene 9: Baal Kuwari ~400 Stairs Climb (Ishaan Hand-Assist) | **[CORE]** | Sustained climb rhythm with interactive help |
| Scene 9: Rest-Landing Valley View Polaroids (~100 / ~300 Steps) | **[OPTIONAL]** | Scenic pauses during the ~400-step climb |
| Scene 10: Baal Kuwari Temple Summit Reveal | **[CORE]** | Earned temple arrival at top of the ~400 stairs |
| Scene 11: Summit Viewpoints & Guaranteed Srishti+Ishaan Polaroid | **[CORE]** | Primary mountain photo memory + group viewpoint guaranteed |
| Scene 11: Companion Chats & Bonus Hidden Viewpoint Polaroid | **[OPTIONAL]** | Extra exploration & optional `[PROPOSED]` dialogue |
| Scene 12: Dusk Descent Home | **[CORE]** | Reflective twilight ride back |
| Scene 13: Bhai Dooj Tilak (Draw & 4-Step Tap-to-Apply Modes, Akshat, Diya) | **[CORE]** | Climactic ritual + creator's personal letter *(staging `[PROPOSED]`)* |
| Scene 13: Finale Celebration Flowers & Petals | **[OPTIONAL]** | Celebratory visual flourish |
| Scene 14: Inspectable Floating 3D Memory Gallery | **[CORE]** | Orbit/inspect 3D polaroids + accessible reader modal |
| Scene 14: Social Keepsake Poster Export | **[OPTIONAL]** | Downloadable summary poster |
| Firefly Guided Mode | **[OPTIONAL]** | Gentle spatial objective guide |
| Native WebGL2 Probe & Rolling FPS Quality Scaler | **[CORE]** | Zero-dependency adaptive quality (`high / balanced / low`) |
| External GPU Benchmark Lookup (`@pmndrs/detect-gpu`) | **[DEFERRED]** | Deferred pending live registry verification & local benchmark hosting |
| Rapier Rigid-Body Tire Physics | **[DEFERRED]** | Post-v1.0 physics expansion (`@react-three/rapier@^2`) |
| KTX2 / Basis GPU Texture Transcoding | **[DEFERRED]** | Post-v1.0 optimization (`useKTX2` + `/public/basis/`) |

---

## Section 12: Risks & Fallback Plans

| Risk | Likelihood | Impact | Fallback Strategy |
|------|-----------|--------|-------------------|
| 3D performance on low-end mobile | High | High | Native WebGL2/FPS quality scaling (`balanced`/`low`), mobile DPR cap `1.5`, no mobile shadow maps, `<instancedMesh />` |
| WebGL2 unsupported or repeated context loss | Low | High | Strict `webgl2` probe + automatic/user-triggered switch to 2D `<FallbackStorybookView />` preserving story, audio, polaroids, and letter |
| GLB asset loading failure or ErrorBoundary fault | Medium | High | `SceneManager` retains/restores `committedSceneId` without corrupting checkpoint; resets ErrorBoundary via `retryNonce` |
| `localStorage` blocked (Safari Private / iframe) | Medium | Low | `try/catch` guards degrade gracefully to in-memory session progress without runtime crash |
| Tilak draw precision on small touchscreens | Medium | Medium | Explicit toggle to 4-step Tap-to-Apply Accessibility Mode (Roli → Forehead → Akshat → Diya) |
| Audio blocked by browser autoplay policy | High | Low | Unlock audio cleanly on first "Begin" tap; `audioMuted` respected strictly across pause/context recovery |
| Skinned character exported frozen as statue | Medium | High | Pipeline checklist enforces `30 fps` scene rate & keeping `Armature` modifier LIVE/unapplied during Blender glTF export |
| Humanoid animation retargeting quirks | Medium | Medium | Mixamo auto-rigger + per-character NLA-baked clips (`Export Deformation Bones Only`) |
| Scope creep | Medium | High | Quality-first milestone gating (Phase 1A → Milestone 0 → Phases 1B–6) with strict `[CORE]`/`[OPTIONAL]`/`[DEFERRED]` boundaries |

---

## Section 13: Division of Work

| Area | Owner | Notes |
|------|-------|-------|
| 3D environment & prop art (Blender) | Creator / Asset Pipeline | Cozy library, mountain road, dhaba, Neelkanth, Baal Kuwari stairs/temple |
| Character art & Mixamo rigging | Creator / Asset Pipeline | Srishti, Ishaan, Manish, Yash (`30 fps`, live Armature modifiers) |
| Scooter model & attachment sockets | Creator / Asset Pipeline | Single `scooter.glb` instantiated twice (`attach_seat_driver`, `attach_seat_pillion`) |
| Core R3F architecture & gameplay | Developer | Phase 1A shell, Milestone 0 driving, walk/climb controllers, tilak, 3D gallery |
| Scene lifecycle & checkpointing | Developer | `SceneManager`, `AssetManager` (`dispose={null}`), `CameraDirector`, `progressStore` |
| UI overlays | Developer | Tailwind v4 + `motion/react` cards, mobile controls, `<FallbackStorybookView />` |
| Mobile performance & QA | Both | Native quality profile scaling, physical Android/iOS 60s & 3-cycle leak testing |
| Audio landscape | Developer + Creator | Mountain ambience, acoustic guitar, flute, emotional piano, SFX |
| Heartfelt final Bhai Dooj message | **Creator only** | **Written exclusively by creator — never generated by AI** |

---

## Section 14: Phase 1A Readiness & Remaining Creator Confirmations

### Already Approved & Recorded
- ✅ **Names:** Srishti (sister), Ishaan ("Bhai" / "Kumbhkaran"), Manish & Yash (friends on Scooter 2).
- ✅ **Narration Perspective:** Hybrid — `"You"` during gameplay, `"Srishti"` in personal emotional moments.
- ✅ **Language:** Natural Hinglish narration and dialogue.
- ✅ **Music Palette:** Mountain ambience, soft acoustic guitar, flute, and emotional piano.
- ✅ **Timeline:** Quality-first, milestone-based development with no fixed deadline.

### Technical Prerequisites to Start Phase 1A (Unblocked by Creative Questions)
Phase 1A creates neutral technical scaffolding (Next.js 16 shell, locked React 19 / R3F 9 dependencies, `ExperienceWrapper` browser-only boundary, WebGL2 probe, and empty scene shell). **None of the open creative questions below block Phase 1A.** The only prerequisites for Phase 1A are:
1. **Local Runtime:** Node.js `>=20.9.0` and `npm` available.
2. **Architecture Sign-Off:** Approval of this v2.3 plan and lockfile baseline (`npm view` verification + `package-lock.json`).
3. **Deployment Preview Target:** Vercel workspace access (or local build verification if cloud preview waits for Milestone 0).

### Open Creative Decisions Needed Before Content / Art Phases (Phases 2–5)
1. **Scooter 2 Driver vs. Pillion:** Specify whether **Manish** or **Yash** drove the second scooter, or keep their roles unassigned.
2. **Approval of `[PROPOSED]` Staging & Dialogue:** Confirm or revise proposed Hinglish lines and stylized visuals (Kitaabi Dastaan 3D library, Mahakumbh visual sweep, Scene 3 morning stay & alarm/water/headboard wake-up staging, dhaba stall owner chat, cow encounter, step-200 prompt, and Scene 13 4-step puja thali setup).
3. **Real Trip Photo References (`private-assets/` / `personal-photos/`):** Local gitignored photo references for character outfits, scooters, Neelkanth, Baal Kuwari stairs, and polaroid illustrations.
4. **Heartfelt Final Message:** Your personal Bhai Dooj message for Ishaan (authored exclusively by you prior to Phase 5).
5. **Hosting & Privacy:** Public custom domain vs. unlisted/private URL (or simple greeting passcode) for the finished Vercel release.

---

## Appendix: Inspiration References

| Reference | Why It's Relevant |
|-----------|------------------|
| *Journey* (thatgamecompany) | Wordless emotional storytelling through movement |
| *Florence* (Mountains) | Intimate personal story told through interaction design |
| *A Short Hike* | Light exploration, collectibles, mood over mechanics |
| Studio Ghibli visual language | Warm low-poly naturalism, emotional color use |
| *Ken Burns effect* (documentary) | Slow zooms and pans for still image narration moments |
| Indian temple photography | Reference for Neelkanth Mahadev and Baal Kuwari visual design |
| Himalayan travel photography | Color palette, light quality, texture reference |
| Polaroid aesthetic | Frame design for the 3D memory gallery |

---

> **v2.3 — Revised per Codex Final Audit & Architecture Verification. Option B selected (quality-first, milestone-based). Phase 1A technical scaffolding is unblocked by open creative questions and ready to begin upon technical sign-off.**
