<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repository identity and boundaries

- This is the independent TaXuaStay technical repository and infrastructure boundary. Under Master Plan V2.1, its accommodation product is the canonical `/stay` vertical of the Tà Xùa Trip master brand.
- `vtmedia0910/taxuabiker2` is a read-only technical reference. Never modify, commit to, push to, rewrite, or delete anything in Biker while doing Stay work.
- Stay must use its own GitHub repository, Supabase project, Vercel project, Auth users, Storage, environment variables, and customer data.
- Never add a runtime dependency on Biker's application, API, database, Auth, Storage, secrets, or customer data.
- Never commit `.env` files, credentials, tokens, secrets, customer data, `node_modules`, build output, or caches.

## Architecture and database discipline

- Before implementing any new product phase, read `docs/TA_XUA_STAY_CODEX_MASTER_PLAN.md`, `docs/STAY_ARCHITECTURE.md`, `docs/brand/BRAND_SYSTEM.md`, `docs/brand/PUBLIC_UX_DIRECTION.md`, and the latest relevant phase documentation completely. The current user prompt defines the execution scope and may authorize only one phase.
- Master Plan V2.1 supersedes the former 11-phase accommodation roadmap and earlier V2 direction wherever they conflict. Historical phase documents remain factual implementation records, not the active roadmap.
- Existing migrations `202608290001` through `202608290008` are the completed legacy foundation and are immutable. V2 Phase 1 / migration 009, V2 Phase 2 / migration 010, and V2 Phase 2.6 migrations 011–014 are also complete, remotely applied, and immutable.
- **V2 Phase 2.5 — Master Brand + Public UX Migration** is complete without a database migration. **V2 Phase 2.6 — CMS, Media & Content Operations** uses additive migration 011, narrow corrective migrations 012–014, and structured Admin publishing. Do not start **V2 Phase 3** without a separately authorized owner task.
- Do not replay Biker migrations into Stay.
- Create clean, Stay-specific migrations only when the requested phase needs them.
- After a migration has been applied remotely, never edit it; add a new additive migration instead.
- Use `app_metadata.role` for authorization. Never authorize with user-editable metadata.

## Delivery workflow

- Review `git status` and the complete diff before every commit.
- For normal application changes, run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` before completion.
- Commit only complete, passing work with a concise Conventional Commit message.
- Push only to the configured Stay upstream branch. Never force-push or rewrite history without an explicit owner request.
