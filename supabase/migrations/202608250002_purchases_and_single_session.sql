-- Server-only purchase and session state. Run with `supabase db push` or in
-- the Supabase SQL editor before deploying the corresponding backend code.
alter table public.profiles
  add column if not exists active_session_hash text;

create table if not exists public.purchases (
  order_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_slug text not null,
  status text not null check (status in ('PENDING', 'PAID', 'FAILED')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchases_access_lookup
  on public.purchases (user_id, product_slug, status);

alter table public.purchases enable row level security;

drop trigger if exists purchases_set_updated_at on public.purchases;
create trigger purchases_set_updated_at
before update on public.purchases
for each row execute function public.set_updated_at();
