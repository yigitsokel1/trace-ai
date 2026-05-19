# TraceAI

Observability dashboard for AI workflow runs — a generic trace model to inspect each step, latency, and metadata in one timeline. Makes the "AI black box" visible. Includes a **support-reply demo workflow** (policy retrieval + draft generation) to showcase the trace model.

## Demo flow

1. Open **Demo Workflow** and pick a preset (e.g. **Refund issue**).
2. Run the pipeline and watch step-by-step progress.
3. Open **View Trace** on the run detail page.
4. Click **Context Retrieval** to see retrieved documents and scores.
5. Click **AI Draft Generation** to see latency, token estimates, and output preview.

Production is deployed on Vercel with Neon; see [docs/status.md](docs/status.md) for launch checklist.

## Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Neon PostgreSQL · optional Gemini Flash for live AI draft mode

## Requirements

- Node.js 20+
- [Neon](https://neon.tech) database (`DATABASE_URL`)
- Optional: `GEMINI_API_KEY` for live AI Draft Generation (see [Demo vs live mode](#demo-vs-live-mode))

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `GEMINI_API_KEY` | No | Enables **live** mode for AI Draft Generation |
| `GEMINI_MODEL` | No | Primary model; default `gemini-2.5-flash` |
| `GEMINI_MODEL_FALLBACK` | No | Tried on 503/quota; default `gemini-2.5-flash-lite` |

## Demo vs live mode

- **Demo** (no `GEMINI_API_KEY`): deterministic engine for all steps; AI draft uses a built-in template.
- **Live** (`GEMINI_API_KEY` set): AI Draft Generation calls Gemini Flash; run `mode` is stored as `live`.
- On 503/quota/etc., live mode tries `GEMINI_MODEL_FALLBACK` first, then the demo draft if all models fail.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply `db/schema.sql` to Neon |
| `npm run db:seed` | Seed policy docs and sample runs |
| `npm run db:setup` | `db:migrate` + `db:seed` |

## Progress streaming (FAQ)

The demo page calls `POST /api/workflows/run?stream=1` and reads **newline-delimited JSON** events (`step_start`, `step_complete`, `run_complete`). That gives a sequential step-by-step UI while the server runs the full pipeline.

This is **not** LLM token streaming, Server-Sent Events (SSE), or a realtime observability ingest path. For the full distinction, see [docs/architecture.md — Sequential progress vs streaming](docs/architecture.md#sequential-progress-vs-streaming).

## Deploy

Deploy to [Vercel](https://vercel.com) and set `DATABASE_URL` (and optionally `GEMINI_API_KEY`) in project environment variables. Run `npm run lint` and `npm run build` before shipping.

## Project docs

- [docs/status.md](docs/status.md) — sprint status and launch checklist
- [docs/architecture.md](docs/architecture.md) — layers, data model, scope
- [docs/workflow.md](docs/workflow.md) — session rules and engine conventions

## Out of scope

- Authentication / multi-user
- Vector search or embeddings
- Multi-workflow UI or workflow builder
- Enterprise monitoring or cost analytics
