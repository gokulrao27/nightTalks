# NightTalks

NightTalks is a Vite + TypeScript prototype for a late-night anonymous calling experience. The app walks a user through onboarding, safety confirmations, the nightly open/closed call window, a simulated call flow, a post-call word save, and an anonymous community wall.

## What is included

- **Mobile-first UI** with a full-screen layout on phones and a polished phone preview on larger screens.
- **Onboarding flow** for alias, avatar, timezone, and safety confirmations.
- **Nightly availability logic** that opens the line from 2:00 AM to 2:50 AM local time.
- **Simulated call experience** with connecting, in-call timer, transcript cards, and post-call actions.
- **Persistent local state** stored in the browser with `localStorage`.
- **TypeScript checks and production build** through Vite.

## Prerequisites

Install these before running the project:

1. **Node.js 18 or newer** — Vite 6 supports modern Node versions.
2. **npm** — included with Node.js.
3. A modern browser such as Chrome, Edge, Firefox, or Safari.

Check your versions:

```bash
node --version
npm --version
```

## Project setup

Follow these steps from a fresh clone.

### 1. Clone the repository

```bash
git clone <repository-url>
cd nightTalks
```

### 2. Install dependencies

```bash
npm install
```

This installs Vite and TypeScript using the lockfile in `package-lock.json`.

### 3. Start the development server

```bash
npm run dev
```

The dev server binds to `0.0.0.0`, so it can be opened from the local machine or a forwarded development URL. Vite prints the exact local URL in the terminal, usually:

```text
http://localhost:5173/
```

### 4. Open the app

Open the Vite URL in a browser. On mobile-sized screens the app fills the viewport. On tablet and desktop screens it displays as a centered phone preview with supporting hero text.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run check` | Run TypeScript without emitting files. |
| `npm run build` | Type-check the app and build production assets into `dist/`. |
| `npm run preview` | Serve the production build locally. Run `npm run build` first. |

## How to test changes

Run these commands before opening a pull request:

```bash
npm run check
npm run build
```

If both commands pass, the TypeScript code is valid and Vite can create a production bundle.

## Responsive UI notes

The layout is intentionally mobile-first:

1. Phones and narrow screens use the full viewport with no device frame.
2. Larger screens use a desktop presentation shell and keep the app in a phone-sized preview.
3. Short desktop viewports allow the preview to shrink so important content remains reachable.

The responsive behavior is defined in `src/styles.css`.

## Application structure

```text
nightTalks/
├── index.html          # Vite entry HTML
├── package.json        # npm scripts and dev dependencies
├── src/
│   ├── main.ts         # App state, templates, navigation, timers, persistence
│   └── styles.css      # Visual design and responsive layout
├── tsconfig.json       # TypeScript compiler settings
└── README.md           # Setup and usage documentation
```

## State and data

The prototype does not use a backend. It saves local prototype state in browser storage under the key:

```text
nightcall:v2
```

To reset the app during testing, clear site data in your browser developer tools or run this in the browser console:

```js
localStorage.removeItem('nightcall:v2');
location.reload();
```

## Production build and preview

Create production assets:

```bash
npm run build
```

Preview the generated build:

```bash
npm run preview
```

Vite serves the files from `dist/` and prints the preview URL in the terminal.

## Troubleshooting

### The app still opens on a later screen

Clear the `nightcall:v2` local storage key and reload the browser.

### The line is closed

The prototype calculates the call window from your local system time. The line opens daily from **2:00 AM to 2:50 AM**.

### The dev server URL does not open on another device

Make sure both devices are on the same network, use the network URL printed by Vite, and check that local firewall rules allow the connection.
