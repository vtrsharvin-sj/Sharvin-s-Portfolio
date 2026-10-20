# Publishing Sharvin's portfolio

## Run the production build locally

Use Node.js 22 LTS. Run `npm ci`, `npm test`, `npm run build`, then `npm start`.
Open http://localhost:3000. Leave `VITE_SERVER_URL` blank for this same-host setup.
The production server serves only `dist`, plus `/healthz` and the `/api/live` WebSocket.

## GitHub Pages (recommended workflow for this repository)

GitHub Pages hosts the frontend only. Complete the backend setup in the next section
first; it applies to GitHub Pages as well as other static hosts.

1. Upload the project source to your GitHub repository, including hidden files
   `.github/workflows/deploy-pages.yml` and `.npmrc`. Do not upload `node_modules`,
   `dist`, `.env`, or `server/data`. Keep `package-lock.json`.
2. Under repository **Settings → Pages → Build and deployment**, select **GitHub Actions**.
3. Under **Settings → Secrets and variables → Actions → Variables**, add a repository
   variable named `VITE_SERVER_URL` with your real `wss://YOUR-BACKEND-DOMAIN/api/live` URL.
   This is a public URL, not a secret. The workflow deliberately fails with a clear
   error if it is missing, so a broken live-feature deployment is not published.
4. Set the backend's `ALLOWED_ORIGINS=https://vtrsharvin-sj.github.io`.
   Origins never include the repository path. If you use a custom domain, allow its
   exact HTTPS origin too and configure that domain in GitHub Pages settings.
5. Push to `main` or `master`, or run **Actions → Deploy portfolio to GitHub Pages → Run workflow**.
   Tests and the production build run before deployment. The deployment job provides
   the final Pages URL.

The Vite base is `./`, supporting both `https://vtrsharvin-sj.github.io/REPOSITORY/`
and a root/custom-domain site. Open the repository URL with its trailing slash.
The workflow uploads only `dist`; GitHub does not run `npm start`.
Re-run the workflow after changing `VITE_SERVER_URL`.

Reference: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Persistent backend and other static hosts

There are **two deployments**: the static portfolio and a persistent Node backend.
Uploading `dist` alone does not provide shared messages, leaderboard, cookies, or altar events.

1. Deploy the included Dockerfile on a host that supports an always-running container,
   WebSockets, HTTPS, and a persistent writable disk. The Dockerfile is backend-only.
   Mount persistent storage at `/data`, owned by the container's `node` user (UID 1000).
   Run exactly one replica; the JSON store is not designed for multiple instances.
2. Set backend `ALLOWED_ORIGINS` to your exact frontend URLs, comma-separated,
   for example `https://vtrsharvin-sj.github.io,https://sharvinsj.in`.
   Include only domains you own and are actually using, without trailing slashes.
   Use `/healthz` for host health checks. Forward WebSocket upgrades at `/api/live`.
   TLS is terminated by the hosting platform; the container listens on port 3000
   (or the host's supplied `PORT`). Do not expose this publicly without HTTPS.
3. In Vercel or Netlify, import this project and set the **build environment** variable
   `VITE_SERVER_URL=wss://YOUR-BACKEND-DOMAIN/api/live`.
   Select Node 22. The supplied config uses `npm run build:static` and publishes `dist`.
   Dependencies must include devDependencies during the frontend build.
4. Deploy the frontend. If its assigned domain differs from step 2, update the backend
   allowlist and restart it. Custom domains must also be included in that allowlist.
5. Open the published site. Options should show Server Online. Check a complete circuit
   submission and a message in two browsers, then restart the backend and confirm they remain.
   The circuit leaderboard resets daily at midnight UTC by design.

For a manual static upload, set the same environment variable locally and run
`npm run build:static`, then upload the **contents** of `dist`. Rebuild whenever the
backend URL changes: Vite embeds it in the browser bundle at build time.
Never upload `.env`, `server/data`, or `node_modules` to static hosting.

## Backend without Docker

Install dependencies with `npm ci --omit=dev`; run `npm start` with
`SERVE_STATIC=false`, `DATA_DIR` pointing at persistent storage, and `ALLOWED_ORIGINS`
configured as above. A process supervisor and TLS/WebSocket reverse proxy are required.
Alternatively, omit `SERVE_STATIC=false` and deploy the built `dist` alongside the server
to serve everything from one origin.

## Operational limitations

- Keep backups of `/data/state.json`; do not commit it. Messages are public, latest 30 only.
- Identity is an anonymous browser UUID. Checkpoints are validated for structure/timing,
  but scores are client-submitted and are **not cheat-proof**. Do not attach prizes to scores.
- Payload limits, same-origin/allowlist checks and per-connection action cooldowns exist.
  They are not authentication or comprehensive abuse protection. Before an unrestricted
  public launch, configure host/proxy connection rate limits and a message moderation policy.
- Browser origin checks do not stop non-browser clients. No account login, email delivery,
  moderation dashboard, or authoritative racing service is included.
- This package does not create hosting accounts, purchase services, configure DNS, or publish
  automatically. A public backend URL and persistent host are still required.
- Retain `license.md` and original engine/asset attribution when publishing.
