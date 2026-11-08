# LPP device edition

GitHub Pages serves the app only. Imported music, cover artwork, favorites and feelings stay in IndexedDB on the device. No Supabase, R2, ChatGPT account, payment card or upload API is used. The Pages workflow publishes only `pages-dist`, built from web assets with the device configuration. Songs and private backups are excluded from the repository.

On iPhone, open the Pages URL in Safari and Share → Add to Home Screen. Open the installed app before importing songs or restoring a backup. Safari and the installed home-screen app may have separate device storage. Import records opens Files. You can edit sleeve artwork in record details.

Settings → Backup → Export saves music, sleeves and feelings in one JSON file. Keep it in Files/iCloud Drive. Restore merges records by their fingerprint and feelings by ID. Settings → Feelings → History exports CSV or JSON for later research. Deleting a song preserves its saved feeling history.

Browser/site data deletion or device loss can erase this library. There is no server copy or automatic cross-device sync. Keep original music and periodic backups. The app requests persistent storage where supported, but cannot guarantee OS storage retention.

The private source-hosted edition is retained in the codebase for future use; it is not the Pages entry. The old Sites service has not been deleted or made public. Any prior server feeling history must be migrated separately; it does not appear automatically at the new origin.
