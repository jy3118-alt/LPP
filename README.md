# LPP — Private Press

A private iPhone-first music player with living ink typography, ten audio-reactive grooves and a PoVF feeling recorder. The interface is English. Includes the existing Sites deployment and a separate Cloudflare entry for hosting without a ChatGPT account. See [independent hosting](docs/independent-hosting.md).

## Use on an iPhone
1. Open the deployed address in Safari and sign in with the owner's ChatGPT account.
2. Optionally use Share → Add to Home Screen, then open LPP there.
3. Import records → Files. Uploads go to the private server shelf and appear on the owner's other devices without another deployment.
4. Pick a record to play. The face beside the heart opens the feeling recorder.
5. Rub/drag the face, then Save. Every save appends a separate impression.
6. Settings → Feelings → History provides CSV and JSON exports. Record details also shows that record's history.
7. Record details → Offline → Download saves a device copy for offline listening.

## Storage and access
- Cloudflare R2, provisioned by Sites as `BUCKET`, stores music, sleeve artwork, record metadata, font binaries and append-only feeling records. Music is not committed to Git or embedded in the Worker.
- The Site remains owner-private. The backend checks the dispatch-owned authenticated user header and binds the library to the first signed-in owner. Other identities are rejected. The initial setup runs only while access remains owner-private.
- Service imports require both the Sites service-access gate and a separate runtime secret `LPP_SERVICE_KEY`. The secret is stored in Sites, never in source or the frontend.
- Browser IndexedDB `sojang-music` version 2 holds device downloads, cached library metadata, and an offline feeling outbox. Legacy local records are preserved and can be uploaded from their details.
- Raw uploads are SHA-256 verified by R2 and deduplicated by their content hash. Maximum audio file size is 50 MB. Files stream with HTTP Range support.
- Conditional R2 writes protect record metadata against lost concurrent edits. Feeling IDs make retries idempotent.
- Removing a song removes its server audio and current metadata. Historical feeling records keep their song/title/artist/checksum snapshots.
- Browser cleanup or app removal can erase offline downloads and pending unsynced feelings. Keep original audio files. Server records require the hosting service/account to remain available.

## Feeling model
The original confirmed PoVF circular mapping is retained: clockwise from the top, Happy → Scared → Surprise → Sad → Disgust → Angry. Direction mixes adjacent axes and radial distance controls intensity. Neutral is at the center. Each original axis ranges 100–500.

PoVF axes: Happy=wdth, Scared=ital, Surprise=slnt, Sad=opsz, Disgust=yopq, Angry=wght. `web/emotion-model.js` is shared by the browser and backend. The backend recomputes values from coordinates; it does not trust submitted emotion labels.

Fixed category colors:
- Neutral #9B9B9B
- Happy #FFD34E
- Scared #AA7DFF
- Surprise #67D9FF
- Sad #5587FF
- Disgust #8BCC58
- Angry #FF5757

Every impression includes schema/mapping version, event ID, record ID and checksum, title/artist/filename snapshot, client occurrence time and server receipt time, playback time/duration, X/Y/angle/intensity, all six raw and normalized emotion values, PoVF axes, dominant category, blended label and color. These are user annotations, not automatic emotion inference. CSV/JSON exports remain private to the owner. UTC ISO timestamps are retained; the history UI displays English dates in Asia/Seoul.

The user confirmed the existing `Portpolio/public/interaction/emojition` copies as the intended reference when the originally supplied Downloads path was unavailable. The reference HTML is preserved under `references/`; only the needed mapping and PoVF font are integrated into the player.

## Sound and visuals
Actual music plays through a native HTML audio element. A synchronized silent analysis copy runs through Web Audio with zero output gain, so suspending visual analysis does not route the audible music through AudioContext. Supported Audio Session playback mode and Media Session controls are configured. Analysis pauses offscreen.

Ten rough rings react to amplitude, frequency balance and spectral texture. Their actual per-layer Z coordinates create front/back depth through perspective projection. Continuous phase, waveform averaging and temporal smoothing avoid stepped motion. Idle outlines keep gently moving without music. The camera center remains anchored to the record position, while the pointer-transparent drawing surface spans the viewport to avoid clipping. Colors stay in an orange/amber/ember palette.

All interface text uses the previously created Noto Serif KR derivative Open Cosmos Ink KR Full with its BOIL axis. The PoVF font is used only for faces. Open Cosmos Ink supports all 11,172 modern Hangul syllables plus its included Latin, jamo and punctuation. Its original SIL OFL notice is in `web/fonts/OFL.txt`.

## Source and deployment
- `web/`: authored frontend and font files.
- `worker/index.js`: authenticated server routes, R2 access, streaming and exports.
- `scripts/build.mjs`: embeds the small app assets and emits an ES-module Worker under `dist/server/`. Large font binaries are seeded separately into R2.
- `.openai/hosting.json`: existing Site identity, R2 binding and no D1 database.
- `scripts/seed-private.py`: reads import credentials through hidden stdin; imports only explicitly supplied files and allowlisted font assets.
- `scripts/dev.mjs` and `scripts/local-bucket.mjs`: local-only R2 adapter and simulated owner identity. They are not included in the production Worker.
- `test/shelf.test.mjs`: authorization, upload/deduplication, range streaming, edits/deletes, service asset restrictions, emotion mapping and append-only export tests.

Build: `node scripts/build.mjs`
Test: `node --test test/*.test.mjs`
Local preview: `node scripts/dev.mjs`

Publish using the Sites source/package workflow and owner-private deployment. GitHub is not required. Hosting is subject to the account's current service limits and billing policy.

## Verification and limits
Passed backend tests and JavaScript syntax checks. Browser QA verified actual M4A streaming, file-chooser upload to the server shelf, drag/keyboard emotion selection, private save/history, CSV/JSON routes, mobile layout and fixed category color application. Local test records and feelings remain in ignored `.local-r2/` and are not deployed. The five supplied songs are imported into production separately after deployment.

Actual iPhone hardware, lock-screen continuation, long background sessions, interrupted phone calls, and offline Home Screen behavior still require device testing. The silent analysis stream adds an extra decoder only while the app is visible and motion is enabled.
