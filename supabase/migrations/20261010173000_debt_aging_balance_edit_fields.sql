create or replace view public.debt_aging_balances with (security_invoker = true) as
select c.id, c.batch_id, c.source_key, c.customer_name, c.area, c.phone, c.assigned_rep,
       c.weekly_required, c.oldest_due_date, c.created_at,
       greatest(0, c.opening_total - coalesce(sum(e.amount) filter (where e.entry_type='payment'),0))::numeric(14,2) as current_total,
       least(greatest(0, c.opening_total - coalesce(sum(e.amount) filter (where e.entry_type='payment'),0)),
         greatest(0, c.opening_overdue - coalesce(sum(e.amount) filter (where e.entry_type in ('payment','cash_order')),0)))::numeric(14,2) as current_overdue,
       coalesce(sum(e.amount) filter (where e.entry_type in ('payment','cash_order') and e.business_date >= ((now() at time zone 'Asia/Riyadh')::date - (((extract(dow from (now() at time zone 'Asia/Riyadh'))::int + 1) % 7))::int) and e.business_date <= (now() at time zone 'Asia/Riyadh')::date),0)::numeric(14,2) as recovered_this_week,
       greatest(0, c.weekly_required - coalesce(sum(e.amount) filter (where e.entry_type in ('payment','cash_order') and e.business_date >= ((now() at time zone 'Asia/Riyadh')::date - (((extract(dow from (now() at time zone 'Asia/Riyadh'))::int + 1) % 7))::int) and e.business_date <= (now() at time zone 'Asia/Riyadh')::date),0))::numeric(14,2) as weekly_remaining,
       c.opening_total, c.opening_overdue
from public.debt_aging_customers c
left join public.debt_aging_entries e on e.customer_id = c.id
group by c.id;
grant select on public.debt_aging_balances to authenticated;
