# Tà Xùa Trip brand system

## Status and authority

This document is the durable brand summary for future repository work. The canonical product and roadmap source remains `docs/TA_XUA_STAY_CODEX_MASTER_PLAN.md`, now Master Plan V2.1. When older Stay/V2 material conflicts with V2.1, V2.1 wins. A task prompt still controls what may be executed in that task.

The public application adopted this system in V2 Phase 2.5. V2 Phase 2.6 adds structured editorial operations without changing the locked brand core; code still owns layout, truth constraints, canonical/robots/schema and service-state behavior.

## Locked brand core

- **Master brand:** Tà Xùa Trip
- **Positioning:** Verified Local Travel
- **Slogan:** Đi thật. Biết trước.
- **Campaign line:** Tà Xùa, trước khi bạn đến.
- **Brand promise:** Biết rõ trước khi lên đường.
- **Core values:** THẬT — HIỂU — TRỌN VẸN
- **Brand principle:** Không bán cái đẹp. Bán cái phù hợp.
- **Operational promise:** Phần phức tạp để chúng tôi lo.
- **Culture rule:** Đừng bán cho khách một chuyến đi mà chính mình sẽ không chọn.

The purpose is to narrow the gap between what visitors see online and what they actually receive. The product should help a customer understand the room, view, access, price, freshness, uncertainty, and later the connected trip before committing.

## Brand architecture

```text
TÀ XÙA TRIP
├── Lưu trú
├── Combo
├── Xe khách
├── Xe máy
├── Săn mây / Cloud
└── Cẩm nang
```

Stay is no longer an independent consumer master brand. The existing TaXuaStay repository, database lineage, and application modules become the technical accommodation vertical within Tà Xùa Trip.

## Naming architecture

Keep these layers distinct:

```text
Master brand          Tà Xùa Trip
Consumer taxonomy     Lưu trú
SEO/search language   Homestay Tà Xùa
Technical domain      Stay
Technical namespace   /stay
```

`Homestay` is a high-value acquisition and search-intent term. `Lưu trú` is the broader customer taxonomy that can contain homestays, hotels, bungalows, villas, guesthouses, and future accommodation types. `Stay` is a concise internal domain and URL namespace; it is not the primary Vietnamese navigation label.

Do not rename technical tables, feature folders, or domain concepts to `homestay` merely for SEO. Do not make hotels or other accommodation types children of Homestay.

## Stay and repository identity

- The repository may remain technically named `TaXuaStay`.
- Existing Stay migrations, data, Auth, RLS, verification, pricing, availability, search, SEO, and Admin foundations remain valid.
- The future consumer brand migration changes the role of the homepage and public shell; it is not a database rewrite.
- Current Stay URLs require a reviewed compatibility and redirect plan before any public migration.

## Tà Xùa Biker relationship

Tà Xùa Biker remains the specialized motorbike operations source-of-truth for fleet identity, plates, maintenance, handover, repair, and rental operations. It remains a separate repository, database, Auth boundary, deployment, and operational product.

Tà Xùa Trip may later present customer language such as `Dịch vụ xe máy vận hành bởi Tà Xùa Biker` and integrate through manual confirmation, opaque external references, a safe API, signed server calls, or webhooks. Trip must never copy the Biker fleet, query the Biker database directly, share service-role credentials, or claim a Biker reservation without operational confirmation.

## Trust and commercial independence

- Verification is evidence-backed and cannot be purchased.
- Sponsored placement must be labeled and cannot alter verification, Cloud View, Room Quality, pros/cons, or review facts.
- Partner tier and commission are separate from factual assessment.
- Unknown remains unknown; stale data must not be presented as current.
- Price, availability, payment, supplier confirmation, and trip confirmation remain separate states.
- No fake weather certainty, urgency, ratings, reviews, inventory, prices, packages, or customer metrics.

The desired customer perception is: `Đây là nền tảng biết Tà Xùa thật.` It must not feel like a generic homestay directory or a local clone of a large OTA.
