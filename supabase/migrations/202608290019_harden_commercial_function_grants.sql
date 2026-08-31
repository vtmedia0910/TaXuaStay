-- Correct V2 Phase 4 function ACLs after the linked project materialized
-- explicit default anon/authenticated EXECUTE grants. These helpers are used
-- only by database triggers; the application does not call them as RPCs.

revoke all on function public.has_current_supplier_property_relationship(uuid, uuid, date)
from public, anon, authenticated;
revoke all on function public.validate_commercial_rate_plan()
from public, anon, authenticated;
revoke all on function public.validate_room_commercial_rule()
from public, anon, authenticated;
revoke all on function public.validate_commercial_plan_rule_ranges()
from public, anon, authenticated;
revoke all on function public.close_terminal_commercial_plan_rules()
from public, anon, authenticated;
revoke all on function public.protect_active_commercial_relationship()
from public, anon, authenticated;

comment on function public.has_current_supplier_property_relationship(uuid, uuid, date) is
  'Trigger-only relationship predicate. No PUBLIC, anon, or authenticated RPC execution.';
