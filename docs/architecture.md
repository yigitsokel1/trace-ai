# Mimari — trace-ai

## Ne yapıyor
AI workflow execution'larını trace eden, step-by-step inspect edilebilen observability dashboard'u — **generic trace model** (workflow tipinden bağımsız). Her step loglanır, trace timeline'da incelenir; "AI black box" problemini görünür kılar. Sprint 1 demo senaryosu: support-reply pipeline (`workflow_type: support_reply`).

## Ne YAPMIYOR
- Auth veya multi-user sistemi değil
- Gerçek distributed tracing platformu değil
- LLM token streaming veya SSE tabanlı canlı dashboard (step NDJSON progress hariç — aşağıya bak)
- Multi-workflow veya workflow builder değil
- Vector search veya embedding pipeline değil
- Cost analytics veya aggregated reporting değil
- Enterprise monitoring tool değil

## Sequential progress vs streaming

Demo UI, workflow tamamlanırken **step sınırlarında** ilerleme göstermek için `POST /api/workflows/run?stream=1` kullanır. Yanıt `application/x-ndjson`; her satır bir JSON event:

- `step_start` — step başladı
- `step_complete` — step bitti (status, duration_ms)
- `run_complete` — tüm run sonucu
- `error` — hata mesajı

Bu, pipeline'ın **sıralı step bildirimi**dir. Sunucu tüm step'leri `workflow-engine` içinde sırayla çalıştırır ve her step'i DB'ye yazar ([docs/workflow.md](workflow.md) kuralları). Client (`lib/workflow-stream.ts`) event'leri okuyup demo panelinde gösterir; API: `app/api/workflows/run/route.ts`.

**Değildir:**

- LLM output token streaming (ChatGPT-style akış)
- SSE veya WebSocket tabanlı canlı dashboard
- Gerçek zamanlı distributed trace ingest
- Step'lerin sunucuda paralel/streaming olarak üretilmesi

Gelecek iş: backlog'daki "Streaming/SSE" — mimari değişiklik gerektirir; mevcut NDJSON step progress ile karıştırılmamalı.

## Stack
- Backend: Next.js Route Handlers (app/api/) — workflow engine, DB write'ları ve response dönen işlemler
- Frontend: Next.js + TypeScript + Tailwind + shadcn/ui
- DB: Neon PostgreSQL (serverless-native)
- AI: Gemini Flash veya GPT-4o-mini — sadece internal live mode; public demo deterministic engine kullanır
- Infra: Vercel + Neon

## Katmanlar

```
app/
├── api/
│   ├── workflows/
│   │   └── run/route.ts       # Workflow engine — 5-step pipeline, DB write'ları
│   ├── runs/
│   │   ├── route.ts           # Run listesi
│   │   └── [id]/route.ts      # Run detail
│   └── seed/
│       └── route.ts           # Seed script endpoint
└── (shell)/
    ├── layout.tsx             # Sidebar shell
    ├── page.tsx               # Dashboard — runs listesi + stats kartları
    ├── demo/
    │   └── page.tsx           # Demo workflow ekranı — preset butonlar + input form
    └── runs/
        └── [id]/
            └── page.tsx       # Run detail + trace timeline

lib/
├── db.ts                      # Neon client
├── workflow-engine.ts         # Deterministic demo engine + step orchestration
├── retrieval.ts               # Keyword-based policy doc retrieval + scoring
├── rate-limit.ts              # IP extraction + daily run cap
└── seed.ts                    # DB seed — 5 run + policy documents

seed_docs/
├── refund_policy.md
├── billing_faq.md
├── subscription_terms.md
└── login_help.md
```

## Data Model

**workflow_runs**: run_id, workflow_type, status, total_duration_ms, step_count, created_at, mode (demo/live), client_ip (nullable — user demo run'ları; seed NULL)

**Rate limit**: IP başına günlük 10 run (`RATE_LIMIT_DAILY`, UTC gün). `client_ip` dolu run'lar sayılır; limit aşılınca sessiz demo fallback (`rate_limit_fallback` metadata, HTTP 201). `RATE_LIMIT_ENABLED=false` ile kapatılır; bilinmeyen IP limit dışı.

**workflow_steps**: step_id, run_id, step_name, status, duration_ms, input_preview, output_preview, metadata (JSONB), error_message, step_order
- metadata içinde: model_info, token_estimate, retrieved_docs, retrieval_scores, matched_keywords, snippets, validation_checks

**policy_documents**: doc_id, filename, content, tags

**İlişkiler**: workflow_runs → workflow_steps (one-to-many)

## MVP Core (olmasa proje ölür)
1. Workflow Trace Timeline — step sırası, duration, status
2. Step Detail Inspection — sağ drawer, metadata + retrieved docs + token info + output preview
3. Workflow Run System — her execution ayrı run, 5 seed run, geçmiş listesi

## Dokunma listesi
- Gerçek vector search / embedding — asla sprint 1'de
- Multi-workflow UI — mimari hazır olabilir ama UI'da yok
- Auth sistemi — eklenmeyecek

## Canonical belgeler
- seed_docs/refund_policy.md
- seed_docs/billing_faq.md
- seed_docs/subscription_terms.md
- seed_docs/login_help.md
