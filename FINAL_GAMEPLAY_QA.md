# Final gameplay refinements - Memories Relive

## Scope and protected integration

Implemented in the existing repository without changing the two-day story order or rebuilding the game. The private-media loader, catalog/proxy routes, Supabase configuration parser, access/session implementation and media mappings are unchanged in this revision. No secrets, environment files or private originals were read into commits or changed. The user reports production photos are working; this revision preserves that integration.

## Pranam root causes and fix

Three independent failures were found: the walking branch returned before prayer could affect moving companions; the minimum approach speed oscillated around prayer targets, so some companions kept facing their movement direction; and the wall-clock darshan deadline could end the cinematic before enough capped simulation frames rendered. The old camera also sat within the formation.

Prayer now overrides locomotion, companions settle at separate slots and face the deity, and the bow clock begins only when position and facing are ready. The shared rig animates torso/head and places the palms together using the existing straight left arm and articulated right arm. Staggered prayer weights hold the bow and return upright. Rendered simulation completion calls the story controller after recovery; the old darshan timeout is removed. A three-quarter camera keeps all four and the shrine in frame. Baal Kuwari uses the same prayer rig, formation settling, stagger and recovery. Bell/audio unlock remains gesture-based; a blocked temple recording offers a retry button while existing procedural fallback remains available.

Browser evidence: beginning, held bow and recovery screenshots in ignored qa-artifacts/pranam-*.png. Captured rendered torso angles were approximately -0.70 radians for all four during the hold and near zero after recovery. Final facing yaws matched the deity targets for all four. The scene remained in darshan through recovery and then completed without page errors. These are rendered-scene checks, not code-existence claims.

## Viewpoint, roads and speed

The viewpoint is a required automatic stop in Play and Watch. Approach speed reduces before the turnout, and the parked notification waits for both scooters. Four staged dismounted characters walk toward the overlook; a wide elevated frame shows mountains, the valley/river and an added distant winding road. Existing Srishti, shared mountain and group photo IDs/capture paths are reused. All three photo moments are automatic, followed by a five-second hold and group return walk. The earlier continue-after-one-photo shortcut is removed. Resuming starts at the actual parking distance with a slow merge from the apron rather than jumping ahead along the route.

Roads have stronger S-bends/hairpins and longer distant continuations. Existing connected terrain, barriers, rocks, vegetation and quality-dependent instancing remain. Road boundaries account for scooter width, with tighter bounds on the dirt track. Turn lean includes signed road curvature, while the chase camera's distance and look-ahead respond to speed.

A visible speedometer uses the existing direct DOM telemetry refs. The game ceiling is 75 km/h; gradual acceleration/braking, curvature look-ahead, stopping distance, off-road limits, traffic and authored pedestrian/stall zones impose lower contextual speeds. W/up accelerates, S/down brakes, A/D or arrows steer; existing independent touch Gas/Brake/steering controls remain. Required viewpoint/story stops cannot be bypassed by throttle.

## Morning market

A reusable MarketBuilding kit is shared by night-market storefronts and the daylight extension near the existing breakfast stall. The continuation adds cafes, hotels, balconies, signs, residents, parked scooters and the existing animated traffic kit. The original four-character bun maska/kulhad moment and private photo mapping remain. Morning rider movement now uses swept collision checks against the existing shop/stall obstacles, including the companion scooter. Breakfast's camera is higher and wider so the counter and surrounding market read together. Night-market and dhaba scenes remain in place.

## Validation

- TypeScript and all 36 Node tests passed, including new speed ceiling/braking/cornering, prayer locomotion precedence, joined hand contact and formation/facing regressions.
- Optimized Next.js production build passed. A final repeat after the explicit pedestrian-zone cap is recorded in the final report.
- Browser: full Neelkanth gathering/bow/hold/recovery; viewpoint arrival, three automatic photos, hold and return; keyboard acceleration and braking; morning breakfast; mobile touch throttle/brake and 390 x 844 layout without horizontal document overflow. No page exceptions in these checks.
- Synthetic, memory-only production-server access checks passed: branding/social metadata, anonymous GET/HEAD 401, wrong-code rejection, secure HttpOnly session, authenticated game markup and fail-closed missing-storage 503. No real provider configuration was used or changed.
- No lint command/configuration exists in this repository.

The final report records the additional ride-to-parking/Baal Kuwari visual results, final build and exact pushed commit's Vercel status. Screenshots and browser scripts stay in ignored qa-artifacts, outside the commit.

## Limits

Headless Edge uses software rendering; it does not establish real-phone FPS or real-device touch ergonomics. Original Supabase media playback and listening were not re-tested with genuine credentials. Existing private-media/auth regression tests pass and protected integration files are unchanged. Existing nonfatal React nested-root unmount and Three.js deprecation warnings remain; no new page exceptions were observed. Vercel's authenticated Ready field/runtime logs require dashboard access; the public Vercel commit check can establish build completion for the exact SHA without revealing secrets.

Additional rendered checks: holding the accelerator through the mountain approach still produced a mandatory complete viewpoint stop; the observed route peak was 48 km/h and the final sampled speeds were consistently 0 before stepping off. The 75 km/h ceiling is also reached and bounded in the speed-model regression, while this route's hazards impose lower speeds. The final viewpoint and morning camera framing was inspected in screenshots, including the river/distant road and readable market signs. Keyboard acceleration/braking, mobile throttle/brake and the photo sequence passed without page exceptions.

Final checks completed: the ride-to-viewpoint test reached 0 km/h despite held throttle, the Baal Kuwari rendered hold showed all four torsos at approximately -0.70 radians and recovered afterward, and the staged viewpoint group walk was captured and visually reviewed. No page errors occurred in these checks. The final corrected source passed TypeScript, all 36 tests and the optimized production build. The production-server synthetic access smoke check was repeated against that build. Final commit/deployment status is reported with the exact SHA in the task response.
