# gilruiz.dev

Personal portfolio site for Gilberto Ruiz. Static single-page HTML, deployed via Cloudflare Pages.

## Stack

- Single `index.html` with inline CSS — no build step, no framework, no JavaScript
- `_headers` file for security headers (CSP, X-Frame-Options, cache rules)
- Auto-deployed on push to `main`

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Pushed to `main` on this repo → Cloudflare Pages rebuilds → live at https://gilruiz.dev within ~30 seconds.
