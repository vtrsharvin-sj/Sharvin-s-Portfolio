# Sharvin's Portfolio

Portfolio for Sharvin SJ, a 13-year-old AI / ML engineer and developer.

Contacts: sharvin@sharvinsj.com · GitHub vtrsharvin-sj · X/LinkedIn/Discord sharvinsj · Instagram sharvin._.777.

The hamburger menu and in-world Projects interaction open the same My Projects section.
Project content is maintained in `sources/data/portfolio.js`; social links in `sources/data/social.js`.
Original engine and asset attribution is retained in `license.md`.

## Setup

### Local live features

`npm run dev` starts both the site and its WebSocket backend on the same port.
`npm run build` followed by `npm run preview` also includes the backend for local testing.
Leave `VITE_SERVER_URL` blank to use `/api/live` on the current host.
Messages (one per browser session, latest 30), daily UTC top-ten race scores, cookies,
and altar contributions persist in `server/data/state.json`. Back up that directory.
Race submissions require all nine checkpoint timestamps; one best time per session is retained.
Ten altar contributions trigger a shared 30-second storm.

Run `npm test` for isolated live-server integration tests. Test data uses a temporary directory.
Use `npm run build` then `npm start` for the production server.
See [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub Pages (automated workflow included),
Vercel/Netlify static hosting plus a separate
persistent backend, Docker, TLS, origins, backups, and public-launch limitations.
The current UUID identity and client-supplied checkpoints are not cheat-proof.
Easter promotional offers remain empty; no fake discount codes are generated.

### Install

Create `.env` file based on `.env.example`

Download and install [Node.js](https://nodejs.org/en/download/) then run this followed commands:

``` bash
# Install dependencies
npm ci --legacy-peer-deps

# Serve at localhost:5173
npm run dev

# Build for production in the dist/ directory
npm run build
```

## Game loop

#### 0

- Time
- Inputs

#### 1

- Player:pre-physics (Inputs)

#### 2

- PhysicalVehicle:pre-physics (Player:pre-physics)

#### 3

- Physics

#### 4

- PhysicsWireframe (Physics)
- Objects (Physics)

#### 5

- PhysicalVehicle:post-physics (Player:pre-physics)

#### 6

- Player:post-physics (Physics, PhysicalVehicle:post-physics)

#### 7

- View (Inputs, Player:post-physics)

#### 8

- Intro
- DayCycles
- YearCycles
- Weather (DayCycles, YearCycles)
- Zones (Player:post-physics)
- VisualVehicle (PhysicalVehicle:post-physics, Inputs, Player:post-physics, View)

#### 9

- Wind (Weather)
- Lighting (DayCycles, View)
- Tornado (DayCycles, PhysicalVehicle)
- InteractivePoints (Player:post-physics)
- Tracks (VisualVehicle)

#### 10

- Area++ (View, PhysicalVehicle:post-physics, Player:post-physics, Wind)
- Foliage (VisualVehicle, View)
- Fog (View)
- Reveal (DayCycles)
- Terrain (Tracks)
- Trails (PhysicalVehicle)
- Floor (View)
- Grass (View, Wind)
- Leaves (View, PhysicalVehicle)
- Lightnings (View, Weather)
- RainLines (View, Weather, Reveal)
- Snow (View, Weather, Reveal, Tracks)
- VisualTornado (Tornado)
- WaterSurface (Weather, View)
- Benches (Objects)
- Bricks (Objects)
- ExplosiveCrates (Objects)
- Fences (Objects)
- Lanterns (Objects)
- Whispers (Player)

#### 13

- InstancedGroup (Objects, [SpecificObjects])

#### 14

- Audio (View, Objects)
- Notifications
- Title (PhysicalVehicle:post-physics)

#### 998

- Rendering

#### 999

- Monitoring

## Blender

### Export

- Mute the palette texture node (loaded and set in Three.js `Material` directly)
- Use corresponding export presets
- Don't use compression (will be done later)

### Compress

Run `npm run compress`

Will do the following

#### GLB

- Traverses the `static/` folder looking for glb files (ignoring already compressed files)
- Compresses embeded texture with `etc1s --quality 255` (lossy, GPU friendly)
- Generates new files to preserve originals

#### Texture files

- Traverses the `static/` folder looking for `png|jpg` files (ignoring non-model related folders)
- Compresses with default preset to `--encode etc1s --qlevel 255` (lossy, GPU friendly) or specific preset according to path
- Generates new files to preserve originals

#### UI files

- Traverses the `static/ui.` folder looking for `png|jpg` files
- Compresses to WebP

#### Resources

- https://gltf-transform.dev/cli
- https://github.com/KhronosGroup/KTX-Software?tab=readme-ov-file
- https://github.khronos.org/KTX-Software/ktxtools/toktx.html
