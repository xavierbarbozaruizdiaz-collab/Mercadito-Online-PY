-- Agregar campo condition a products si no existe
alter table products
  add column if not exists condition text
  check (condition in ('nuevo','usado','usado_como_nuevo'))
  default 'usado';

-- Crear tabla product_images si no existe
create table if not exists product_images (
  id bigserial primary key,
  product_id bigint references products(id) on delete cascade,
  url text not null,
  idx integer not null default 0,
  created_at timestamptz default now(),
  unique(product_id, idx)
);

-- Agregar columna idx si no existe
alter table product_images
  add column if not exists idx integer not null default 0;

-- Crear índices para mejorar consultas
create index if not exists idx_product_images_product_id on product_images(product_id);
create index if not exists idx_product_images_idx on product_images(idx);

-- Crear bucket product-images si no existe
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Políticas de acceso para product-images bucket
-- SELECT público: cualquier usuario puede leer imágenes
drop policy if exists "Public Access for Select" on storage.objects;
create policy "Public Access for Select"
on storage.objects for select
using (bucket_id = 'product-images');

-- INSERT: solo usuarios autenticados pueden subir
drop policy if exists "Authenticated users can upload" on storage.objects;
create policy "Authenticated users can upload"
on storage.objects for insert
with check (
  bucket_id = 'product-images' 
  and auth.role() = 'authenticated'
);

-- UPDATE: solo usuarios autenticados pueden actualizar sus propias imágenes
drop policy if exists "Authenticated users can update" on storage.objects;
create policy "Authenticated users can update"
on storage.objects for update
using (
  bucket_id = 'product-images' 
  and auth.role() = 'authenticated'
);

-- DELETE: solo usuarios autenticados pueden eliminar
drop policy if exists "Authenticated users can delete" on storage.objects;
create policy "Authenticated users can delete"
on storage.objects for delete
using (
  bucket_id = 'product-images' 
  and auth.role() = 'authenticated'
);

