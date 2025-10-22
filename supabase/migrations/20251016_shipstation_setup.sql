-- ShipStation Lite schema additions.
-- Run these statements inside your Supabase project SQL editor or via the CLI.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'profiles_set_updated_at'
  ) then
    create trigger profiles_set_updated_at
      before update on public.profiles
      for each row
      execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    ),
    false
  );
$$;

grant execute on function public.is_admin to authenticated;
grant execute on function public.is_admin to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can read own profile'
  ) then
    create policy "Users can read own profile"
      on public.profiles
      for select
      using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Admins can read all profiles'
  ) then
    create policy "Admins can read all profiles"
      on public.profiles
      for select
      using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can insert own profile'
  ) then
    create policy "Users can insert own profile"
      on public.profiles
      for insert
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile"
      on public.profiles
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Admins can manage all profiles'
  ) then
    create policy "Admins can manage all profiles"
      on public.profiles
      for all
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end;
$$;

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  label text,
  contact_name text,
  company text,
  phone text,
  email text,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'US',
  is_residential boolean not null default false,
  address_kind text not null check (address_kind in ('ship_from', 'ship_to')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.addresses enable row level security;

create index if not exists addresses_user_kind_idx on public.addresses (user_id, address_kind);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'addresses'
      and policyname = 'Users manage own addresses'
  ) then
    create policy "Users manage own addresses"
      on public.addresses
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'addresses'
      and policyname = 'Admins manage addresses'
  ) then
    create policy "Admins manage addresses"
      on public.addresses
      for all
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end;
$$;

create table if not exists public.shipping_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  from_address_id uuid references public.addresses(id),
  to_address_id uuid references public.addresses(id),
  ship_from_snapshot jsonb not null,
  ship_to_snapshot jsonb not null,
  carrier_code text not null,
  service_code text not null,
  package_code text,
  weight_value numeric not null,
  weight_unit text not null,
  confirmation text,
  shipment_cost numeric,
  insurance_cost numeric,
  tracking_number text,
  label_download_url text,
  label_data_base64 text,
  raw_response jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.shipping_labels enable row level security;

create index if not exists shipping_labels_user_idx on public.shipping_labels (user_id, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'shipping_labels'
      and policyname = 'Users view own labels'
  ) then
    create policy "Users view own labels"
      on public.shipping_labels
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'shipping_labels'
      and policyname = 'Users insert own labels'
  ) then
    create policy "Users insert own labels"
      on public.shipping_labels
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'shipping_labels'
      and policyname = 'Admins view labels'
  ) then
    create policy "Admins view labels"
      on public.shipping_labels
      for select
      using (public.is_admin());
  end if;
end;
$$;

