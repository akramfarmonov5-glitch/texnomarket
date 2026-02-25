<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1iLF-Fc_KSdBYqAK4TEnTUUOsla_-lTho

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env.local`
   - This key is used only by backend API (`/api/ai/*`), not by browser bundle
3. Optional production settings in `.env.local`:
   - `VITE_ADMIN_PHONES=+998901234567,+99890XXXXXXX`
   - `VITE_ADMIN_TELEGRAM_IDS=123456789`
   - `VITE_ADMIN_LOGIN_CODE=strong-secret-code` (required for admin access)
   - `CORS_ALLOWED_ORIGINS=https://texnomarket.uz,https://www.texnomarket.uz` (API CORS allowlist)
   - `LOGIN_RATE_LIMIT_WINDOW_MS=600000` and `LOGIN_RATE_LIMIT_MAX_ATTEMPTS=10` (API login rate-limit)
   - `VITE_API_URL=http://127.0.0.1:8787`
   - `VITE_SITE_URL=https://texnomarket.uz` (canonical/sitemap/prerender URL base)
   - `VITE_USE_HASH_ROUTER=true` (optional fallback if hosting does not support SPA rewrites)
   - `VITE_TELEGRAM_BOT_TOKEN=...` and `VITE_TELEGRAM_CHAT_ID=...` (optional, for API-side notifications)
   - Note: admin panel access requires both allowlist (`VITE_ADMIN_PHONES` or `VITE_ADMIN_TELEGRAM_IDS`) and `VITE_ADMIN_LOGIN_CODE`
4. Run the app:
   - Terminal 1: `npm run api`
   - Terminal 2: `npm run dev`

## Run with Docker (local)

1. Make sure `.env.local` has these values:
   - `CORS_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:5173`
   - `VITE_API_URL=http://127.0.0.1:8788`
   - `VITE_SITE_URL=http://localhost:5173`
2. Start containers:
   - `docker compose --env-file .env.local up -d --build`
3. Open:
   - App: `http://localhost:5173`
   - API health: `http://127.0.0.1:8788/health`
4. Stop:
   - `docker compose down`

## SEO Notes

- Build now includes static prerender for key routes and dynamic product routes (`/product/:id`) from DB.
- `robots.txt` and `sitemap.xml` are generated into `dist/` during build.
- For best SEO with `BrowserRouter`, production hosting should rewrite unknown routes to `index.html`.

## Deploy to Vercel

1. Import this repo into Vercel.
2. Keep defaults from `vercel.json`:
   - Build command: `npm run build`
   - Output directory: `dist`
   - SPA fallback rewrite is enabled while preserving existing static files.
3. Set Environment Variables in Vercel project:
   - `VITE_SITE_URL=https://<your-domain>`
   - `VITE_API_URL=https://<your-api-domain>` (if API is hosted separately)
   - Optional admin vars:
     - `VITE_ADMIN_PHONES`
     - `VITE_ADMIN_TELEGRAM_IDS`
     - `VITE_ADMIN_LOGIN_CODE`
4. GitHub Actions orqali avtomatik deploy uchun repo `Secrets and variables -> Actions` ga quyidagilarni qo'shing:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
5. `main/master` ga push qiling:
   - CI (`typecheck`, unit, build, e2e) o'tsa, production deploy avtomatik ishlaydi
   - Pull requestlarda preview deploy avtomatik chiqadi va URL kommentda ko'rinadi
6. Deploydan keyin tekshiring:
   - `/sitemap.xml`
   - `/robots.txt`
   - One product page, for example `/product/p1`

If you do not have a custom domain yet, use your Vercel domain:
- `VITE_SITE_URL=https://<project-name>.vercel.app`
