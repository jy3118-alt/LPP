# LPP device edition

GitHub Pages serves the app only. The 10 approved songs and their covers are public files in `web/library`, automatically listed on first launch. Audio downloads in the background for offline use and can stream while the download is pending. Imported personal music, favorites and feelings stay in IndexedDB on the device. No Supabase, R2, ChatGPT account, payment card or upload API is used. The Pages workflow publishes only `pages-dist`, built from web assets with the device configuration. Only the 10 presently listed songs are included. Private backups and feeling data are excluded from the repository.

On iPhone, open the Pages URL in Safari and Share → Add to Home Screen. Open the installed app before importing songs or restoring a backup. Safari and the installed home-screen app may have separate device storage. The default 10 records appear automatically. Import records opens Files for extra device-only music. You can edit sleeve artwork in record details.

Settings → Backup → Export saves music, sleeves and feelings in one JSON file. Keep it in Files/iCloud Drive. Restore merges records by their fingerprint and feelings by ID. Settings → Feelings → History exports CSV or JSON for later research. Deleting a song preserves its saved feeling history.

Browser/site data deletion or device loss can erase this library. There is no server copy or automatic cross-device sync. Keep original music and periodic backups. The app requests persistent storage where supported, but cannot guarantee OS storage retention.

The private source-hosted edition is retained in the codebase for future use; it is not the Pages entry. The old Sites service has not been deleted or made public. Any prior server feeling history must be migrated separately; it does not appear automatically at the new origin.

## Playback and motion
The audible HTML audio element is the only media element. Foreground visualization uses a silent mono Web Audio buffer and stops when hidden. The main media source is not rebuilt on visibility/focus changes. Current track and position are saved locally, restored after reload, and sent to Media Session. Automatic restart after a browser reload is subject to the browser's autoplay policy; pressing play resumes the restored position. Safari tabs and a separately launched home-screen app remain separate browsing contexts. Physical iPhone lock-screen behavior still requires device verification.

Typography uses the existing variable font at a stable BOIL setting with smooth transform motion. Heavy per-icon SVG turbulence filters were removed. Long titles scroll only when they overflow. Feelings retain six original font axes, with vivid continuous color interpolation, integer percentages totaling 100%, and the latest saved face shown on the record.

## iPhone interaction notes
The mini-player accepts horizontal swipes and suppresses the accidental click after a completed swipe. The last feeling opens again at its saved position. Offline readiness reports the number of locally saved tracks. Background audio caching merges only the audio blob into the existing record so favorites and feelings are not overwritten. Shuffle and repeat settings survive reloads. Safari and Home Screen copies can have separate storage. WebKit and the operating system may suspend or recreate a page; actual lock-screen, playback continuation and touch behavior must be verified on an iPhone.
