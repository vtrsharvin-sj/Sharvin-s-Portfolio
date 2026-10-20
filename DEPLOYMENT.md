# Publishing Sharvin's portfolio

## Run the production build locally

Use Node.js 22 LTS. Run `npm ci`, `npm test`, `npm run build`, then `npm start`.
Open http://localhost:3000. Leave `VITE_SERVER_URL` blank for this same-host setup.
The production server serves only `dist`, plus `/healthz` and the `/api/live` WebSocket.

## GitHub Pages and Cloudflare live server

GitHub Pages serves the static portfolio. The included Cloudflare Worker handles the
WebSocket connection, shared messages, circuit leaderboard, and counters. It stores
state in a SQLite-backed Durable Object. Cloudflare supports Durable Object WebSockets;
the free Workers plan has daily usage limits, so this is suitable for a small personal
portfolio, not unlimited traffic.
See Cloudflare's [WebSocket guidance](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
and [Workers pricing and limits](https://developers.cloudflare.com/workers/platform/pricing/).

1. Create a Cloudflare account and enable its `workers.dev` subdomain under **Workers &
   Pages**. The account ID is already configured in `cloudflare/wrangler.toml`.
2. Create a Cloudflare API token using the **Edit Cloudflare Workers** template, scoped
   to only that account.
3. In GitHub repository **Settings → Secrets and variables → Actions → Secrets**, add
   `CLOUDFLARE_API_TOKEN`. Never put the token in a public file or repository variable.
4. Under repository **Settings → Pages → Build and deployment**, select **GitHub Actions**.
5. Push to `main` or `master`, or run **Actions → Deploy portfolio to GitHub Pages → Run
   workflow**. The workflow deploys the Worker first, builds the frontend with its
   generated secure WebSocket URL, then publishes Pages.

The Worker permits the GitHub Pages origin `https://vtrsharvin-sj.github.io`. If you
configure a different/custom frontend domain, add its exact origin to
`ALLOWED_ORIGINS` in `cloudflare/wrangler.toml`. Origins never include a URL path.
The Vite base is `./`, supporting both repository and root/custom-domain sites. The
workflow uploads only `dist`; GitHub does not run `npm start`.

Reference: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Existing Node backend and other static hosts

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

- For the Node backend, keep backups of `/data/state.json`; do not commit it. Cloudflare
  backend state is stored in its Durable Object. Messages are public, latest 30 only.
- Identity is an anonymous browser UUID. Checkpoints are validated for structure/timing,
  but scores are client-submitted and are **not cheat-proof**. Do not attach prizes to scores.
- Payload limits, same-origin/allowlist checks and per-connection action cooldowns exist.
  They are not authentication or comprehensive abuse protection. Before an unrestricted
  public launch, configure host/proxy connection rate limits and a message moderation policy.
- Browser origin checks do not stop non-browser clients. No account login, email delivery,
  moderation dashboard, or authoritative racing service is included.
- This package cannot create a Cloudflare account or API token. Add the two GitHub secrets
  before running the workflow; it deploys the Worker and builds the Pages site automatically.
- Retain `LICENSE` and original engine/asset attribution when publishing.
