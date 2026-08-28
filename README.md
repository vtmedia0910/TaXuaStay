# TÀ XÙA STAY

**Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.**

This repository contains the independent Tà Xùa Stay application. The current implementation is the Phase 0 technical baseline only; accommodation business domains and database migrations have not been created yet.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to a local `.env.local` only when a dedicated Stay Supabase project is available. Never use Tà Xùa Biker credentials.

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

See `docs/STAY_ARCHITECTURE.md` for the system boundary and planned domains.
