create extension if not exists pg_cron;

create or replace function public.process_gp_response_deadlines()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cancelled_count integer := 0;
  v_penalized_gp_count integer := 0;
begin
  with timed_out as (
    select grt.id as tracking_id, grt.order_id, grt.gp_id
    from public.gp_response_tracking grt
    join public.orders o on o.id = grt.order_id
    where grt.responded_at is null
      and grt.auto_cancelled_at is null
      and grt.deadline_at <= now()
      and o.status = 'pending'
    for update of grt skip locked
  ),
  cancelled as (
    update public.orders o
    set status = 'cancelled', updated_at = now()
    from timed_out t
    where o.id = t.order_id
    returning o.id, o.client_id, o.gp_id, o.order_number
  ),
  marked_tracking as (
    update public.gp_response_tracking grt
    set auto_cancelled_at = now()
    where grt.id in (select tracking_id from timed_out)
    returning grt.gp_id
  ),
  penalty_gp as (
    update public.gp_profiles gp
    set consecutive_no_responses = coalesce(gp.consecutive_no_responses, 0) + 1,
        updated_at = now()
    where gp.id in (select distinct gp_id from timed_out)
    returning gp.id
  ),
  penalty_ktp as (
    update public.ktp_status ks
    set trust_score = greatest(0, ks.trust_score - 2),
        ktp_level = public.evaluate_ktp_level(greatest(0, ks.trust_score - 2)),
        last_evaluated_at = now(),
        updated_at = now()
    where ks.gp_id in (select distinct gp_id from timed_out)
    returning ks.gp_id
  ),
  notify_client as (
    insert into public.notifications (user_id, title, message, type, related_id, related_type)
    select c.client_id,
           'Commande annulée automatiquement',
           'La commande ' || c.order_number || ' a été annulée car le transporteur n''a pas répondu à temps.',
           'order_status', c.id, 'order'
    from cancelled c
    returning id
  ),
  notify_gp as (
    insert into public.notifications (user_id, title, message, type, related_id, related_type)
    select gp.user_id,
           'Commande expirée (délai dépassé)',
           'La commande ' || c.order_number || ' a été annulée automatiquement. Votre score KTP a été impacté.',
           'order_status', c.id, 'order'
    from cancelled c
    join public.gp_profiles gp on gp.id = c.gp_id
    returning id
  )
  select (select count(*) from cancelled),
         (select count(distinct gp_id) from penalty_ktp)
  into v_cancelled_count, v_penalized_gp_count;

  return jsonb_build_object(
    'cancelled_orders', coalesce(v_cancelled_count, 0),
    'penalized_gps', coalesce(v_penalized_gp_count, 0),
    'processed_at', now()
  );
end;
$$;

do $schedule$
begin
  if not exists (
    select 1 from cron.job where jobname = 'gp-response-timeout-processor'
  ) then
    perform cron.schedule(
      'gp-response-timeout-processor',
      '*/5 * * * *',
      $cron$select public.process_gp_response_deadlines();$cron$
    );
  end if;
end
$schedule$;