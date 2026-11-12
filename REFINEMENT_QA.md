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
