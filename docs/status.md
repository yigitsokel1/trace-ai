# Status — trace-ai

## Proje tipi
short-project

## Başarı kriteri
Recruiter linke tıklıyor, "Refund issue" preset'ini çalıştırıyor, trace timeline'ı görüyor, "Policy Retrieval" step'ine tıklayınca retrieved dokümanları ve metadata'yı görüyor, "AI Draft Generation" step'inde latency + token + output preview'u görüyor. Tüm bu deneyim 5 saniye içinde akıcı, anlaşılır ve polished çalışıyor.

## Launch Checklist
- [x] Demo workflow uçtan uca çalışıyor (preset → run → trace)
- [x] Trace timeline step sırasını, duration barları ve status icon'larını gösteriyor
- [x] Step detail drawer metadata + retrieved docs + token info gösteriyor
- [x] 5 seed run DB'de mevcut, dashboard'da listeleniyor
- [ ] Vercel deploy'u production'da canlı

## Sprint Geçmişi
- Sprint 1 ✅
- Sprint 2 🔄

## Sprint 1 Görevleri
- [x] Next.js projesi kur: Neon bağlantısı, shadcn/ui setup, temel layout ve sidebar
- [x] DB schema yaz + seed script: workflow_runs, workflow_steps, policy_documents tabloları; 5 seed run + policy dokümanları
- [x] Workflow engine yaz: app/api/workflows/run/route.ts — 5 step'li support reply pipeline, deterministic demo mode, controlled random timing'ler, her step DB'ye yazılır
- [x] Keyword-based retrieval layer: input'a göre policy dokümanlarını skorla, top 2–3 döndür, retrieval metadata'sını step'e yaz
- [x] Dashboard UI: runs listesi, stats kartları (total runs, success rate, avg latency), Demo Mode badge
- [x] Run Detail + Trace Timeline UI: step sırası, duration bar, status icon, sağ drawer ile step detail inspection
- [x] Demo Workflow ekranı: preset butonları, input form (max 500 char), sequential loading hissi, "View Trace" CTA

## Sprint 2 Görevleri
- [ ] Lint + Build doğrula: `npm run lint && npm run build` — prod'a çıkmadan önce temiz olmalı
- [ ] Docs çelişkisini düzelt: docs/architecture.md'de `(dashboard)` → `(shell)` olarak güncelle
- [ ] Neon production DB hazırla: DATABASE_URL Neon production string mi, db:setup çalıştır, 5 seed run'un DB'de olduğunu doğrula
- [ ] Vercel deploy: Vercel projesini kur, DATABASE_URL env var ekle, GitHub integration, ilk deploy
- [ ] Prodüksiyonda E2E test: Refund preset → trace timeline → Policy Retrieval drawer → AI Draft Generation token bilgisi — başarı kriteri tam karşılanıyor mu?

## Sprint 2 Unknowns
- Vercel function timeout prodüksiyonda nasıl davranıyor? (workflow ~2-3 sn sync, limit 10 sn — test edilmeli)

## Backlog
- Live mode AI: Gemini Flash veya GPT-4o-mini ile gerçek model entegrasyonu. Architecture slot'u mevcut. Deploy sonrası recruiter feedback'ine göre değerlendirilebilir.
