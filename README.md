# metuCE

metuCE is a free civil engineering calculator site. It combines static course pages with several independent React/Vite calculators that show step-by-step solution methodology.

## Repository Layout

```text
.
|-- index.html              # Landing page
|-- contact.html            # Contact page
|-- contribution.html       # Contribution guide page
|-- hydro/                  # Static Hydromechanics calculators
|-- numerics/               # Numerical Methods hub page
|-- structsolve/            # React/Vite structural analysis app
|-- rootfinder/             # React/Vite root-finding app
|-- condnumber/             # React/Vite condition-number app
|-- funcapprox/             # React/Vite interpolation/regression app
|-- build.sh                # Builds all apps and assembles dist/
`-- vercel.json             # Vercel deployment config
```

## Local Development

Install dependencies inside the app you want to run:

```bash
cd structsolve
npm install
npm run dev
```

Root helper scripts are also available:

```bash
npm run dev:structsolve
npm run dev:rootfinder
npm run dev:condnumber
npm run dev:funcapprox
```

Each app runs independently because each app has its own `package.json`, lockfile, Vite config, and dependency tree.

## Build

The production build is assembled from the repository root:

```bash
npm run build
```

This runs `scripts/build.mjs`, which:

1. installs and builds `structsolve`
2. installs and builds `rootfinder`
3. installs and builds `condnumber`
4. installs and builds `funcapprox`
5. copies root static pages, Hydro calculators, Numerical Methods pages, contributors, and built app outputs into `dist/`

## Deployment

The project is configured for Vercel.

Vercel should use:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: `20.x`

The Vercel config rewrites app routes like `/structsolve`, `/rootfinder`, `/condnumber`, and `/funcapprox` to each app's built `index.html`.

## Tests

Run lightweight engine tests from the repository root:

```bash
npm test
```

The current tests focus on deterministic pure functions. UI and browser-level tests are not yet included.

## Contribution Notes

- Keep user-facing text encoded as UTF-8.
- Prefer fixing calculator math in engine/solver files before changing UI presentation.
- Add small numerical tests for any solver behavior change.
- Keep each calculator independently runnable unless the repo is intentionally converted to a monorepo workspace.
