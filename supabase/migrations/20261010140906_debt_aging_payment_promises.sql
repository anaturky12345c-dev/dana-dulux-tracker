create table public.debt_aging_payment_promises (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.debt_aging_customers(id) on delete cascade,
  promise_date date not null,
  promise_amount numeric check (promise_amount is null or promise_amount > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);
alter table public.debt_aging_payment_promises enable row level security;
create policy debt_aging_payment_promises_read on public.debt_aging_payment_promises
  for select to authenticated
  using (private.security_ready() and private.admin_mfa_ok() and
    (private.debt_aging_full_access() or exists (
      select 1 from public.debt_aging_customers c
      where c.id=customer_id and c.assigned_rep=(select auth.uid())
    )));
create policy debt_aging_payment_promises_insert on public.debt_aging_payment_promises
  for insert to authenticated
  with check (private.security_ready() and private.admin_mfa_ok() and
    created_by=(select auth.uid()) and updated_by=(select auth.uid()) and
    exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.active and p.role in ('rep','accounts','admin')) and
    exists (select 1 from public.debt_aging_customers c join public.profiles p on p.id=(select auth.uid())
      where c.id=customer_id and (p.role in ('accounts','admin') or c.assigned_rep=(select auth.uid()))));
create policy debt_aging_payment_promises_admin_update on public.debt_aging_payment_promises
  for update to authenticated
  using (private.security_ready() and private.admin_mfa_ok() and exists (
    select 1 from public.profiles p where p.id=(select auth.uid()) and p.active and p.role='admin' and p.username='admin'
  ))
  with check (private.security_ready() and private.admin_mfa_ok() and updated_by=(select auth.uid()) and exists (
    select 1 from public.profiles p where p.id=(select auth.uid()) and p.active and p.role='admin' and p.username='admin'
  ));
create policy debt_aging_payment_promises_admin_delete on public.debt_aging_payment_promises
  for delete to authenticated
  using (private.security_ready() and private.admin_mfa_ok() and exists (
    select 1 from public.profiles p where p.id=(select auth.uid()) and p.active and p.role='admin' and p.username='admin'
  ));
grant select,insert,update,delete on public.debt_aging_payment_promises to authenticated;

create or replace function public.debt_aging_create_payment_promise(p_customer_id uuid,p_promise_date date,p_promise_amount numeric default null)
returns uuid language plpgsql security invoker set search_path=pg_catalog,public,private,auth
as $$
declare new_id uuid;
begin
  if not private.security_ready() or not private.admin_mfa_ok() or p_promise_date is null or p_promise_date < (now() at time zone 'Asia/Riyadh')::date or p_promise_amount is not null and p_promise_amount<=0 then
    raise exception 'invalid payment promise';
  end if;
  if not exists (
    select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role in ('rep','accounts','admin')
  ) then raise exception 'not authorized'; end if;
  if not exists (
    select 1 from public.debt_aging_customers c join public.profiles p on p.id=auth.uid()
    where c.id=p_customer_id and (p.role in ('accounts','admin') or c.assigned_rep=auth.uid())
  ) then raise exception 'customer not assigned to this user'; end if;
  insert into public.debt_aging_payment_promises(customer_id,promise_date,promise_amount,created_by,updated_by)
  values(p_customer_id,p_promise_date,p_promise_amount,auth.uid(),auth.uid())
  on conflict(customer_id) do nothing returning id into new_id;
  if new_id is null then raise exception 'payment promise already exists; only the main admin can change it'; end if;
  return new_id;
end;
$$;
revoke all on function public.debt_aging_create_payment_promise(uuid,date,numeric) from public,anon;
grant execute on function public.debt_aging_create_payment_promise(uuid,date,numeric) to authenticated;

create or replace function public.debt_aging_admin_update_payment_promise(p_customer_id uuid,p_promise_date date,p_promise_amount numeric default null)
returns boolean language plpgsql security invoker set search_path=pg_catalog,public,private,auth
as $$
begin
  if not private.security_ready() or not private.admin_mfa_ok() or not exists (
    select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role='admin' and p.username='admin'
  ) then raise exception 'not authorized'; end if;
  if p_promise_date is null then
    delete from public.debt_aging_payment_promises where customer_id=p_customer_id;
    return found;
  end if;
  if p_promise_amount is not null and p_promise_amount<=0 then raise exception 'invalid payment amount'; end if;
  update public.debt_aging_payment_promises
  set promise_date=p_promise_date,promise_amount=p_promise_amount,updated_by=auth.uid(),updated_at=now()
  where customer_id=p_customer_id;
  return found;
end;
$$;
revoke all on function public.debt_aging_admin_update_payment_promise(uuid,date,numeric) from public,anon;
grant execute on function public.debt_aging_admin_update_payment_promise(uuid,date,numeric) to authenticated;
