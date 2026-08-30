-- membership_tier is the single source of truth the app's feature gating
-- relies on (see 20260830100000_tier_role_access_policies.sql). `profiles`
-- currently has no RLS at all, which means without this, any signed-in user
-- could grant themselves "dernek_uyesi" with a direct API call. Only the
-- server-side admin API routes (using the service-role key) may change it
-- from now on; every other profile field is unaffected.
REVOKE UPDATE (membership_tier) ON profiles FROM authenticated;
REVOKE UPDATE (membership_tier) ON profiles FROM anon;
