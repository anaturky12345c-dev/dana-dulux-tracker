alter table public.debt_aging_customers
  alter column opening_total type numeric(16,4) using opening_total::numeric(16,4),
  alter column opening_overdue type numeric(16,4) using opening_overdue::numeric(16,4),
  add column if not exists opening_0_15 numeric(16,4) not null default 0 check (opening_0_15 >= 0),
  add column if not exists opening_16_30 numeric(16,4) not null default 0 check (opening_16_30 >= 0),
  add column if not exists opening_31_45 numeric(16,4) not null default 0 check (opening_31_45 >= 0),
  add column if not exists opening_46_60 numeric(16,4) not null default 0 check (opening_46_60 >= 0),
  add column if not exists opening_over_60 numeric(16,4) not null default 0 check (opening_over_60 >= 0);
alter table public.debt_aging_entries alter column amount type numeric(16,4) using amount::numeric(16,4);

create table public.debt_aging_request_audio (
  request_id uuid primary key references public.debt_aging_requests(id) on delete cascade,
  content_type text not null check (content_type in ('audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav')),
  audio_data bytea not null,
  created_at timestamptz not null default now()
);
alter table public.debt_aging_request_audio enable row level security;
create policy debt_aging_audio_rows_read on public.debt_aging_request_audio for select to authenticated
  using (private.security_ready() and private.admin_mfa_ok() and
    (private.debt_aging_full_access() or exists (
      select 1 from public.debt_aging_requests r where r.id=request_id and r.rep_id=(select auth.uid())
    )));
create policy debt_aging_audio_rows_insert on public.debt_aging_request_audio for insert to authenticated
  with check (private.security_ready() and private.admin_mfa_ok() and private.debt_aging_rep_access() and exists (
    select 1 from public.debt_aging_requests r where r.id=request_id and r.rep_id=(select auth.uid()) and r.status='open'
  ));
create policy debt_aging_audio_rows_security_gate on public.debt_aging_request_audio as restrictive for all to authenticated
  using (private.security_ready() and private.admin_mfa_ok())
  with check (private.security_ready() and private.admin_mfa_ok());
grant select, insert on public.debt_aging_request_audio to authenticated;
