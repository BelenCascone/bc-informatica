-- BC Informática — Panel privado · 002: lista de precios y presupuestos
-- Va después de 001. Se puede correr dos veces sin romper nada.

-- Lista de precios: lo que cobrás hoy por cada servicio.
-- "updated_on" es la fecha del último ajuste: de ahí sale el aviso de inflación.
create table if not exists price_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  category text not null check (category in ('service','sistemas','clases','asesoria','abonos','otros')),
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  unit text not null default 'trabajo',          -- trabajo, hora, mes, clase, paquete
  updated_on date not null default current_date,
  adjust_every_months int not null default 3 check (adjust_every_months between 1 and 24),
  ref_key text,                                  -- referencia de mercado para comparar (panel/referencias.js)
  notes text,
  created_at timestamptz not null default now()
);

-- Presupuestos: qué cotizaste, qué incluía y por qué llegaste a ese precio.
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  project_id uuid references projects(id) on delete set null,
  title text not null,
  client_name text,
  category text not null default 'otros' check (category in ('service','sistemas','clases','asesoria','abonos','otros')),
  date date not null default current_date,
  status text not null default 'borrador' check (status in ('borrador','enviado','aceptado','rechazado')),
  list_price numeric(12,2),                      -- precio "de lista", antes de descuentos
  final_price numeric(12,2) not null check (final_price >= 0),
  parts_cost numeric(12,2),                      -- repuestos, si hubo
  parts_paid_by text check (parts_paid_by in ('cliente','yo')),
  hours_estimated numeric(6,1),
  hours_real numeric(6,1),
  includes text,                                 -- qué incluí (una cosa por renglón)
  reasoning text,                                -- por qué llegué a ese precio
  publishable boolean not null default false,    -- se puede contar como caso en la landing (sin datos del cliente)
  created_at timestamptz not null default now()
);

create index if not exists quotes_date_idx on quotes(date);

alter table price_items enable row level security;
alter table quotes enable row level security;

drop policy if exists "price_items_owner_all" on price_items;
create policy "price_items_owner_all" on price_items
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "quotes_owner_all" on quotes;
create policy "quotes_owner_all" on quotes
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
