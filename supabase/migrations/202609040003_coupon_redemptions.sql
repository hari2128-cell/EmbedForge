-- Production coupon enforcement. This migration must be applied before the
-- application enables EMBEDFORGE49 checkout.
alter table public.purchases
  add column if not exists amount_inr integer not null default 49 check (amount_inr > 0),
  add column if not exists coupon_code text;

create table if not exists public.coupons (
  code text primary key,
  discount_inr integer not null check (discount_inr > 0),
  max_redemptions integer not null check (max_redemptions > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.coupons (code, discount_inr, max_redemptions)
values ('EMBEDFORGE49', 20, 50)
on conflict (code) do update set discount_inr = excluded.discount_inr, max_redemptions = excluded.max_redemptions, active = true;

create table if not exists public.coupon_redemptions (
  order_id text primary key references public.purchases(order_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null references public.coupons(code),
  state text not null check (state in ('RESERVED', 'REDEEMED', 'RELEASED')),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists coupon_redemptions_capacity_idx on public.coupon_redemptions (code, state, expires_at);
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

-- Serializes capacity checks using a row lock. Reservations last 30 minutes;
-- abandoned or failed checkouts expire and never consume a redemption.
create or replace function public.reserve_embedforge_coupon(p_order_id text, p_user_id uuid)
returns table (accepted boolean, reason text, amount_inr integer)
language plpgsql security definer set search_path = public as $$
declare c public.coupons%rowtype; used_count integer;
begin
  select * into c from public.coupons where code = 'EMBEDFORGE49' for update;
  if not found or not c.active then return query select false, 'invalid', 49; return; end if;
  update public.coupon_redemptions set state = 'RELEASED'
    where code = c.code and state = 'RESERVED' and expires_at <= now();
  select count(*) into used_count from public.coupon_redemptions
    where code = c.code and (state = 'REDEEMED' or (state = 'RESERVED' and expires_at > now()));
  if used_count >= c.max_redemptions then return query select false, 'limit_reached', 49; return; end if;
  insert into public.coupon_redemptions(order_id, user_id, code, state, expires_at)
    values (p_order_id, p_user_id, c.code, 'RESERVED', now() + interval '30 minutes');
  return query select true, 'applied', 49 - c.discount_inr;
end; $$;

create or replace function public.finalize_embedforge_coupon(p_order_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.coupon_redemptions set state = 'REDEEMED', redeemed_at = now()
    where order_id = p_order_id and state = 'RESERVED';
  return found or exists (select 1 from public.coupon_redemptions where order_id = p_order_id and state = 'REDEEMED');
end; $$;

create or replace function public.release_embedforge_coupon(p_order_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.coupon_redemptions set state = 'RELEASED'
    where order_id = p_order_id and state = 'RESERVED';
  return found;
end; $$;

revoke all on function public.reserve_embedforge_coupon(text, uuid) from public;
revoke all on function public.finalize_embedforge_coupon(text) from public;
revoke all on function public.release_embedforge_coupon(text) from public;
