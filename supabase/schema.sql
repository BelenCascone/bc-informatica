-- BC Informática — Panel privado
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar todo > Run

create extension if not exists pgcrypto;

-- Proyectos (clientes / trabajos)
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  client_name text,
  status text not null default 'activo' check (status in ('activo','pausado','finalizado')),
  start_date date,
  end_date date,
  description text,
  -- Para más adelante: marcar cuáles se pueden mostrar en la landing como caso de éxito.
  is_featured boolean not null default false,
  featured_result text,
  created_at timestamptz not null default now()
);

-- Movimientos (ingresos / egresos)
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  project_id uuid references projects(id) on delete set null,
  type text not null check (type in ('ingreso','egreso')),
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  category text,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_date_idx on transactions(date);
create index if not exists transactions_project_idx on transactions(project_id);

-- Seguridad: cada fila solo la puede ver/editar quien la creó.
alter table projects enable row level security;
alter table transactions enable row level security;

create policy "projects_owner_all" on projects
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "transactions_owner_all" on transactions
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
