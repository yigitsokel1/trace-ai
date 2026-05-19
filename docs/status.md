# Status — trace-ai

## Proje tipi
short-project

## Başarı kriteri
Recruiter linke tıklıyor, "Refund issue" preset'ini çalıştırıyor, trace timeline'ı görüyor, "Policy Retrieval" step'ine tıklayınca retrieved dokümanları ve metadata'yı görüyor, "AI Draft Generation" step'inde latency + token + output preview'u görüyor. Tüm bu deneyim 5 saniye içinde akıcı, anlaşılır ve polished çalışıyor.

## Launch Checklist
- [x] Demo workflow uçtan uca çalışıyor (preset → run → trace)
- [x] Trace timeline step sırasını, duration barları ve status icon'larını gösteriyor
- [x] Step detail drawer metadata + retrieved docs + token info gösteriyor
- [x] 8 seed run DB'de mevcut, dashboard'da listeleniyor
- [x] Vercel deploy'u production'da canlı (Neon `DATABASE_URL` bağlı)

## Sprint Geçmişi
- Sprint 1 ✅
- Sprint 2 ✅
- Sprint 3 ✅
- Sprint 4 ✅
- Sprint 5 ✅

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
- [x] Vercel deploy: production canlı, Neon `DATABASE_URL` bağlı
- [x] Prodüksiyonda E2E test: Refund preset → trace timeline → Policy Retrieval + AI Draft Generation drawer — başarı kriteri karşılandı

## Sprint 2 Notları
- Vercel function timeout: prod E2E'de sorun yok (`maxDuration = 10`, engine wall-clock sleep yapmıyor)

## Sprint 3 Görevleri
- [x] Waterfall / Gantt timeline: trace-run-view.tsx'de cumulative offset hesapla, barları doğru konumlandır, ms zaman ekseni ekle
- [x] Gerçek Gemini Flash (live mode): GEMINI_API_KEY varsa AI Draft Generation step'i gerçek API çağırır; yoksa demo engine'e fallback
- [x] AI Draft step input_preview kalitesi: sabit string yerine retrieved doc ID'leri + user input ilk 80 char
- [x] Seed data — 7 günlük gerçekçi tarihçe: created_at'ı son 7 güne yay, 2-3 run daha ekle, timing çeşitlendir

## Sprint 4 Görevleri
- [x] README + docs streaming clarification: README sıfırdan yaz; architecture.md'ye sequential progress ≠ streaming notu ekle
- [x] Dashboard tagline: DashboardHeader description'ı "TraceAI helps inspect..." cümlesiyle güncelle
- [x] Policy Retrieval drawer: matched_keywords + snippets retrieval'a ekle, StepMetadata'ya yaz, drawer'da card-per-doc görünümü
- [x] AI Draft drawer: Live AI / Demo engine / Quota fallback badge, section adı "AI Generation", latency label
- [x] Rate limit: IP-based, günlük 10 run, client_ip kolonunu workflow_runs'a ekle, limit aşılınca silent mock fallback
- [x] UI polish: sheet spacing, mode badge (live vs demo), stats renk kodu, time axis edge case'leri

## Sprint 5 Görevleri
- [x] Trace Timeline UX: step numarası kolonu, bar yüksekliği h-2.5 + opacity track, failed row bg, step name font-semibold, time axis iyileştirme, selected step ring
- [x] Step Detail Drawer: AI Generation 2×2 stats grid; retrieval card score dot (green/amber/muted)

## Observability polish (post-Sprint 5)
- [x] Generic product framing: dashboard/demo/README — support reply = demo scenario only
- [x] Trace Summary panel on run detail (status, failed step, latency, tokens, docs, model, failure code + severity)
- [x] Step rename: Policy Retrieval → Context Retrieval
- [x] Richer metadata: message_length, normalized_input, similarity_score, retrieved_documents, validation_policy, generation_attempts
- [x] Dashboard stats: Failed runs (N/M), Most common failure; workflow graph on run detail

## Backlog
- Streaming/SSE: real-time step progress server'dan akışı. Mimari değişiklik gerektirir.
- Comparison mode: iki run'ı yan yana inceleme. Karmaşık, sonraki aşama.
