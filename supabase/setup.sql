-- ============================================================================
-- OUVATU — installation complète de la base (à exécuter UNE fois)
-- Supabase → SQL Editor → New query → coller TOUT ce fichier → Run
-- Contient, dans l'ordre : supabase/migrations/20260924000000_init.sql,
--   20260924120000_weekly_plan.sql, 20260924140000_grants.sql + profils existants.
-- ============================================================================

-- NOMA — initial schema
-- Postgres (Supabase). Every user-owned table has Row Level Security enabled:
-- a user can only ever read or write rows where user_id = auth.uid().

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";
create extension if not exists "vector";

-- Immutable wrapper so unaccent can be used in indexes / triggers safely.
create or replace function public.noma_unaccent(text)
returns text language sql immutable parallel safe strict
set search_path = public, extensions
as $$ select unaccent('unaccent', $1) $$;

-- ---------------------------------------------------------------------------
-- Users & billing
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  plan text not null default 'FREE' check (plan in ('FREE', 'PREMIUM')),
  created_at timestamptz not null default now(),
  onboarding_completed boolean not null default false,
  interests text[] not null default '{}',
  analysis_count integer not null default 0
);

create table public.subscriptions (
  user_id uuid primary key references public.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  interval text check (interval in ('month', 'year')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sources & content
-- ---------------------------------------------------------------------------
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  url text not null,
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube', 'pinterest', 'web')),
  title text,
  thumbnail_url text,
  author text,
  published_at timestamptz,
  imported_at timestamptz not null default now(),
  raw_metadata jsonb not null default '{}'::jsonb,
  analysis_status text not null default 'pending'
    check (analysis_status in ('pending', 'fetching', 'analyzing', 'enriching', 'completed', 'failed')),
  analysis_step smallint not null default 0,
  analysis_error text,
  input_channel text not null default 'paste'
    check (input_channel in ('paste', 'share_extension', 'browser_extension', 'direct_import')),
  content_item_id uuid
);
create index sources_user_idx on public.sources (user_id, imported_at desc);
create index sources_status_idx on public.sources (analysis_status, imported_at desc);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  source_id uuid references public.sources (id) on delete set null,
  category text not null check (category in (
    'RECIPES', 'TRAVEL', 'PLACES', 'PRODUCTS', 'MOVIES', 'SERIES',
    'BOOKS', 'FASHION', 'HOME_DECOR', 'FITNESS', 'OTHER')),
  confidence real not null default 0,
  title text not null,
  summary text not null default '',
  image_url text,
  tags text[] not null default '{}',
  entities jsonb not null default '[]'::jsonb,
  data jsonb not null,
  user_data jsonb not null default '{}'::jsonb,
  is_saved boolean not null default false,
  is_favorite boolean not null default false,
  is_example boolean not null default false,
  source_url text,
  source_platform text,
  source_author text,
  search_vector tsvector,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_items_user_idx on public.content_items (user_id, created_at desc);
create index content_items_user_cat_idx on public.content_items (user_id, category);
create index content_items_search_idx on public.content_items using gin (search_vector);

alter table public.sources
  add constraint sources_content_item_fk foreign key (content_item_id)
  references public.content_items (id) on delete set null;

create table public.entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  type text not null,
  name text not null,
  ref integer not null default 0
);
create index entities_item_idx on public.entities (content_item_id);
create index entities_user_name_idx on public.entities (user_id, lower(name));

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  unique (user_id, name)
);
create table public.content_item_tags (
  tag_id uuid not null references public.tags (id) on delete cascade,
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  primary key (tag_id, content_item_id)
);

-- ---------------------------------------------------------------------------
-- Collections
-- ---------------------------------------------------------------------------
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  emoji text not null default '✨',
  is_auto boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index collections_user_idx on public.collections (user_id, updated_at desc);

create table public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, content_item_id)
);
create index collection_items_item_idx on public.collection_items (content_item_id);

-- ---------------------------------------------------------------------------
-- Category projections (maintained by trigger from content_items.data)
-- ---------------------------------------------------------------------------
create table public.recipes (
  content_item_id uuid primary key references public.content_items (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  prep_minutes numeric,
  cook_minutes numeric,
  total_minutes numeric,
  servings numeric,
  difficulty text
);
create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (content_item_id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  position integer not null,
  name text not null,
  quantity numeric,
  unit text,
  note text
);
create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (content_item_id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  position integer not null,
  text text not null
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  position integer not null,
  name text not null,
  kind text not null,
  address text,
  city text,
  country text,
  price_text text,
  cuisine text,
  lat double precision,
  lng double precision
);
create index places_item_idx on public.places (content_item_id);

create table public.trips (
  content_item_id uuid primary key references public.content_items (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  destination text,
  country text,
  cities text[] not null default '{}',
  duration_days numeric
);
create table public.trip_locations (
  trip_id uuid not null references public.trips (content_item_id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  position integer not null,
  primary key (trip_id, place_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  position integer not null,
  brand text,
  name text not null,
  category text,
  price numeric,
  currency text,
  url text,
  image_url text
);

create table public.movies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  position integer not null,
  kind text not null check (kind in ('movie', 'series')),
  title text not null,
  year integer,
  genres text[] not null default '{}',
  poster_url text
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  position integer not null,
  title text not null,
  author text,
  year integer,
  cover_url text
);

create table public.fitness_routines (
  content_item_id uuid primary key references public.content_items (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  goal text,
  level text,
  duration_minutes numeric,
  exercises jsonb not null default '[]'::jsonb
);

-- ---------------------------------------------------------------------------
-- Action layer: saved lists, shopping list, pantry (future "avec ce que j'ai")
-- ---------------------------------------------------------------------------
create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  list_type text not null check (list_type in ('WATCHLIST', 'WISHLIST', 'READING', 'WORKOUT')),
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  entity_ref integer,
  label text not null,
  subtitle text,
  image_url text,
  status text not null default 'todo' check (status in ('todo', 'done')),
  created_at timestamptz not null default now()
);
create unique index saved_items_unique_idx
  on public.saved_items (user_id, list_type, content_item_id, coalesce(entity_ref, -1));

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  checked boolean not null default false,
  content_item_id uuid references public.content_items (id) on delete set null,
  recipe_title text,
  created_at timestamptz not null default now()
);
create index shopping_user_idx on public.shopping_list_items (user_id, created_at);

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------------------------------------------------------------------------
-- Analytics
-- ---------------------------------------------------------------------------
create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.users (id) on delete set null,
  event text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index usage_events_event_idx on public.usage_events (event, created_at desc);
create index usage_events_user_idx on public.usage_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Create the public profile when someone signs up through Supabase Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Derive users.plan from the subscription (written only by the Stripe webhook).
create or replace function public.sync_user_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.users
     set plan = case when new.status in ('active', 'trialing') then 'PREMIUM' else 'FREE' end
   where id = new.user_id;
  return new;
end $$;

create trigger subscriptions_sync_plan
  after insert or update on public.subscriptions
  for each row execute function public.sync_user_plan();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger content_items_touch before update on public.content_items
  for each row execute function public.touch_updated_at();
create trigger collections_touch before update on public.collections
  for each row execute function public.touch_updated_at();

-- Full-text search vector (French config, accent-insensitive).
create or replace function public.content_items_search_vector()
returns trigger language plpgsql set search_path = public as $$
declare
  data_text text;
  entity_text text;
begin
  select coalesce(string_agg(v #>> '{}', ' '), '') into data_text
    from jsonb_path_query(new.data, 'strict $.** ? (@.type() == "string")') as v;
  select coalesce(string_agg(e ->> 'name', ' '), '') into entity_text
    from jsonb_array_elements(new.entities) as e;

  new.search_vector :=
      setweight(to_tsvector('french', noma_unaccent(coalesce(new.title, ''))), 'A')
   || setweight(to_tsvector('french', noma_unaccent(array_to_string(new.tags, ' ') || ' ' || entity_text)), 'B')
   || setweight(to_tsvector('french', noma_unaccent(coalesce(new.summary, ''))), 'C')
   || setweight(to_tsvector('french', noma_unaccent(left(data_text, 20000))), 'D');
  return new;
end $$;

create trigger content_items_search before insert or update of title, summary, tags, entities, data
  on public.content_items
  for each row execute function public.content_items_search_vector();

-- Project content_items.data into the normalized category tables.
create or replace function public.project_content_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  d jsonb := new.data;
  p jsonb;
  i integer;
  place_id uuid;
  tag text;
  tag_id uuid;
begin
  delete from public.recipes where content_item_id = new.id;
  delete from public.trips where content_item_id = new.id;
  delete from public.places where content_item_id = new.id;
  delete from public.products where content_item_id = new.id;
  delete from public.movies where content_item_id = new.id;
  delete from public.books where content_item_id = new.id;
  delete from public.fitness_routines where content_item_id = new.id;
  delete from public.entities where content_item_id = new.id;
  delete from public.content_item_tags where content_item_id = new.id;

  insert into public.entities (user_id, content_item_id, type, name, ref)
  select new.user_id, new.id, e ->> 'type', e ->> 'name', coalesce((e ->> 'ref')::int, 0)
    from jsonb_array_elements(new.entities) as e;

  foreach tag in array new.tags loop
    insert into public.tags (user_id, name) values (new.user_id, lower(tag))
      on conflict (user_id, name) do update set name = excluded.name
      returning id into tag_id;
    insert into public.content_item_tags (tag_id, content_item_id, user_id)
      values (tag_id, new.id, new.user_id) on conflict do nothing;
  end loop;

  if new.category = 'RECIPES' then
    insert into public.recipes (content_item_id, user_id, prep_minutes, cook_minutes, total_minutes, servings, difficulty)
    values (new.id, new.user_id,
      (d #>> '{recipe,prepMinutes}')::numeric, (d #>> '{recipe,cookMinutes}')::numeric,
      (d #>> '{recipe,totalMinutes}')::numeric, (d #>> '{recipe,servings}')::numeric,
      d #>> '{recipe,difficulty}');
    insert into public.recipe_ingredients (recipe_id, user_id, position, name, quantity, unit, note)
    select new.id, new.user_id, (ord - 1)::int, x ->> 'name', (x ->> 'quantity')::numeric, x ->> 'unit', x ->> 'note'
      from jsonb_array_elements(coalesce(d #> '{recipe,ingredients}', '[]')) with ordinality as t(x, ord);
    insert into public.recipe_steps (recipe_id, user_id, position, text)
    select new.id, new.user_id, (ord - 1)::int, x ->> 'text'
      from jsonb_array_elements(coalesce(d #> '{recipe,steps}', '[]')) with ordinality as t(x, ord);

  elsif new.category in ('TRAVEL', 'PLACES') then
    if new.category = 'TRAVEL' then
      insert into public.trips (content_item_id, user_id, destination, country, cities, duration_days)
      values (new.id, new.user_id, d #>> '{travel,destination}', d #>> '{travel,country}',
        coalesce(array(select jsonb_array_elements_text(coalesce(d #> '{travel,cities}', '[]'))), '{}'),
        (d #>> '{travel,durationDays}')::numeric);
      p := coalesce(d #> '{travel,places}', '[]');
    else
      p := coalesce(d #> '{places,places}', '[]');
    end if;
    for i in 0 .. jsonb_array_length(p) - 1 loop
      insert into public.places (user_id, content_item_id, position, name, kind, address, city, country, price_text, cuisine, lat, lng)
      values (new.user_id, new.id, i, p -> i ->> 'name', coalesce(p -> i ->> 'kind', 'other'),
        p -> i ->> 'address', p -> i ->> 'city', p -> i ->> 'country', p -> i ->> 'priceText', p -> i ->> 'cuisine',
        (p -> i #>> '{geo,lat}')::double precision, (p -> i #>> '{geo,lng}')::double precision)
      returning id into place_id;
      if new.category = 'TRAVEL' then
        insert into public.trip_locations (trip_id, place_id, user_id, position) values (new.id, place_id, new.user_id, i);
      end if;
    end loop;

  elsif new.category = 'PRODUCTS' then
    insert into public.products (user_id, content_item_id, position, brand, name, category, price, currency, url, image_url)
    select new.user_id, new.id, (ord - 1)::int, x ->> 'brand', x ->> 'name', x ->> 'productCategory',
      (x ->> 'price')::numeric, x ->> 'currency', x ->> 'url', x ->> 'imageUrl'
      from jsonb_array_elements(coalesce(d #> '{products,products}', '[]')) with ordinality as t(x, ord);

  elsif new.category in ('MOVIES', 'SERIES') then
    insert into public.movies (user_id, content_item_id, position, kind, title, year, genres, poster_url)
    select new.user_id, new.id, (ord - 1)::int, coalesce(x ->> 'kind', 'movie'), x ->> 'title', (x ->> 'year')::int,
      coalesce(array(select jsonb_array_elements_text(coalesce(x -> 'genres', '[]'))), '{}'), x ->> 'posterUrl'
      from jsonb_array_elements(coalesce(d #> '{screen,titles}', '[]')) with ordinality as t(x, ord);

  elsif new.category = 'BOOKS' then
    insert into public.books (user_id, content_item_id, position, title, author, year, cover_url)
    select new.user_id, new.id, (ord - 1)::int, x ->> 'title', x ->> 'author', (x ->> 'year')::int, x ->> 'coverUrl'
      from jsonb_array_elements(coalesce(d #> '{books,books}', '[]')) with ordinality as t(x, ord);

  elsif new.category = 'FITNESS' then
    insert into public.fitness_routines (content_item_id, user_id, goal, level, duration_minutes, exercises)
    values (new.id, new.user_id, d #>> '{fitness,goal}', d #>> '{fitness,level}',
      (d #>> '{fitness,durationMinutes}')::numeric, coalesce(d #> '{fitness,exercises}', '[]'));
  end if;

  return new;
end $$;

create trigger content_items_project
  after insert or update of data, entities, tags, category on public.content_items
  for each row execute function public.project_content_item();

-- ---------------------------------------------------------------------------
-- RPC helpers
-- ---------------------------------------------------------------------------

-- Atomically count an analysis for the calling user.
create or replace function public.increment_analysis_count()
returns integer language sql security definer set search_path = public as $$
  update public.users set analysis_count = analysis_count + 1
   where id = auth.uid()
  returning analysis_count;
$$;

-- Ranked full-text search over the calling user's saved items.
-- `terms` must be pre-sanitized lexemes ([a-z0-9]); they are OR-ed with prefix matching.
create or replace function public.search_content_items(
  terms text[],
  cats text[] default null,
  max_total_minutes numeric default null,
  max_results integer default 50
)
returns setof public.content_items
language sql stable security invoker set search_path = public as $$
  with q as (
    select case when coalesce(array_length(terms, 1), 0) = 0 then null
      else to_tsquery('french', array_to_string(array(select t || ':*' from unnest(terms) as t), ' | '))
    end as query
  )
  select c.*
    from public.content_items c, q
   where c.user_id = auth.uid()
     and c.is_saved
     and (cats is null or c.category = any (cats))
     and (q.query is null or c.search_vector @@ q.query)
     and (max_total_minutes is null
          or (c.category = 'RECIPES' and (c.data #>> '{recipe,totalMinutes}')::numeric <= max_total_minutes))
   order by case when q.query is null then 0 else ts_rank(c.search_vector, q.query) end desc, c.created_at desc
   limit max_results;
$$;

-- Semantic search (optional). Populate content_items.embedding to use it.
create or replace function public.match_content_items(query_embedding vector(1536), match_count integer default 20)
returns setof public.content_items
language sql stable security invoker set search_path = public, extensions as $$
  select * from public.content_items
   where user_id = auth.uid() and is_saved and embedding is not null
   order by embedding <=> query_embedding
   limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.sources enable row level security;
alter table public.content_items enable row level security;
alter table public.entities enable row level security;
alter table public.tags enable row level security;
alter table public.content_item_tags enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.places enable row level security;
alter table public.trips enable row level security;
alter table public.trip_locations enable row level security;
alter table public.products enable row level security;
alter table public.movies enable row level security;
alter table public.books enable row level security;
alter table public.fitness_routines enable row level security;
alter table public.saved_items enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.pantry_items enable row level security;
alter table public.usage_events enable row level security;

-- users: read & update own profile. Only safe columns are updatable (plan and
-- analysis_count can only change through security-definer functions / service role).
create policy users_select_own on public.users for select using (id = auth.uid());
create policy users_update_own on public.users for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.users from authenticated, anon;
grant update (name, avatar_url, onboarding_completed, interests) on public.users to authenticated;

-- subscriptions: read-only for the owner. Written by the Stripe webhook (service role).
create policy subscriptions_select_own on public.subscriptions for select using (user_id = auth.uid());

-- Full CRUD on own rows for user-owned content tables.
do $$
declare t text;
begin
  foreach t in array array[
    'sources', 'content_items', 'collections', 'collection_items',
    'saved_items', 'shopping_list_items', 'pantry_items'
  ] loop
    execute format('create policy %I on public.%I for select using (user_id = auth.uid())', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert with check (user_id = auth.uid())', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete using (user_id = auth.uid())', t || '_delete_own', t);
  end loop;

  -- Projections are written by a security-definer trigger; users can only read them.
  foreach t in array array[
    'entities', 'tags', 'content_item_tags', 'recipes', 'recipe_ingredients', 'recipe_steps',
    'places', 'trips', 'trip_locations', 'products', 'movies', 'books', 'fitness_routines'
  ] loop
    execute format('create policy %I on public.%I for select using (user_id = auth.uid())', t || '_select_own', t);
  end loop;
end $$;

-- usage_events: users may insert their own events; nobody reads them except the service role.
create policy usage_events_insert_own on public.usage_events for insert with check (user_id = auth.uid());

grant execute on function public.increment_analysis_count() to authenticated;
grant execute on function public.search_content_items(text[], text[], numeric, integer) to authenticated;
grant execute on function public.match_content_items(vector, integer) to authenticated;

-- Weekly premium offer: allow 'week' as a subscription interval.
alter table public.subscriptions drop constraint if exists subscriptions_interval_check;
alter table public.subscriptions
  add constraint subscriptions_interval_check check (interval in ('week', 'month', 'year'));

-- Explicit privileges for the Data API roles.
-- Recent Supabase projects no longer grant table privileges automatically to
-- `authenticated` for tables created in SQL: signed-in users then get
-- "permission denied" even though RLS policies exist. Row Level Security still
-- restricts every row to its owner (user_id = auth.uid()).

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- Profile: plan and analysis_count stay server-controlled (webhook / security-definer functions).
revoke insert, update, delete on public.users from authenticated;
grant update (name, avatar_url, onboarding_completed, interests) on public.users to authenticated;

-- Subscriptions and projections are written only by the service role / triggers.
revoke insert, update, delete on public.subscriptions from authenticated;

-- Profils pour les comptes créés avant l'installation des tables.
insert into public.users (id, email) select id, coalesce(email, '') from auth.users on conflict (id) do nothing;
