-- Weekly premium offer: allow 'week' as a subscription interval.
alter table public.subscriptions drop constraint if exists subscriptions_interval_check;
alter table public.subscriptions
  add constraint subscriptions_interval_check check (interval in ('week', 'month', 'year'));
