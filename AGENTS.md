<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repository identity and boundaries

- This is the independent Tà Xùa Stay repository.
- `vtmedia0910/taxuabiker2` is a read-only technical reference. Never modify, commit to, push to, rewrite, or delete anything in Biker while doing Stay work.
- Stay must use its own GitHub repository, Supabase project, Vercel project, Auth users, Storage, environment variables, and customer data.
- Never add a runtime dependency on Biker's application, API, database, Auth, Storage, secrets, or customer data.
- Never commit `.env` files, credentials, tokens, secrets, customer data, `node_modules`, build output, or caches.

## Database discipline

- Do not replay Biker migrations into Stay.
- Create clean, Stay-specific migrations only when the requested phase needs them.
- After a migration has been applied remotely, never edit it; add a new additive migration instead.
- Use `app_metadata.role` for authorization. Never authorize with user-editable metadata.

## Delivery workflow

- Review `git status` and the complete diff before every commit.
- For normal application changes, run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` before completion.
- Commit only complete, passing work with a concise Conventional Commit message.
- Push only to the configured Stay upstream branch. Never force-push or rewrite history without an explicit owner request.
