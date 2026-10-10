alter table public.debt_aging_entries
  add column receipt_number text;

alter table public.debt_aging_entries
  add constraint debt_aging_entries_receipt_number_required
  check (receipt_number is not null and btrim(receipt_number) <> '')
  not valid;
