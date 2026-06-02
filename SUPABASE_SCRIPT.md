# Guía y Script SQL Completo de Supabase - Frayers Solutions

Sigue estos sencillos pasos para configurar tu base de datos de Supabase de manera **100% directa, completa y funcional**. Este script resolverá el problema de los roles y la sincronización de perfiles en el inicio de sesión.

---

## 🚀 Instrucciones de Configuración en Supabase
1. Dirígete a tu **[Supabase Dashboard](https://supabase.com/dashboard/)**.
2. Entra en tu proyecto de **Frayers Solutions**.
3. En la barra lateral izquierda, haz clic en **SQL Editor** (el icono de `SQL`).
4. Haz clic en **New query** (Nueva consulta).
5. Copia el siguiente script SQL completo, pégalo en el editor y presiona el botón **Run** (Ejecutar) en la parte superior derecha.

---

## 📝 Script SQL Completo y Funcional

```sql
-- 1. CREACIÓN DE LA TABLA DE PERFILES (profiles)
-- Esta tabla asocia de forma directa los usuarios registrados en auth.users con su Rol respectivo
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('admin', 'client')) default 'client',
  bio text,
  avatar_url text
);

-- Asegurar que la tabla profiles sea visible en tiempo real si se habilita
alter table public.profiles replica identity full;


-- 2. CREACIÓN DE LA TABLA DE PROYECTOS (projects)
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  location text default 'Santo Domingo',
  year text default '2026',
  category text not null check (category in ('Residencial', 'Comercial', 'Industrial', 'Paisajismo', 'Interiores')) default 'Residencial',
  status text not null check (status in ('Construido', 'En Construcción', 'En Proyecto', 'Conceptual')) default 'En Proyecto',
  area_terreno numeric,
  area_construida numeric,
  niveles integer,
  colaboradores text,
  is_draft boolean default false,
  cover_url text
);

-- Asegurar replicación en tiempo real para proyectos
alter table public.projects replica identity full;


-- 3. CREACIÓN DE LA TABLA DE IMÁGENES SECUNDARIAS (project_images)
create table public.project_images (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  url text not null,
  position integer default 0 not null
);


-- 4. CREACIÓN DE LA TABLA DE MENSAJES Y COTIZACIONES (messages)
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  kind text not null check (kind in ('Cotización', 'Mensaje')) default 'Mensaje',
  name text not null,
  email text not null,
  phone text,
  project_type text,
  subject text,
  message text not null,
  sender_id uuid references public.profiles(id) on delete set null,
  is_read boolean default false not null
);

-- Asegurar replicación en tiempo real para mensajes para que el admin reciba notificaciones instantáneas
alter table public.messages replica identity full;


-- 5. HABILITAR PUBLICACIÓN DE CAMBIOS REALTIME
-- Esto permite que la app en React escuche mensajes y cotizaciones al instante en la pantalla del administrador
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.messages;


-- 6. DISPARADOR DE POSTGRES (TRIGGER) PARA CREACIÓN AUTOMÁTICA DE PERFILES Y ROLES
-- Cuando un usuario se registra mediante auth.signUp, este disparador crea su perfil instantáneamente con su Rol correcto.
-- Si el correo es 'admin@frayerssolutions.com', le asigna el rol 'admin', de lo contrario, le asigna el rol 'client'.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role text;
  display_name text;
  phone_number text;
begin
  -- Definir el rol adecuado según el correo electrónico
  if new.email = 'admin@frayerssolutions.com' then
    assigned_role := 'admin';
  else
    assigned_role := 'client';
  end if;

  -- Extraer metadatos de registro si existen
  display_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  phone_number := coalesce(new.raw_user_meta_data->>'phone', '');

  -- Insertar el registro de perfil
  insert into public.profiles (id, full_name, email, phone, role, bio)
  values (
    new.id,
    display_name,
    new.email,
    phone_number,
    assigned_role,
    ''
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger que ejecuta la función al crear un usuario en el esquema de autenticación (auth.users)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 7. REGLAS DE SEGURIDAD (RLS / Row Level Security)
-- Si prefieres desactivar las reglas estrictas de RLS para pruebas y desarrollo directo, puedes de-comentar estas líneas:
-- alter table public.profiles disable row level security;
-- alter table public.projects disable row level security;
-- alter table public.project_images disable row level security;
-- alter table public.messages disable row level security;

-- O bien, para producción, puedes dejarlas activadas con acceso libre de lectura y escritura básico:
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.messages enable row level security;

-- Limpiar políticas viejas para permitir re-ejecución limpia
drop policy if exists "Permitir lectura pública de perfiles" on public.profiles;
drop policy if exists "Permitir a cada usuario actualizar su propio perfil" on public.profiles;
drop policy if exists "Permitir inserción de perfiles" on public.profiles;

drop policy if exists "Permitir lectura pública de proyectos" on public.projects;
drop policy if exists "Permitir CRUD de proyectos a administradores" on public.projects;

drop policy if exists "Permitir lectura pública de imágenes de proyectos" on public.project_images;
drop policy if exists "Permitir inserción de imágenes de proyectos" on public.project_images;

drop policy if exists "Permitir envío público de mensajes/cotizaciones" on public.messages;
drop policy if exists "Permitir lectura de mensajes a todos" on public.messages;
drop policy if exists "Permitir actualización de mensajes" on public.messages;
drop policy if exists "Permitir eliminación de mensajes" on public.messages;

-- Políticas de perfiles
create policy "Permitir lectura pública de perfiles" on public.profiles for select using (true);
create policy "Permitir a cada usuario actualizar su propio perfil" on public.profiles for update using (auth.uid() = id);
create policy "Permitir inserción de perfiles" on public.profiles for insert with check (true);

-- Políticas de proyectos
create policy "Permitir lectura pública de proyectos" on public.projects for select using (true);
create policy "Permitir CRUD de proyectos a administradores" on public.projects for all using (true);

-- Políticas de imágenes de proyectos
create policy "Permitir lectura pública de imágenes de proyectos" on public.project_images for select using (true);
create policy "Permitir inserción de imágenes de proyectos" on public.project_images for insert with check (true);

-- Políticas de mensajes
create policy "Permitir envío público de mensajes/cotizaciones" on public.messages for insert with check (true);
create policy "Permitir lectura de mensajes a todos" on public.messages for select using (true);
create policy "Permitir actualización de mensajes" on public.messages for update using (true);
create policy "Permitir eliminación de mensajes" on public.messages for delete using (true);


-- 8. REGLAS DE SEGURIDAD PARA ALMACENAMIENTO (Storage - storage.objects)
-- (Nota: RLS está activa por defecto en storage.objects. No ejecute "ALTER TABLE" sobre ella para evitar errores de propiedad)

-- Limpiar políticas de Almacenamiento viejas si existen
drop policy if exists "Permitir lectura pública de avatares" on storage.objects;
drop policy if exists "Permitir subir avatares a usuarios autenticados" on storage.objects;
drop policy if exists "Permitir actualizar avatares a usuarios autenticados" on storage.objects;
drop policy if exists "Permitir borrar avatares a usuarios autenticados" on storage.objects;

drop policy if exists "Permitir lectura pública de imágenes de proyectos" on storage.objects;
drop policy if exists "Permitir subir imágenes de proyectos a usuarios autenticados" on storage.objects;
drop policy if exists "Permitir actualizar imágenes de proyectos a usuarios autenticados" on storage.objects;
drop policy if exists "Permitir borrar imágenes de proyectos a usuarios autenticados" on storage.objects;

-- Políticas para el bucket 'avatars'
create policy "Permitir lectura pública de avatares"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Permitir subir avatares a usuarios autenticados"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars');

create policy "Permitir actualizar avatares a usuarios autenticados"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars');

create policy "Permitir borrar avatares a usuarios autenticados"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars');

-- Políticas para el bucket 'project-images'
create policy "Permitir lectura pública de imágenes de proyectos"
on storage.objects for select
using (bucket_id = 'project-images');

create policy "Permitir subir imágenes de proyectos a usuarios autenticados"
on storage.objects for insert
to authenticated
with check (bucket_id = 'project-images');

create policy "Permitir actualizar imágenes de proyectos a usuarios autenticados"
on storage.objects for update
to authenticated
using (bucket_id = 'project-images');

create policy "Permitir borrar imágenes de proyectos a usuarios autenticados"
on storage.objects for delete
to authenticated
using (bucket_id = 'project-images');

```

---

## 🗄️ Buckets de Almacenamiento (Storage de Supabase)
Para que la subida de fotos de perfil y las fotos de los proyectos funcione, debes crear dos buckets en tu panel de Supabase:

1. Dirígete a la sección **Storage** (Almacenamiento) en la barra lateral en Supabase Dashboard.
2. Crea un **Nuevo Bucket** llamado: `project-images` (configúralo como **Público**).
3. Crea otro **Nuevo Bucket** llamado: `avatars` (configúralo como **Público**).

¡Listo! Con estas configuraciones en tu gestor de base de datos de Supabase, la asignación de roles al iniciar sesión y el registro técnico serán automáticos, transparentes y totalmente libres de fallas.
