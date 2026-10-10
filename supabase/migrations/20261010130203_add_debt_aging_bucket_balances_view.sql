create or replace view public.debt_aging_balances with (security_invoker=true) as
with movement as (
  select c.id,
    coalesce(sum(e.amount) filter(where e.entry_type='payment'),0)::numeric(16,4) as paid,
    coalesce(sum(e.amount) filter(where e.entry_type in ('payment','cash_order')),0)::numeric(16,4) as aging_reduction,
    coalesce(sum(e.amount) filter(where e.entry_type in ('payment','cash_order') and e.business_date >= ((now() at time zone 'Asia/Riyadh')::date - (((extract(dow from (now() at time zone 'Asia/Riyadh'))::int+1)%7))::int) and e.business_date <= (now() at time zone 'Asia/Riyadh')::date),0)::numeric(16,4) as recovered_this_week
  from public.debt_aging_customers c left join public.debt_aging_entries e on e.customer_id=c.id group by c.id
), aged as (
  select c.*,m.paid,m.aging_reduction,m.recovered_this_week,
    greatest(0,c.opening_over_60-m.aging_reduction)::numeric(16,4) as current_over_60,
    greatest(0,c.opening_46_60-greatest(0,m.aging_reduction-c.opening_over_60))::numeric(16,4) as current_46_60,
    greatest(0,c.opening_31_45-greatest(0,m.aging_reduction-c.opening_over_60-c.opening_46_60))::numeric(16,4) as current_31_45,
    greatest(0,c.opening_16_30-greatest(0,m.aging_reduction-c.opening_over_60-c.opening_46_60-c.opening_31_45))::numeric(16,4) as current_16_30,
    greatest(0,c.opening_0_15-greatest(0,m.aging_reduction-c.opening_over_60-c.opening_46_60-c.opening_31_45-c.opening_16_30))::numeric(16,4) as current_0_15
  from public.debt_aging_customers c join movement m on m.id=c.id
)
select a.id,a.batch_id,a.source_key,a.customer_name,a.area,a.phone,a.assigned_rep,
  a.weekly_required,a.oldest_due_date,a.created_at,
  greatest(0,a.opening_total-a.paid)::numeric(16,4) as current_total,
  (a.current_0_15+a.current_16_30+a.current_31_45+a.current_46_60+a.current_over_60)::numeric(16,4) as current_overdue,
  a.current_0_15,a.current_16_30,a.current_31_45,a.current_46_60,a.current_over_60,
  a.recovered_this_week,
  greatest(0,a.weekly_required-a.recovered_this_week)::numeric(16,4) as weekly_remaining,
  a.opening_total,a.opening_overdue,a.opening_0_15,a.opening_16_30,a.opening_31_45,a.opening_46_60,a.opening_over_60
from aged a;
grant select on public.debt_aging_balances to authenticated;
