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
- Sprint 2 🔄 (deploy + prod E2E kullanıcıda)

## Sprint 1 Görevleri
- [x] Next.js projesi kur: Neon bağlantısı, shadcn/ui setup, temel layout ve sidebar
- [x] DB schema yaz + seed script: workflow_runs, workflow_steps, policy_documents tabloları; 5 seed run + policy dokümanları
- [x] Workflow engine yaz: app/api/workflows/run/route.ts — 5 step'li support reply pipeline, deterministic demo mode, controlled random timing'ler, her step DB'ye yazılır
- [x] Keyword-based retrieval layer: input'a göre policy dokümanlarını skorla, top 2–3 döndür, retrieval metadata'sını step'e yaz
- [x] Dashboard UI: runs listesi, stats kartları (total runs, success rate, avg latency), Demo Mode badge
- [x] Run Detail + Trace Timeline UI: step sırası, duration bar, status icon, sağ drawer ile step detail inspection
- [x] Demo Workflow ekranı: preset butonları, input form (max 500 char), sequential loading hissi, "View Trace" CTA

## Sprint 2 Görevleri
- [x] Lint + Build doğrula: `npm run lint && npm run build` — prod'a çıkmadan önce temiz olmalı
- [x] Docs çelişkisini düzelt: docs/architecture.md'de `(dashboard)` → `(shell)` olarak güncelle
- [x] Neon production DB hazırla: `npm run db:setup` çalıştırıldı (4 policy doc, 5 seed run, 24 step); `node scripts/test-db.mjs` bağlantı doğrulandı
- [ ] Vercel deploy: Vercel projesini kur, DATABASE_URL env var ekle, GitHub integration, ilk deploy *(kullanıcı)*
- [ ] Prodüksiyonda E2E test: Refund preset → trace timeline → Policy Retrieval drawer → AI Draft Generation token bilgisi *(deploy sonrası)*

## Sprint 2 Unknowns
- Vercel function timeout: `maxDuration = 10` eklendi (`app/api/workflows/run/route.ts`); engine gerçek sleep yapmıyor — prod deploy sonrası doğrulanacak

## Vercel deploy checklist (kullanıcı)
1. GitHub repo → Vercel import
2. `DATABASE_URL` = Neon pooled connection string (Production)
3. İsteğe bağlı: `SEED_SECRET` — deploy sonrası `POST /api/seed` + `x-seed-secret` header
4. Deploy; seed henüz yoksa local `npm run db:setup` (prod URL) veya `/api/seed`
5. E2E: `/demo` → Refund preset → Run → View Trace → Policy Retrieval + AI Draft Generation drawer

## Backlog
- Live mode AI: Gemini Flash veya GPT-4o-mini ile gerçek model entegrasyonu. Architecture slot'u mevcut. Deploy sonrası recruiter feedback'ine göre değerlendirilebilir.
