# Workflow

## Her oturum başında
1. docs/status.md oku — nerede olduğunu anla
2. docs/architecture.md oku — neye dokunabileceğini anla
3. Sadece o oturumun görevini yap

## Her oturum sonunda
1. docs/status.md güncelle (tamamlanan görevleri işaretle)
2. Yeni şey eklediysen docs/architecture.md güncelle
3. Docs-kod çelişkisi yarattıysan işaretle

## Bitti kriteri
- Lint temiz (`npm run lint`)
- Build geçiyor (`npm run build`)
- Docs güncellendi
- Scope dışına çıkılmadı

## Scope kuralları
- Yeni fikir geldi → docs/status.md Backlog'una yaz, şimdi yapma
- Legacy/deprecated koda dokunmak → gerekçe şart
- Schema değişikliği → backend + frontend aynı anda

## Docs çelişkisinde öncelik sırası
1. docs/workflow.md — çalışma kuralları
2. docs/architecture.md — mimari
3. Diğer docs

## Workflow engine kuralları
- Demo mode: deterministic, gerçek LLM çağrısı yok
- Her step mutlaka DB'ye yazılır (step başı + step sonu)
- Timing'ler: retrieval 120–250ms, generation 900–1600ms (controlled random)
- Retrieval: keyword scoring, top 2–3 doc, skorlar metadata'ya yazılır

## Deployment
- GitHub push → lint check → Vercel deploy (otomatik)
- Env vars: DATABASE_URL (Neon), GEMINI_API_KEY / OPENAI_API_KEY (opsiyonel, sadece live mode)
