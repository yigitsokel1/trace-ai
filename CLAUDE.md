@AGENTS.md

# trace-ai — AI Context

## Proje
AI workflow execution'larını trace eden, step-by-step inspect edilebilen observability dashboard'u. Kullanıcı bir support workflow'u çalıştırır, her step loglanır, trace timeline'da incelenir. "AI black box" problemini görünür kılar.

## Proje tipi
short-project

## Başlamadan önce oku
- docs/status.md — nerede olduğunu anla
- docs/architecture.md — neye dokunabileceğini anla
- docs/workflow.md — çalışma kuralları

## Kesin kurallar
- Gerçek vector search / embedding — asla sprint 1'de
- Multi-workflow UI — mimari hazır olabilir ama UI'da yok
- Auth sistemi — eklenmeyecek
- Scope dışına çıkma
- Oturum sonunda docs/status.md güncelle

## Test komutları
```bash
npm run lint
npm run build
npm run dev
```
