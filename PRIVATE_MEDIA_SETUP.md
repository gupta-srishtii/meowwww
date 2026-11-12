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
| scene05_viewpoint_shree | viewpoint-1.jpg | randomview point srishti.jpg |
| scene05_viewpoint_solo | viewpoint-2.jpg | me and ishaan explaing mountains.jpg |
| scene05_viewpoint_group | viewpoint-3.jpg | all four togethere.jpg |
| scene06_dhaba | maggi.jpg | maggi and tea.jpg |
| scene07_neelkanth_food | temple-meal.jpg | food in neelkanth.jpg |
| scene09_stairs_landing | stairs.jpg | baalkumari stairs.jpg (aliases in the local loader also work locally) |
| scene10_baalkuwari | summit.jpg | baalkumari vieew.jpg |
| scene10_baalkuwari_book | book.jpg | book on baalkumari temple me.jpg |
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

## Exact configuration for the existing Vercel project

Keep repository `gupta-srishtii/meowwww`, branch `main`, Next.js, and root `./` as already selected.
The Supabase display name "rishikesh memories" is not a bucket name or URL. Copy that project's HTTPS URL into the server environment.

| Vercel variable | Value / purpose |
| --- | --- |
| SUPABASE_URL | The project's HTTPS URL, without a trailing slash |
| SUPABASE_SERVICE_ROLE_KEY | That project's server-only service-role key; never use NEXT_PUBLIC_ |
| PRIVATE_MEDIA_BUCKET | trip-memories (recommended private bucket; code reads this variable rather than hardcoding a bucket) |
| PRIVATE_MEDIA_OBJECTS | JSON mapping below, adjusted to exact uploaded object keys |
| EXPERIENCE_ACCESS_CODE | Independent random gift code, at least 16 characters; give only this to Ishaan |
| EXPERIENCE_SESSION_SECRET | Different random secret, at least 32 characters; server-only |
| EXPERIENCE_ENABLED | false until activation is approved; true is required to open the gift |

No other production variable is required by the private-media integration. `REQUIRE_ACCESS_IN_DEVELOPMENT` is optional and only controls the local developer gate.

A flat bucket layout is sufficient (no public folder or Git changes):

```json
{"scene02_day1_stream_video":"stream-1.mp4","scene02_day1_stream_video_2":"stream-2.mp4","scene03_tea_stop":"breakfast.jpg","scene05_viewpoint_shree":"viewpoint-1.jpg","scene05_viewpoint_solo":"viewpoint-2.jpg","scene05_viewpoint_group":"viewpoint-3.jpg","scene06_dhaba":"maggi.jpg","scene07_neelkanth_food":"temple-meal.jpg","scene09_stairs_landing":"stairs.jpg","scene10_baalkuwari":"summit.jpg","scene10_baalkuwari_book":"book.jpg","temple_song":"temple.mp3","finale_song":"finale.mp3"}
```

After approval and rights confirmation, upload originals through Supabase Dashboard > Storage > the private bucket. Use the object names above, or map actual uploaded paths exactly (including case, spaces and subfolders). If needed, rename the stored objects to these opaque names; leave local originals untouched. Keep correct image/video/audio MIME types. Never upload private folders to Vercel or put them under public/.

Still required: configure all seven production values, upload the approved 13 originals, then verify photo loading, video seeking and songs on a real device before activation. The Play/Watch click unlocks browser audio after entering the gift code. A browser can still require the song playback button after a policy rejection.

Server-side authentication protects the experience, catalog and every media GET/HEAD request. Unknown objects are rejected, provider URLs expire after five minutes, and public buckets are refused. Live Supabase objects, credentials, MIME types, upload rights, Vercel environment scope and Git auto-deploy settings cannot be verified from repository code. Keep auto-deployment off until approval. No deployment or upload is performed by these instructions.
## Refinement configuration notes

The final product is **Memories Relive**: *Some journeys end. Their memories never do.*
Vercel's project name/domain remain separate settings; this refinement keeps the existing hosting identity.

`PRIVATE_MEDIA_BUCKET` must equal the existing private bucket's actual ID, including spaces. Both `trip-memories` and `trip memories` are now accepted; do not rename a bucket or make it public to work around validation. Project URLs accept a trailing slash. Object keys remain exact and case-sensitive.

When an authorized media request fails, its response includes a safe `X-Memory-Status` category and Vercel function logs include `[private-media]` with the approved memory ID, stage and upstream HTTP status. No object paths, signed URLs, credentials or provider error bodies are logged. Categories distinguish configuration, bucket/privacy verification, signing, download, MIME and connection failures. Generic application/octet-stream uploads receive a MIME fallback only from an allowlisted extension matching the memory kind. Other MIME mismatches fail closed.

The Our Memories panel checks all 13 approved original IDs with authenticated HEAD requests, at most three at a time. Retry refreshes the catalog and checks again; a 401 asks the viewer to reopen the gift session. This checks availability without downloading originals. Actual decoding, playback, seeking and permission to use recordings still need verification with the real files.

For live verification: Vercel project > Deployments > the production deployment matching the pushed Git SHA must show **Ready**. In Logs, filter `/api/media`; after gift login, inspect each request and its diagnostic header. Confirm the production environment's bucket ID and object mapping without copying secret values into chat or Git. Then open all nine images, play/seek both stream videos and play both authorized audio tracks after Play/Watch. Check on a real phone. Earlier setup text describing deployment as unapproved is historical; the current task explicitly authorizes a normal validated main push and deployment verification, without changing secret values, uploads or bucket privacy.
