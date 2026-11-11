# Private media and Vercel readiness

Production is disabled by default. No original media has been uploaded by this change.
Local development (`npm run dev`) retains browser-only folder linking.

## Minimum owner setup (after explicit approval)

1. Create a Supabase project and a **private** Storage bucket named `trip-memories`.
   Do not add public/anonymous read policies. The server refuses public buckets.
2. Confirm permission to distribute each photograph/video and the selected song recordings.
   Only then upload the approved files yourself through the provider dashboard. No upload route is implemented here.
3. In Vercel's server environment settings, set `SUPABASE_URL` (the HTTPS project URL),
   `SUPABASE_SERVICE_ROLE_KEY` (server-only service-role JWT), `PRIVATE_MEDIA_BUCKET`, and
   `PRIVATE_MEDIA_OBJECTS` using the mapping below. Never prefix secrets with `NEXT_PUBLIC_`.
4. Generate two independent random values with Node's `crypto.randomBytes(32).toString('base64url')`.
   Set them as `EXPERIENCE_ACCESS_CODE` and `EXPERIENCE_SESSION_SECRET`. Share only the access code with Ishaan privately.
   Production requires a code of at least 16 characters and session secret of at least 32.
5. Keep `EXPERIENCE_ENABLED=false` until the approved private deployment is checked.
   Once explicitly approved, set it to `true`. Ishaan opens the website, enters the gift code once, then chooses Play or Watch.

`PRIVATE_MEDIA_OBJECTS` is one JSON object. Keys are the IDs below; values are the exact private Storage object keys.
You can retain your original filenames or use the suggested opaque names. Do not include missing/unapproved media in the map.

| ID | Suggested object key | Existing local memory |
| --- | --- | --- |
| scene02_day1_stream_video | stream-1.mp4 | DAY 1 1.mp4 |
| scene02_day1_stream_video_2 | stream-2.mp4 | DAY 1 2 .mp4 |
| scene03_tea_stop | breakfast.jpg | BUN MASKA TEA .jpg |
| scene05_viewpoint_shree | viewpoint-1.jpg | Shree overlook photo |
| scene05_viewpoint_solo | viewpoint-2.jpg | Shree and Ishaan mountain photo |
| scene05_viewpoint_group | viewpoint-3.jpg | All four together |
| scene06_dhaba | maggi.jpg | Maggi and tea |
| scene07_neelkanth_food | temple-meal.jpg | Food in Neelkanth |
| scene09_stairs_landing | stairs.jpg | Baal Kuwari stairs |
| scene10_baalkuwari | summit.jpg | Baal Kuwari view |
| scene10_baalkuwari_book | book.jpg | Book at Baal Kuwari |
| temple_song | temple.mp3 | Approved Har Har Mahadev recording |
| finale_song | finale.mp3 | Approved Bhai Dooj recording |

Example: `{"scene03_tea_stop":"breakfast.jpg","scene02_day1_stream_video":"stream-1.mp4"}`.
Use the real extension of each uploaded recording. The virtual tilak memory is captured in-game; it is not an original trip photo or a cloud object.

## Deployment checks

- Configure the project for Next.js and run `npm run typecheck`, `node --test tests/*.test.cjs`, and `npm run build`.
- Keep Git auto-deployment disabled until approval if Vercel is already connected to this repository.
- Enable HTTPS; configure a Vercel Firewall rate limit for `/api/access` (for example 10 login attempts/minute/IP).
- Before activation, verify anonymous requests to `/api/media` and `/api/media/<id>` return 401.
- Verify wrong gift codes do not issue a cookie; successful login issues an HttpOnly, Secure, SameSite=Strict cookie.
- Test actual photo loads, both videos including seeking, and the approved songs on a real device.
- Check egress/function usage for streaming videos. Routes preserve Range/206 responses and never buffer whole files to disk.
- Rotate the code or session secret to revoke sessions; disable `EXPERIENCE_ENABLED` to close access immediately.

The server checks the session on every media request, verifies the bucket is private, generates a five-minute signed provider URL,
and streams the response without exposing the storage key or signing URL to the browser. Responses are private/no-store.
An authorized viewer **can still save or record media they can view**; this is access control, not DRM.

Hosted cloud delivery and production access are not verified until genuine credentials, approved uploads, and deployment approval are supplied.
No folder selection is required in production; a missing/broken object is labelled unavailable rather than treated as successfully loaded.

Provider references: [private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals),
[signed downloads](https://supabase.com/docs/guides/storage/serving/downloads).

Local QA: typecheck, all 22 regression tests, and production build passed. An accelerated browser run completed all 14 scenes without interaction prompts blocking progress; targeted manual darshan, dining, water purchase, and virtual tilak capture passed.
The nine original photo frames rendered, both original Day 1 videos played, and both original audio files played through browser-only local linking, without copying or uploading files. Audio playback was checked programmatically, not by listening.
The local production gate was browser-tested with synthetic credentials. Storage signing/Range tests use a mocked provider; real cloud playback, phone performance, and hosted delivery limits still require deployment verification after approval.
