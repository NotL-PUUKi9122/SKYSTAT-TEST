# SkyStat profile API

This Cloudflare Worker keeps the Hypixel key off the public GitHub Pages site. It resolves a Minecraft username, fetches the player's public SkyBlock profiles, selects the active profile (or most recently saved profile), and returns skill XP, collection counts, HOTM and Garden data when present.

## Deploy

1. Install Wrangler and sign in to Cloudflare: `npm install -g wrangler` then `wrangler login`.
2. From this directory run `wrangler secret put HYPIXEL_API_KEY` and paste the application key from the Hypixel Developer Dashboard into the terminal prompt. Do not put the key in the website, GitHub repository, or chat.
3. Run `wrangler deploy`. Note the resulting `https://skystat-test-api.<your-subdomain>.workers.dev` URL.
4. Set that URL as `API_BASE` near the top of the website script in `prototype/index.html`, then publish the updated `index.html` to GitHub Pages.

The Worker allows browser requests from this project's GitHub Pages origin. Profile calls happen only after a user submits a username. There is no polling or player-stat history. The client can save personal milestone targets in that browser.

Hypixel may return less data if the player has disabled API access in game. This first integration does not decode inventory NBT, provide live prices, or provide official gathering leaderboards; those panels must show unavailable until a compliant data source is added.
