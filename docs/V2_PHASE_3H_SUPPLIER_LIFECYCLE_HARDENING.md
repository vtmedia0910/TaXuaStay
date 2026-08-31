# V2 Phase 3H — Supplier Lifecycle + Primary Contact Hardening

Status: **implemented** by additive migration `202608290017_harden_supplier_lifecycle.sql` and the private Supplier Admin corrections. This is a corrective pass over V2 Phase 3, not V2 Phase 4.

## Archive bug and corrected ordering

Migration 016 changed `suppliers.status` to `archived` first and relied on the AFTER trigger `suppliers_close_archived_relationships` to close children. For a current Property link, that trigger wrote `valid_until = current_date`. The archived-child guard correctly treats `valid_until >= current_date` as current because the date is inclusive. It therefore rejected the child update after the parent was already archived, and PostgreSQL rolled the whole archive back.

Migration 017 removes that AFTER cascade. `archive_supplier` is now the single lifecycle orchestrator:

1. require the `admin` role and lock the Supplier;
2. disable active contacts and clear their primary flag;
3. close current/open Property links and clear their primary flag;
4. end the open Partner relationship;
5. disable active external references;
6. change the Supplier to `archived`.

All steps run in the RPC transaction. No row is deleted. A failure in any child mutation rolls back every earlier child change and the parent transition.

## Relationship date semantics

`supplier_properties.valid_until` and `partner_relationships.valid_until` are **inclusive** dates. A value equal to the current database date means the relationship remains historically valid through that day. Archive performs the closure while the Supplier is still non-archived, so this inclusive meaning no longer conflicts with the archived-child guard.

Current Property links with no end date or a future end date are clamped to the current day when their start is current/past. The existing date constraint is preserved for future-dated starts. Open Partner relationships become `ended`; `ended_at` is the current database date, a missing `started_at` is established as the current date for the existing ended-state constraint, and a missing/future `valid_until` is closed consistently without deleting `started_at`, `reviewed_at`, tier, or notes.

## Direct archive and reactivation

The database trigger `suppliers_require_archive_rpc` rejects a direct transition from any non-archived status to `archived`. Admins must use `archive_supplier`, including outside the application UI. This keeps one authoritative ordering and prevents a direct authenticated table update from bypassing child closure.

The profile RPC and Zod form contract do not accept `archived` as a normal editable status. The Admin archive button explains that relationships are closed while history remains. An archived Supplier can be explicitly reactivated to `lead`, `onboarding`, `active`, `paused`, or `inactive`. Reactivation changes only the Supplier status: closed contacts, Property links, Partner relationships, and external references do not reopen automatically.

No broader workflow engine is introduced. Non-archive statuses remain deliberate Admin choices; an active Supplier without a current primary contact is still permitted but remains an operational warning.

## Primary-contact behavior

Migration 016's `save_supplier_profile` inserted a new primary-contact row whenever a contact payload was submitted. Although the initial Phase 3 edit form did not render that payload on existing profiles, the RPC contract could accumulate active secondary history under repeated callers.

Migration 017 introduces the unambiguous `save_supplier_profile_v2` contract with `primary_contact_id` and revokes authenticated execution of the legacy profile RPC. The Supplier profile now displays **Liên hệ chính hiện tại**:

- ordinary edits lock and update the same current active primary row, preserving its ID and keeping the contact count stable;
- a stale submitted contact ID is rejected so concurrent changes are not applied to the wrong person;
- if no current primary exists, a complete contact payload creates one atomically with the Supplier save;
- intentionally replacing the person uses the dedicated Contacts UI, which preserves the former contact as non-primary history and creates the new primary;
- the partial unique index still permits exactly one active primary contact per Supplier.

Supplier and contact changes remain one transaction. Invalid contact data rolls back the Supplier update, and a failed Supplier update cannot mutate the contact.

## Security and privacy

Migration 017 does not change Supplier table RLS or grant anonymous access. Staff retains Phase 3 contact/Property-link permissions. Admin retains Supplier lifecycle, Partner, external-reference, and archive ownership. Archive remains Admin-only at both Server Action and RPC layers. No service-role client is used.

Supplier identity, PII, relationship tier, history, and external references remain private. Public Property/room DTOs, search, verification, CMS, pricing, availability, sitemap, robots, and SEO are unchanged.

## Verification and tests

`supabase/tests/202608290017_supplier_lifecycle.sql` is a rollback-only database integration suite. It covers:

- active primary and secondary contact closure;
- two current Property links, including the migration-016 failure case;
- Partner end-state dates and preserved history;
- external-reference deactivation;
- the complete graph in one archive call;
- forced child-constraint failure with full transaction rollback;
- direct archive rejection and staff/Admin role boundaries;
- explicit reactivation without reopening children;
- in-place primary-contact edits, repeated edit count stability, and intentional replacement;
- zero anonymous table privilege and legacy/new RPC grants.

The script creates only transaction-local fixtures and ends with `ROLLBACK`. Migration 017 contains no seed or fake Supplier data.

## Scope boundary

V2 Phase 3 remains complete, and V2 Phase 3H Supplier Lifecycle Hardening is complete after migration 017. This pass adds no supplier cost, net rate, commission, margin, markup, settlement, payment terms, bank details, packages, booking, payment, or Biker runtime integration.

The next separately authorized phase remains **V2 Phase 4 — Commercial Economics**. It has not been started.
