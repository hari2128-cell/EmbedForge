-- Limited ₹1 promotion for the 30-Day Microcontroller Challenge.
-- The capacity check is serialized by locking the coupon row. A reservation
-- lasts 30 minutes, so abandoned orders never consume one of the three slots.

insert into public.coupons (code, discount_inr, max_redemptions, active)
values ('FULLFREEUPTO1', 48, 3, true)
on conflict (code) do update
  set discount_inr = excluded.discount_inr,
      max_redemptions = excluded.max_redemptions,
      active = true;

create or replace function public.reserve_embedforge_coupon(
  p_order_id text,
  p_user_id uuid,
  p_code text
)
returns table (accepted boolean, reason text, amount_inr integer)
language plpgsql security definer set search_path = public as $$
declare c public.coupons%rowtype; used_count integer;
begin
  select * into c from public.coupons where code = upper(trim(p_code)) for update;
  if not found or not c.active then
    return query select false, 'invalid', 49;
    return;
  end if;

  update public.coupon_redemptions set state = 'RELEASED'
    where code = c.code and state = 'RESERVED' and expires_at <= now();

  -- Count paid redemptions plus live reservations. This means a fourth order
  -- cannot be created while the final available slot is being checked out.
  select count(*) into used_count from public.coupon_redemptions
    where code = c.code
      and (state = 'REDEEMED' or (state = 'RESERVED' and expires_at > now()));
  if used_count >= c.max_redemptions then
    return query select false, 'limit_reached', 49;
    return;
  end if;

  insert into public.coupon_redemptions(order_id, user_id, code, state, expires_at)
    values (p_order_id, p_user_id, c.code, 'RESERVED', now() + interval '30 minutes');
  return query select true, 'applied', 49 - c.discount_inr;
end; $$;

revoke all on function public.reserve_embedforge_coupon(text, uuid, text) from public;
grant execute on function public.reserve_embedforge_coupon(text, uuid, text) to service_role;

-- A settled payment can only finalize a live reservation. Cashfree receives
-- the matching 30-minute order expiry from the backend.
create or replace function public.finalize_embedforge_coupon(p_order_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.coupon_redemptions set state = 'REDEEMED', redeemed_at = now()
    where order_id = p_order_id and state = 'RESERVED' and expires_at > now();
  return found or exists (
    select 1 from public.coupon_redemptions
      where order_id = p_order_id and state = 'REDEEMED'
  );
end; $$;

