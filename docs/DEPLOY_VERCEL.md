# Deploy SOMNI AI to Vercel

## Is the app ready?

Yes. The app is set up for a single Vercel deployment:

- **No Python backend required**: When `PYTHON_API_URL` is not set (default on Vercel), the analyze API uses the TypeScript sleep-analysis pipeline in `lib/sleep-analysis/`.
- **Build**: `npm run build` succeeds.
- **Cache**: Uses in-memory cache by default. For persistence across serverless invocations, set up [Vercel KV](https://vercel.com/docs/storage/vercel-kv) and add `KV_REST_API_URL` and `KV_REST_API_TOKEN` (optional for demo).

## How to deploy

### 1. Push your code to GitHub

Ensure your project is in a GitHub repository (e.g. `your-username/treehacks`).

### 2. Import the project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub).
2. Click **Add New…** → **Project**.
3. Import your GitHub repo (e.g. `treehacks`).
4. Leave **Framework Preset** as **Next.js** and **Root Directory** as `.`.
5. Click **Deploy**. The first deploy may succeed without env vars; the app will work for analysis; report generation needs API keys (step 3).

### 3. Add environment variables

In the Vercel dashboard: **Project → Settings → Environment Variables**. Add (for production and preview if you want):

| Name | Value | Required for |
|------|--------|----------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Claude orchestration |
| `OPENAI_API_KEY` | Your OpenAI API key | o1 medical reasoning |
| `PERPLEXITY_API_KEY` | Your Perplexity API key | Sonar consensus (optional; mock if missing) |
| `BRIGHTDATA_API_KEY` | Your Bright Data API key | Guidelines (optional; mock if missing) |

Optional (for persistent cache across requests):

| Name | Value |
|------|--------|
| `KV_REST_API_URL` | From Vercel KV (Storage) |
| `KV_REST_API_TOKEN` | From Vercel KV |

Do **not** set `PYTHON_API_URL` so the app uses the TypeScript pipeline on Vercel.

### 4. Redeploy

After saving env vars, go to **Deployments** → **⋯** on the latest deployment → **Redeploy** so the new variables are applied.

## After deploy

- **App URL**: `https://your-project.vercel.app`
- **Analyze**: Upload a CSV or Apple Health XML (≥14 days) on the home page.
- **Reports**: After analysis, the report page calls the generate-reports API (requires Anthropic + OpenAI keys for full multi-agent flow).
- **PDF export**: Uses the Node.js runtime and works on Vercel.

## Notes

- **Python**: The repo includes a Python backend for local dev. On Vercel only the Next.js app runs; analysis is 100% TypeScript.
- **Rewrite**: `next.config.js` has a rewrite for `/python-api/*` to localhost. On Vercel that target does not exist; the main app does not use it. Ignore or remove that rewrite if you prefer.
- **Cache**: Without Vercel KV, analysis and report data are stored in memory per serverless instance and can be lost between requests or after cold starts. For a demo or single-user use this is usually fine; for production, add KV.
