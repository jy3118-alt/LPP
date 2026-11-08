# Independent LPP hosting

Repository: https://github.com/jy3118-alt/LPP (private).

GitHub holds code. A user-owned Cloudflare Worker runs the app, and a private R2 bucket holds songs, artwork, fonts and feelings. No ChatGPT sign-in is used on this deployment. The existing Sites deployment remains working during migration.

## Initial setup

1. Create a Cloudflare account. Run `npm ci` then `npm run cloud:login`; sign in in the browser. Do not paste account passwords or tokens in chat.
2. Enable R2 on the account and run `npx wrangler r2 bucket create lpp-private-records`. R2 enrollment may ask for a payment method; review Cloudflare's account pricing before enabling it.
3. Create a Cloudflare Zero Trust team and a self-hosted Access application for the intended Worker hostname. Allow only your email and enable email one-time PIN. Protect the full hostname including API and fonts, and disable unprotected preview URLs. Workers dashboard also offers Access protection for workers.dev.
4. Store these via `npx wrangler secret put NAME`: `LPP_ACCESS_TEAM` (teamname.cloudflareaccess.com), `LPP_ACCESS_AUD` (Access application audience), `LPP_OWNER_EMAIL` (your approved email), and a random 32-byte `LPP_SERVICE_KEY`. Secrets never belong in Git or frontend JavaScript. The Worker fails closed until configured.
5. Run `npm test` and `npm run deploy`. The independent entry cryptographically verifies Access JWT signature, issuer, audience, expiry and owner email. Forged identity headers cannot open the shelf.
6. Upload font binaries with `node scripts/upload-fonts.mjs`, then migrate the five songs, artwork and actual server feeling history. Never migrate `.local-r2`, which is development data. Preserve existing record hashes and feeling IDs; verify counts, artwork, seek/range playback and feelings before switching addresses.
7. On iPhone, open the new URL in Safari, sign in by email PIN, and Share → Add to Home Screen. Offline downloads/unsynced feelings on the old origin do not automatically move; sync those before switching.

## Updates

Connect this private GitHub repo to Cloudflare Workers Builds, with build command `npm run build` and deploy command `npx wrangler deploy`. Set the same bindings and secrets in Cloudflare. Alternatively run `npm run deploy` from an authenticated local checkout. Music imports and new feeling saves do not need a code deployment.

## Later sharing

Keep the code repository private. A later listening mode should expose selected records and audio as read-only and keep uploading, editing, deletion and exports restricted to the owner. Give each listener's feeling submissions a separate identity. Do not simply remove Access or share the service secret: this release intentionally allows only the owner.

Official references: https://developers.cloudflare.com/workers/wrangler/configuration/ and https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/ .
