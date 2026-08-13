# Siaga Kelistrikan KIPP IKN — Dashboard (split frontend/backend)

This repo contains a split frontend (under `public/`) and a lightweight Node.js backend (`server.js`) that proxies CSV fetches to avoid CORS issues when connecting a published Google Sheets CSV.

Quick start (Node 18+):

1. Install dependencies (use `npm install` if you don't have a lockfile):

```bash
npm install
```

2. Run locally:

```bash
npm start
# then open http://localhost:3000
```

Deployment options:

-- **Render / Railway / Fly / Heroku**: push this repo to GitHub, create a new Web Service, set build command to `npm install` and start command to `npm start`. Set the service port to the environment variable `PORT` (default 3000).
- **Docker**: build and run the included Dockerfile:

```bash
docker build -t siaga-dashboard .
docker run -p 3000:3000 siaga-dashboard
```

Deploy to Vercel (recommended, easiest)
-------------------------------------
Vercel can host the static `public/` site and the serverless proxy `api/fetch.js` without Docker.

Quick steps:

1. Push this repository to GitHub.
2. Create a free account on Vercel and choose "Import Project" → select this GitHub repo.
3. Vercel auto-detects a Node project; use the default build settings. The `api/fetch.js` function will be deployed as a serverless endpoint at `https://<your-project>.vercel.app/api/fetch?u=<CSV_URL>`.
4. On the frontend, the proxy path `/api/fetch?u=` works unchanged when served from Vercel.

Alternative: use the Vercel CLI to deploy directly from your machine:

```bash
npm i -g vercel
vercel login
vercel
```

Notes:
- Vercel's free tier is suitable for low-traffic dashboards and provides automatic rebuilds on Git push.
- No additional secrets are needed for the CSV proxy.

Notes:
- The frontend expects a Google Sheets CSV URL published via *File → Publish to web* with format CSV. Paste that URL in the settings panel.
- The backend exposes `/api/fetch?u=<CSV_URL>` which the frontend uses to fetch the CSV server-side (avoids CORS and allows hosting on a cloud server).
- Ensure Node >= 18 is used for native fetch in `server.js`. If you need to support older Node versions, install a fetch polyfill.

GitHub Actions / secrets
------------------------
Two workflows are included:

- `.github/workflows/docker-publish.yml` — builds a Docker image and pushes to Docker Hub as `${{ secrets.DOCKERHUB_USERNAME }}/siaga-dashboard:latest`. Set these repository secrets:
	- `DOCKERHUB_USERNAME` — your Docker Hub username
	- `DOCKERHUB_TOKEN` — a Docker Hub access token (or password)

- `.github/workflows/render-deploy.yml` — triggers a service deploy on Render via the Render API. Set these repository secrets if you want automatic deploys:
	- `RENDER_API_KEY` — a Render API key with permission to trigger deploys
	- `RENDER_SERVICE_ID` — the Render service ID (found in the service settings)

Quick: deploy to Render from pushed Docker image
------------------------------------------------
1. Push repo to GitHub (workflows will build & push image to Docker Hub).
2. In Render, create a new **Web Service** and choose **Docker** as the environment; for the image enter `DOCKERHUB_USERNAME/siaga-dashboard:latest` and configure the port to `3000`.
3. (Optional) Add `RENDER_API_KEY` and `RENDER_SERVICE_ID` to GitHub secrets to let the workflow trigger deploys automatically on push to `main`.

