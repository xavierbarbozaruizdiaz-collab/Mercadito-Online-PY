-- ============================================
-- HERO CAROUSEL: Tablas, índices, triggers y RLS
-- Ejecutar en Supabase SQL Editor o incluir en pipeline de migraciones
-- ============================================

-- 1) Extensiones necesarias
create extension if not exists pgcrypto;

-- 2) Tabla: hero_slides
create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  cta_primary_label text,
  cta_primary_href text,
  cta_secondary_label text,
  cta_secondary_href text,
  bg_type text not null default 'gradient', -- 'gradient' | 'image'
  bg_gradient_from text default '#14B8A6',
  bg_gradient_to text default '#06B6D4',
  bg_image_url text,
  position int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists hero_slides_active_idx on public.hero_slides(is_active, position asc);

-- Trigger updated_at
create or replace function public.tg_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_hero_slides on public.hero_slides;
create trigger set_updated_at_hero_slides
before update on public.hero_slides
for each row execute function public.tg_set_updated_at();

-- 3) Tabla: site_stats (cache de estadísticas)
create table if not exists public.site_stats (
  id int primary key default 1,
  products_count bigint default 0,
  stores_count bigint default 0,
  auctions_count bigint default 0,
  updated_at timestamptz default now()
);

drop trigger if exists set_updated_at_site_stats on public.site_stats;
create trigger set_updated_at_site_stats
before update on public.site_stats
for each row execute function public.tg_set_updated_at();

-- 4) RLS
alter table public.hero_slides enable row level security;
alter table public.site_stats enable row level security;

-- hero_slides: lectura pública de activos
drop policy if exists hero_read_public on public.hero_slides;
create policy hero_read_public on public.hero_slides
for select to anon, authenticated
using (is_active = true);

-- hero_slides: escritura solo admin
drop policy if exists hero_write_admin on public.hero_slides;
create policy hero_write_admin on public.hero_slides
for all to authenticated
using ((auth.jwt() ->> 'role') = 'admin')
with check ((auth.jwt() ->> 'role') = 'admin');

-- site_stats: lectura pública
drop policy if exists stats_read_public on public.site_stats;
create policy stats_read_public on public.site_stats
for select to anon, authenticated
using (true);

-- site_stats: escritura solo admin
drop policy if exists stats_write_admin on public.site_stats;
create policy stats_write_admin on public.site_stats
for all to authenticated
using ((auth.jwt() ->> 'role') = 'admin')
with check ((auth.jwt() ->> 'role') = 'admin');

-- 5) Seed mínimo
insert into public.site_stats(id, products_count, stores_count, auctions_count)
values (1, 0, 0, 0)
on conflict (id) do nothing;

insert into public.hero_slides(title, subtitle, cta_primary_label, cta_primary_href, cta_secondary_label, cta_secondary_href, bg_type, position, is_active)
values
  ('Mercadito Online PY', 'Compra y vende en Paraguay', 'Explorar', '/#products', 'Vender', '/dashboard', 'gradient', 0, true),
  ('Ofertas destacadas', 'Tecnología, hogar y más', 'Ver ofertas', '/#products', 'Publicar', '/dashboard', 'gradient', 1, true)
on conflict do nothing;

do $$
begin
  raise notice '✅ Migración hero_slides y site_stats aplicada.';
end $$;



