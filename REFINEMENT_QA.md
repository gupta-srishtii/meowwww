# Memories Relive refinement QA

Subtitle: Some journeys end. Their memories never do.

## Phase 1 — media and branding

Changed: server storage configuration; authenticated media health/retry UI; memory-card fallback; metadata, gate, opening, loading, icon; product documentation.

Confirmed defect: `storageConfiguration()` rejected a bucket containing spaces, returning catalog HTTP 503 before any storage request. `trip memories` now passes validation and is encoded as a single URL segment. Project URLs tolerate a trailing slash. Empty byte ranges are rejected. Private bucket verification, server-only signing, session checks, streaming and no-store remain in place.

Validation: TypeScript passed; 24 Node regression tests passed; Next.js production build passed. No lint script or lint configuration exists in this repository.

Production observation: https://meowwwww-rho.vercel.app responds HTTP 200 with the previous title. Anonymous catalog and a media request return 401. The supplied deployment-specific URL redirects to Vercel login. No authenticated session, provider credentials or Vercel runtime logs are available here; the actual production bucket, authenticated failure status, all 13 originals, MIME types and playback remain unverified. The bucket-space defect is reproduced locally, not asserted as the verified live root cause.

## Scene checklist — approved scope retained

- Opening: final product name and subtitle; retain Play/Watch and audio gesture.
- Day 1: stream seating/chips ? Ishaan and Manish jungle run ? return/seating ? Maggi ? hotel; remove unwanted rafting dialogue.
- Viewpoint: automatic positioning/camera/shutter/reveal on reaching the photo spot.
- Evening: populated market, walking dinner/return, winding neighborhood, hotel field, upstairs/ground-floor separation.
- Roads: distant curves, terrain/foliage layering, controllable scooters, swept collisions and camera clearance.
- Day 2: breakfast media, all four at Neelkanth, bell-triggered authorized audio, coordinated bow, market meal ? direct Baal Kuwari ride.
- Baal Kuwari: scenic grounds, two Jai Mata Di gates, ~400 steps, early water stop/help, automatic summit photo, group prayer/descent.
- Finale: fabric/accessories, seating/contact, tilak/mithai, sibling tone, camera/lighting/gestures.
- Final QA: typecheck, regressions, production build, available browser checks; normal main push and production Ready verification.

Later-phase results are recorded below as work is validated. Visual quality, device FPS and live private-media playback require browser evidence.

## Phases 2 and 3 - story, traversal and temples

Changed files: Scene02_RishikeshDay1, Day1EveningEnvironments, HotelReturnEnvironment, MarketRoadLife, Scene05_ViewpointStop, Scene07_NeelkanthTemple, Scene10_BaalKuwariTemple, BaalKuwariStairsEnvironment, BaalKuwariTempleEnvironment, DevotionalGate, SummitFlowers, Experience, PrologueStoryHUD, useWalkController, useCompanionFollower, storyTraversal, cameraClearance.

Implemented a timed seated pause/chips and an upstream out-and-back run for only Ishaan and Manish; extended the stream/Maggi/dinner holds. Dinner now uses four walking rigs instead of the solo scooter; the wider bazaar has a separated footpath, moving lane traffic, readable shop signs and existing lit storefronts/locals. Hotel return follows a winding authored corridor, shows the four returning and Srishti ascending while Ishaan stays downstairs, and adds the open rear field. Day 1 location changes use a short travel curtain; existing scene transitions and skip controls remain.

Viewpoint photos trigger automatically near their photo spots in Play as well as Watch. Swept substeps cover player/autopilot/companion walking; blocked autopilot feet stop cycling. Camera booms shorten before entering mapped obstacles in the changed walking scenes. Neelkanth autopilot now respects mapped collisions. The bell enables the already-authorized temple track through the existing browser audio-unlock mechanism. Group bow timing includes gathering, bow/hold and rising. Baal Kuwari adds the group prayer on bell, automatic photo spot triggers in Play, labeled Jai Mata Di gates at the foot and summit, and an instanced flower border.

Preserved: the existing Day 1 order, Day 2 breakfast and Neelkanth meal, direct Baal Kuwari approach, 400-step stair system, early water stop/help, book-photo cinematic and descent. The unwanted quoted rafting dialogue was absent from inspected source. Existing distant ridges, connected terrain, road splines, scooter acceleration/turning and instanced trees remain; this is an incremental refinement, not a replacement environment or a full physics navigation system.

Validation during implementation: TypeScript passed; traversal, wall-tunneling, blocked-foot-motion, prayer timing and camera-clearance behavioral regressions pass. Browser mounted all 14 story scenes (opening plus scenes 2-14) without page exceptions. Screenshots are local-only in ignored qa-artifacts. One initial broad browser pass stopped at a UI locator timeout; targeted finale/gallery checks completed afterward. HMR interrupted an early Day 1 walkthrough; a stable-source rerun is recorded separately below. Scene mounts are smoke checks, not a claim that every interaction was exhaustively played.

## Phase 4 - finale

Changed files: StylizedPlaceholderCharacter, animateCharacterRig, Scene13_BhaiDoojFinale, handContact.

The festive dupatta sits closer to the torso and gathers in seated poses. A reusable two-bone hand solver preserves contact-driven tilak application and guides each sibling's own mithai toward their mouth in the single tasting beat. Existing grounded seating, jhula, facial smiles, warm lighting and sibling tone remain.

Validation: a behavioral test verifies exact hand contact under a rotated/scaled root and finite results for unreachable targets. Browser completed Apply Tilak -> Share Mithai -> Happy Bhai Dooj with no page errors. Gallery mounted; a 390 x 844 viewport had no horizontal document overflow. This does not certify mobile touch ergonomics or real-device performance.

## Phase 5 - current QA limits

33 Node tests pass, including access/session security, Supabase mocking/Range/space-containing bucket paths, generic MIME fallback, safe provider diagnostics, all-13 health probes with concurrency/retry, checkpoint compatibility, audio policy recovery, traversal/camera clearance and hand contact. TypeScript passes. A final optimized production build and production-server gate smoke check are recorded below when complete. No lint command/configuration exists, so lint was not run.

Observed nonfatal browser console warning on scene changes: React reports synchronous unmount of a nested root while rendering (consistent with the current Html overlay/library lifecycle). No page exception occurred. This warning remains unresolved. The Node tests also emit Three.js's CommonJS deprecation notice.

Outstanding verification: real Supabase bucket/configuration and authenticated statuses; all original image decoding/video seeking/authorized audio in production; listening to audio; exhaustive collisions and camera clearance across every NPC/prop; a full uninterrupted two-day Play/Watch run; real phone controls and FPS. Software-rendered headless browser timing is not a device FPS measurement. No private originals, environment files, gift codes or provider credentials are included in commits.
Stable-source Day 1 browser rerun reached the stream, market walking, dinner skip and hotel-return stages without page errors. The final hotel screenshot was taken during the approach; it does not by itself verify the upstairs animation's endpoint. The final visual correction adds warm fill for the night group, centers the footpath camera, and aligns feet to the sidewalk surface.

Optimized production build passed before that small lighting/framing correction. A final repeat is required for the corrected revision. Production-server smoke used generated memory-only synthetic credentials: final title/subtitle/social metadata, anonymous GET/HEAD 401, wrong-code rejection, secure HttpOnly session, authenticated game markup and missing-storage catalog 503 all passed. No genuine provider configuration was used or changed.

Deployment verification must match the final pushed SHA. The production alias was reachable before this change; that observation is not evidence that these commits are deployed. GitHub's Vercel status and the live title will be checked after push; direct dashboard Ready/runtime-log access depends on an authenticated connection. The final response records the verified outcome and remaining limits.

Final corrected revision: TypeScript, all 33 Node regressions and the optimized Next.js build passed. The production-server synthetic gate smoke check was repeated after the lighting/framing changes. Source deployment status is reported separately after the requested main push.
