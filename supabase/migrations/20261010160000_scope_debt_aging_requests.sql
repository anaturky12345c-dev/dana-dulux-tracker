drop policy if exists debt_aging_requests_rep_insert on public.debt_aging_requests;
create policy debt_aging_requests_rep_insert on public.debt_aging_requests for insert to authenticated
  with check (
    private.debt_aging_rep_access() and rep_id = (select auth.uid()) and
    (customer_id is null or exists (
      select 1 from public.debt_aging_customers c
      where c.id = customer_id and c.assigned_rep = (select auth.uid())
    ))
  );

drop policy if exists debt_aging_requests_rep_edit on public.debt_aging_requests;
create policy debt_aging_requests_rep_edit on public.debt_aging_requests for update to authenticated
  using (private.debt_aging_rep_access() and rep_id = (select auth.uid()) and status = 'open')
  with check (
    rep_id = (select auth.uid()) and status = 'open' and
    (customer_id is null or exists (
      select 1 from public.debt_aging_customers c
      where c.id = customer_id and c.assigned_rep = (select auth.uid())
    ))
  );
