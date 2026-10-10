-- Keep debt-aging access subject to the application's account readiness and admin MFA gates.
drop policy if exists debt_aging_batches_security_gate on public.debt_aging_batches;
create policy debt_aging_batches_security_gate on public.debt_aging_batches as restrictive for all to authenticated
  using (private.security_ready() and private.admin_mfa_ok())
  with check (private.security_ready() and private.admin_mfa_ok());
drop policy if exists debt_aging_customers_security_gate on public.debt_aging_customers;
create policy debt_aging_customers_security_gate on public.debt_aging_customers as restrictive for all to authenticated
  using (private.security_ready() and private.admin_mfa_ok())
  with check (private.security_ready() and private.admin_mfa_ok());
drop policy if exists debt_aging_entries_security_gate on public.debt_aging_entries;
create policy debt_aging_entries_security_gate on public.debt_aging_entries as restrictive for all to authenticated
  using (private.security_ready() and private.admin_mfa_ok())
  with check (private.security_ready() and private.admin_mfa_ok());
drop policy if exists debt_aging_requests_security_gate on public.debt_aging_requests;
create policy debt_aging_requests_security_gate on public.debt_aging_requests as restrictive for all to authenticated
  using (private.security_ready() and private.admin_mfa_ok())
  with check (private.security_ready() and private.admin_mfa_ok());
drop policy if exists debt_aging_profiles_read on public.profiles;
create policy debt_aging_profiles_read on public.profiles for select to authenticated
  using (private.security_ready() and private.admin_mfa_ok() and private.debt_aging_full_access());
drop policy if exists debt_aging_audio_security_gate on storage.objects;
create policy debt_aging_audio_security_gate on storage.objects as restrictive for all to authenticated
  using (private.security_ready() and private.admin_mfa_ok())
  with check (private.security_ready() and private.admin_mfa_ok());