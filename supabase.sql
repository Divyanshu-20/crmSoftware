-- Schema and RLS for prototype MVP
create extension if not exists "pgcrypto";

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int not null,
  contact text,
  chief_complaint text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  ear text,
  nose text,
  throat text,
  tests text,
  diagnosis text not null,
  created_at timestamptz not null default now()
);

create index if not exists reports_patient_id_idx on public.reports(patient_id);

-- Billing tables
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_name text not null,
  bill_date date not null default current_date,
  total_amount decimal(10,2) not null default 0.00,
  payment_status text not null default 'unpaid' check (payment_status in ('paid', 'unpaid')),
  paddle_checkout_id text,
  paddle_transaction_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  item_type text not null check (item_type in ('consultation', 'test', 'medicine')),
  description text not null,
  quantity int not null default 1 check (quantity > 0),
  rate decimal(10,2) not null check (rate >= 0),
  amount decimal(10,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists bills_patient_id_idx on public.bills(patient_id);
create index if not exists bills_payment_status_idx on public.bills(payment_status);
create index if not exists bill_items_bill_id_idx on public.bill_items(bill_id);

-- Function to update bill total
create or replace function update_bill_total()
returns trigger as $$
begin
  update public.bills 
  set total_amount = (
    select coalesce(sum(amount), 0) 
    from public.bill_items 
    where bill_id = coalesce(new.bill_id, old.bill_id)
  ),
  updated_at = now()
  where id = coalesce(new.bill_id, old.bill_id);
  return coalesce(new, old);
end;
$$ language plpgsql;

-- Triggers to automatically update bill totals
drop trigger if exists update_bill_total_on_insert on public.bill_items;
drop trigger if exists update_bill_total_on_update on public.bill_items;
drop trigger if exists update_bill_total_on_delete on public.bill_items;

create trigger update_bill_total_on_insert
  after insert on public.bill_items
  for each row execute function update_bill_total();

create trigger update_bill_total_on_update
  after update on public.bill_items
  for each row execute function update_bill_total();

create trigger update_bill_total_on_delete
  after delete on public.bill_items
  for each row execute function update_bill_total();

alter table public.patients enable row level security;
alter table public.reports enable row level security;
alter table public.bills enable row level security;
alter table public.bill_items enable row level security;

-- Create policies if they don't exist
do $$
begin
  -- Patients policies
  if not exists (select 1 from pg_policies where tablename = 'patients' and policyname = 'anon select patients') then
    create policy "anon select patients" on public.patients for select using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'patients' and policyname = 'anon insert patients') then
    create policy "anon insert patients" on public.patients for insert with check (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'patients' and policyname = 'anon update patients') then
    create policy "anon update patients" on public.patients for update using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'patients' and policyname = 'anon delete patients') then
    create policy "anon delete patients" on public.patients for delete using (true);
  end if;
  
  -- Reports policies
  if not exists (select 1 from pg_policies where tablename = 'reports' and policyname = 'anon select reports') then
    create policy "anon select reports" on public.reports for select using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'reports' and policyname = 'anon insert reports') then
    create policy "anon insert reports" on public.reports for insert with check (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'reports' and policyname = 'anon update reports') then
    create policy "anon update reports" on public.reports for update using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'reports' and policyname = 'anon delete reports') then
    create policy "anon delete reports" on public.reports for delete using (true);
  end if;
  
  -- Bills policies
  if not exists (select 1 from pg_policies where tablename = 'bills' and policyname = 'anon select bills') then
    create policy "anon select bills" on public.bills for select using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'bills' and policyname = 'anon insert bills') then
    create policy "anon insert bills" on public.bills for insert with check (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'bills' and policyname = 'anon update bills') then
    create policy "anon update bills" on public.bills for update using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'bills' and policyname = 'anon delete bills') then
    create policy "anon delete bills" on public.bills for delete using (true);
  end if;
  
  -- Bill items policies
  if not exists (select 1 from pg_policies where tablename = 'bill_items' and policyname = 'anon select bill_items') then
    create policy "anon select bill_items" on public.bill_items for select using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'bill_items' and policyname = 'anon insert bill_items') then
    create policy "anon insert bill_items" on public.bill_items for insert with check (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'bill_items' and policyname = 'anon update bill_items') then
    create policy "anon update bill_items" on public.bill_items for update using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'bill_items' and policyname = 'anon delete bill_items') then
    create policy "anon delete bill_items" on public.bill_items for delete using (true);
  end if;
end $$;
