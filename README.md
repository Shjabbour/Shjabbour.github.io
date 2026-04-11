# Shadi Portfolio

Standalone portfolio site for Shadi Jabbour.

## Structure

- `index.html`: page markup
- `styles.css`: visual system and responsive layout
- `app.js`: reveal and text-rotation behavior
- `Open Portfolio.cmd`: opens the local site in the default browser

## Local use

Double-click `Open Portfolio.cmd` to open the live site, or open `index.html` directly in a browser.

## Dev server

- `pnpm dev`: serves the site locally on `http://127.0.0.1:4173` and starts a temporary Cloudflare tunnel so the dev version is reachable from anywhere.
- `pnpm dev:local`: serves the site locally without Cloudflare.
- `Start Portfolio Tunnel.cmd`: one-click launcher for the Cloudflare-backed dev workflow.
- `Start Portfolio Local Dev.cmd`: one-click launcher for local-only dev.

Notes:
- The machine running `pnpm dev` still needs an internet connection.
- Cloudflare removes the need to be on the same Wi-Fi or to open ports on your router.
- The public URL is printed in the terminal after the tunnel comes up.
- If port `4173` is already taken, the dev server automatically moves to the next open port.

## Publish

This repo is configured as a native GitHub Pages user site.
Pushes to `main` deploy the site at `https://shjabbour.github.io/`.
It can also be deployed to Netlify or Vercel without a build step.
