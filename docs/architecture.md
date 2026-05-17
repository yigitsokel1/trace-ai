# Mimari — trace-ai

## Ne yapıyor
AI workflow execution'larını trace eden, step-by-step inspect edilebilen observability dashboard'u. Kullanıcı bir support workflow'u çalıştırır, her step loglanır, trace timeline'da incelenir. "AI black box" problemini görünür kılar.

## Ne YAPMIYOR
- Auth veya multi-user sistemi değil
- Gerçek distributed tracing platformu değil
- Live/realtime streaming dashboard değil
- Multi-workflow veya workflow builder değil
- Vector search veya embedding pipeline değil
- Cost analytics veya aggregated reporting değil
- Enterprise monitoring tool değil

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
└── seed.ts                    # DB seed — 5 run + policy documents

seed_docs/
├── refund_policy.md
├── billing_faq.md
├── subscription_terms.md
└── login_help.md
```

## Data Model

**workflow_runs**: run_id, workflow_type, status, total_duration_ms, step_count, created_at, mode (demo/live)

**workflow_steps**: step_id, run_id, step_name, status, duration_ms, input_preview, output_preview, metadata (JSONB), error_message, step_order
- metadata içinde: model_info, token_estimate, retrieved_docs, retrieval_scores, validation_checks

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
