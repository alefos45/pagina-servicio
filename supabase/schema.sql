-- =====================================================================
-- La Tierrita · Portal interno
-- Esquema idempotente. Ejecutar completo en Supabase > SQL Editor.
-- =====================================================================

-- --------------------------------------------------------------------
-- 1. Tablas
-- --------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'empleado'
    check (role in ('admin', 'cocinero', 'mesero', 'empleado')),
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.wellness_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  content text not null,
  category text not null default 'general' check (char_length(category) between 1 and 60),
  created_at timestamptz not null default now()
);

create table if not exists public.hr_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 200),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.hr_messages (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null references public.hr_queries (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text,
  recipe jsonb,
  allergens text[] not null default '{}'
);

-- NUEVO: colillas y certificados
create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  period text not null check (char_length(period) between 1 and 40),
  gross_cop integer not null check (gross_cop >= 0),
  net_cop integer not null check (net_cop >= 0),
  status text not null default 'pagada' check (status in ('pagada', 'pendiente')),
  file_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  issued_at date not null,
  expires_at date,
  file_path text,
  created_at timestamptz not null default now()
);

create index if not exists hr_queries_user_id_idx on public.hr_queries (user_id);
create index if not exists hr_messages_query_id_idx on public.hr_messages (query_id);
create index if not exists payslips_user_id_idx on public.payslips (user_id, created_at desc);
create index if not exists certificates_user_id_idx on public.certificates (user_id, issued_at desc);

-- --------------------------------------------------------------------
-- 2. Trigger: alta de perfil al crear usuario
-- --------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'empleado');

  -- SEGURIDAD: 'admin' jamás se asigna desde metadata del cliente.
  if v_role not in ('cocinero', 'mesero', 'empleado') then
    v_role := 'empleado';
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------------
-- 3. Rol del usuario autenticado (evita recursión de RLS)
-- --------------------------------------------------------------------
create or replace function public.get_my_role()
returns text
language sql stable security definer set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;
revoke all on function public.get_my_role() from public, anon;
grant execute on function public.get_my_role() to authenticated;

-- --------------------------------------------------------------------
-- 4. Rate limit servidor en mensajes de chat (2 s por usuario)
-- --------------------------------------------------------------------
create or replace function public.hr_messages_rate_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if exists (
    select 1 from public.hr_messages m
    where m.sender_id = new.sender_id
      and m.created_at > now() - interval '2 seconds'
  ) then
    raise exception 'rate_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists hr_messages_rate_limit_trg on public.hr_messages;
create trigger hr_messages_rate_limit_trg
  before insert on public.hr_messages
  for each row execute function public.hr_messages_rate_limit();

-- --------------------------------------------------------------------
-- 5. RLS
-- --------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.wellness_resources enable row level security;
alter table public.hr_queries enable row level security;
alter table public.hr_messages enable row level security;
alter table public.menu_items enable row level security;
alter table public.payslips enable row level security;
alter table public.certificates enable row level security;

revoke all on public.profiles, public.wellness_resources, public.hr_queries,
  public.hr_messages, public.menu_items, public.payslips, public.certificates from anon;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using ((select public.get_my_role()) = 'admin')
  with check ((select public.get_my_role()) = 'admin');

-- wellness_resources
drop policy if exists wellness_select_authenticated on public.wellness_resources;
create policy wellness_select_authenticated on public.wellness_resources
  for select to authenticated using (true);

drop policy if exists wellness_admin_all on public.wellness_resources;
create policy wellness_admin_all on public.wellness_resources
  for all to authenticated
  using ((select public.get_my_role()) = 'admin')
  with check ((select public.get_my_role()) = 'admin');

-- hr_queries: cocinero NO tiene acceso
drop policy if exists hr_queries_select_own on public.hr_queries;
create policy hr_queries_select_own on public.hr_queries
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.get_my_role()) in ('admin', 'mesero', 'empleado'));

drop policy if exists hr_queries_insert_own on public.hr_queries;
create policy hr_queries_insert_own on public.hr_queries
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.get_my_role()) in ('admin', 'mesero', 'empleado'));

drop policy if exists hr_queries_admin_all on public.hr_queries;
create policy hr_queries_admin_all on public.hr_queries
  for all to authenticated
  using ((select public.get_my_role()) = 'admin')
  with check ((select public.get_my_role()) = 'admin');

-- hr_messages
drop policy if exists hr_messages_select_own on public.hr_messages;
create policy hr_messages_select_own on public.hr_messages
  for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'mesero', 'empleado')
    and exists (
      select 1 from public.hr_queries q
      where q.id = hr_messages.query_id and q.user_id = (select auth.uid())
    )
  );

drop policy if exists hr_messages_insert_own on public.hr_messages;
create policy hr_messages_insert_own on public.hr_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select public.get_my_role()) in ('admin', 'mesero', 'empleado')
    and exists (
      select 1 from public.hr_queries q
      where q.id = hr_messages.query_id and q.user_id = (select auth.uid())
    )
  );

drop policy if exists hr_messages_admin_select on public.hr_messages;
create policy hr_messages_admin_select on public.hr_messages
  for select to authenticated using ((select public.get_my_role()) = 'admin');

drop policy if exists hr_messages_admin_insert on public.hr_messages;
create policy hr_messages_admin_insert on public.hr_messages
  for insert to authenticated
  with check ((select public.get_my_role()) = 'admin' and sender_id = (select auth.uid()));

-- menu_items: receta protegida. Solo cocinero y admin leen la tabla base.
drop policy if exists menu_items_select_chef on public.menu_items;
create policy menu_items_select_chef on public.menu_items
  for select to authenticated using ((select public.get_my_role()) = 'cocinero');

drop policy if exists menu_items_admin_all on public.menu_items;
create policy menu_items_admin_all on public.menu_items
  for all to authenticated
  using ((select public.get_my_role()) = 'admin')
  with check ((select public.get_my_role()) = 'admin');

-- payslips: cada quien ve lo suyo, admin ve todo
drop policy if exists payslips_select_own on public.payslips;
create policy payslips_select_own on public.payslips
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists payslips_admin_all on public.payslips;
create policy payslips_admin_all on public.payslips
  for all to authenticated
  using ((select public.get_my_role()) = 'admin')
  with check ((select public.get_my_role()) = 'admin');

-- certificates: igual que payslips
drop policy if exists certificates_select_own on public.certificates;
create policy certificates_select_own on public.certificates
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists certificates_admin_all on public.certificates;
create policy certificates_admin_all on public.certificates
  for all to authenticated
  using ((select public.get_my_role()) = 'admin')
  with check ((select public.get_my_role()) = 'admin');

-- --------------------------------------------------------------------
-- 6. RPC: menú filtrado por rol (receta solo a cocinero y admin)
-- --------------------------------------------------------------------
create or replace function public.get_menu_for_role()
returns table (
  id uuid,
  name text,
  description text,
  allergens text[],
  recipe jsonb
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select p.role into v_role from public.profiles p where p.id = auth.uid();
  if v_role is null then
    raise exception 'Perfil no encontrado' using errcode = '42501';
  end if;

  return query
    select
      m.id,
      m.name,
      m.description,
      m.allergens,
      case when v_role in ('cocinero', 'admin') then m.recipe else null end
    from public.menu_items m
    order by m.name;
end;
$$;

revoke all on function public.get_menu_for_role() from public, anon;
grant execute on function public.get_menu_for_role() to authenticated;

-- --------------------------------------------------------------------
-- 7. Seed del menú (idempotente por nombre)
-- --------------------------------------------------------------------
insert into public.menu_items (name, description, allergens, recipe)
select * from (values
  ('Cocido boyacense',
   'Olla de barro con papa criolla, habas, mazorca, costilla de cerdo y el ahumado de la casa.',
   array['cerdo']::text[],
   '{"base":"Costilla ahumada 6 h con laurel y cebolla larga","caldo":"90 min con mazorca, habas y papa criolla","final":"Hogao al final, reposo 5 min antes de servir"}'::jsonb),
  ('Mute boyacense',
   'Sopa espesa de maíz trillado, frijol cargamanto, garbanzo y carne de cerdo.',
   array['cerdo']::text[],
   '{"remojo":"Maíz trillado 12 h","coccion":"Frijol y garbanzo por separado","integracion":"Costilla y longaniza, espesar con papa rayada","final":"Cilantro al final"}'::jsonb),
  ('Longaniza de Sutamarchán',
   'Longaniza artesanal a la parrilla, papa criolla y hogao.',
   array['cerdo']::text[],
   '{"parrilla":"220 °C, 8 min por lado","reposo":"2 min","acompanamiento":"Papa criolla a la francesa y hogao"}'::jsonb),
  ('Arepa boyacense',
   'Arepa gruesa de maíz pelao con queso campesino y mantequilla de la casa.',
   array['lácteos']::text[],
   '{"masa":"Maíz pelao cocido y molido","relleno":"Queso campesino","coccion":"Parrilla 4 min por lado"}'::jsonb),
  ('Ajiaco santafereño',
   'Tres papas, pollo desmechado, guascas, alcaparras y crema.',
   array['lácteos','pollo']::text[],
   '{"base":"Pollo campesino con mazorca","papas":"Pastusa, criolla y sabanera en tiempos distintos","final":"Guascas al final, servir con crema, alcaparras y aguacate"}'::jsonb),
  ('Risotto de hongos',
   'Arroz arborio cremoso con hongos silvestres de la región y parmesano.',
   array['lácteos']::text[],
   '{"inicio":"Sofreír hongos en mantequilla, tostar arborio","caldo":"Por tandas 18 min","final":"Mantecar con parmesano y perejil, reposo 2 min"}'::jsonb),
  ('Brownie con helado',
   'Brownie tibio de chocolate amargo con helado de vainilla y nueces.',
   array['gluten','huevo','lácteos','nueces']::text[],
   '{"horneado":"22 min a 175 °C","servicio":"Con helado de vainilla y nueces caramelizadas"}'::jsonb),
  ('Limonada de hierbabuena',
   'Limonada natural con hierbabuena fresca y panela.',
   array[]::text[],
   '{"base":"Jugo de limón tahití","infusion":"Hierbabuena fría","endulzante":"Panela al gusto, servir con hielo"}'::jsonb)
) as v(name, description, allergens, recipe)
where not exists (select 1 from public.menu_items m where m.name = v.name);