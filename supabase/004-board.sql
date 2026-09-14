-- BC Informática — Panel privado · 004: el board (sprint 02)
-- Va después de 003. Se puede correr dos veces sin romper nada.
--
-- Suma a projects la "mirada humana" (pulso, próximo paso, bloqueante) y crea las tablas del board:
-- sprints, tasks, task_events, qa_cases, qa_runs, bugs y journal. El modelo y sus reglas están en
-- docs/roadmap-panel.md, sección 6. Todas las tablas tienen RLS: cada fila la ve y la toca solo
-- quien la creó. La única variante es task_events, que el dueño solo puede leer.

-- ============================================================
-- projects: columnas nuevas
-- ============================================================
alter table projects add column if not exists pulso text not null default 'andando'
  check (pulso in ('en_llamas','andando','frenado','dormido'));
alter table projects add column if not exists proximo_paso text;
alter table projects add column if not exists bloqueante text;
alter table projects add column if not exists tipo text not null default 'cliente'
  check (tipo in ('cliente','propio','contenido'));
alter table projects add column if not exists repo_url text;
alter table projects add column if not exists prod_url text;
alter table projects add column if not exists ultimo_movimiento timestamptz not null default now();

-- ============================================================
-- Tablas nuevas
-- ============================================================

-- Sprints: un proyecto tiene como mucho uno activo, y el número no se repite dentro del proyecto.
create table if not exists sprints (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  project_id uuid not null references projects(id) on delete cascade,
  numero int not null check (numero > 0),
  nombre text not null,
  objetivo text,
  desde date,
  hasta date,
  estado text not null default 'planeado' check (estado in ('planeado','activo','cerrado')),
  unique (project_id, numero),
  unique (id, project_id),                      -- para que una tarea solo use sprints de su proyecto
  check (desde is null or hasta is null or hasta >= desde)
);
create unique index if not exists sprints_un_activo_por_proyecto on sprints(project_id) where estado = 'activo';

-- Tareas. creada, empezada, pasada_a_qa y cerrada las pone la base (ver tasks_sellar_fechas).
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  project_id uuid not null references projects(id) on delete cascade,
  sprint_id uuid,
  titulo text not null,
  detalle text,
  tipo text not null default 'feature' check (tipo in ('feature','bug','chore','qa')),
  estado text not null default 'backlog'
    check (estado in ('backlog','todo','doing','blocked','qa','ready','done')),
  prioridad text not null default 'media' check (prioridad in ('alta','media','baja')),
  estimado_horas numeric(6,1) check (estimado_horas >= 0),
  orden double precision not null default extract(epoch from now()),  -- las nuevas van al final
  creada timestamptz not null default now(),
  empezada timestamptz,
  pasada_a_qa timestamptz,
  cerrada timestamptz,
  -- El sprint tiene que ser del mismo proyecto. Si se borra el sprint, la tarea queda sin sprint.
  foreign key (sprint_id, project_id) references sprints(id, project_id) on delete set null (sprint_id)
);
create index if not exists tasks_project_idx on tasks(project_id);
create index if not exists tasks_sprint_idx on tasks(sprint_id);
create index if not exists tasks_estado_idx on tasks(estado);

-- Eventos de las tareas: de acá salen todas las métricas. Los escribe solo la base.
create table if not exists task_events (
  id bigint generated always as identity primary key,   -- en orden de llegada
  owner_id uuid not null default auth.uid(),
  task_id uuid not null references tasks(id) on delete cascade,
  estado_anterior text,                                   -- vacío en el alta
  estado_nuevo text not null,
  fecha timestamptz not null default now()
);
create index if not exists task_events_task_idx on task_events(task_id, fecha);

-- Casos de QA de cada proyecto.
create table if not exists qa_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  project_id uuid not null references projects(id) on delete cascade,
  titulo text not null,
  pasos text,
  resultado_esperado text,
  area text,
  activo boolean not null default true
);
create index if not exists qa_cases_project_idx on qa_cases(project_id);

-- Cada vez que se corre un caso.
create table if not exists qa_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  qa_case_id uuid not null references qa_cases(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  fecha timestamptz not null default now(),
  resultado text not null check (resultado in ('pasa','falla','bloqueado')),
  nota text
);
create index if not exists qa_runs_case_idx on qa_runs(qa_case_id);
create index if not exists qa_runs_task_idx on qa_runs(task_id);

-- Bugs. cerrado_en lo pone la base al pasar a "cerrado".
create table if not exists bugs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  project_id uuid not null references projects(id) on delete cascade,
  task_origen uuid references tasks(id) on delete set null,
  titulo text not null,
  severidad text not null default 'media' check (severidad in ('baja','media','alta','critica')),
  pasos_para_reproducir text,
  estado text not null default 'abierto' check (estado in ('abierto','en_arreglo','a_reverificar','cerrado')),
  encontrado_en timestamptz not null default now(),
  cerrado_en timestamptz
);
create index if not exists bugs_project_idx on bugs(project_id);
create index if not exists bugs_task_idx on bugs(task_origen);

-- Bitácora. La fecha es la de hoy en Argentina (current_date es UTC: después de las 21 h ya es mañana).
create table if not exists journal (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  fecha date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
  project_id uuid references projects(id) on delete set null,
  texto text not null
);
create index if not exists journal_project_idx on journal(project_id);
create index if not exists journal_fecha_idx on journal(fecha);

-- ============================================================
-- Seguridad por fila
-- ============================================================
-- (select auth.uid()) es lo mismo que auth.uid(), pero Postgres lo calcula una vez por consulta
-- y no una vez por fila.
alter table sprints enable row level security;
alter table tasks enable row level security;
alter table task_events enable row level security;
alter table qa_cases enable row level security;
alter table qa_runs enable row level security;
alter table bugs enable row level security;
alter table journal enable row level security;

drop policy if exists "sprints_owner_all" on sprints;
create policy "sprints_owner_all" on sprints for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "tasks_owner_all" on tasks;
create policy "tasks_owner_all" on tasks for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- task_events: el dueño solo lee. No hay política para escribir, y además se le quita el permiso.
drop policy if exists "task_events_owner_select" on task_events;
create policy "task_events_owner_select" on task_events for select to authenticated
  using (owner_id = (select auth.uid()));
revoke insert, update, delete, truncate on task_events from anon, authenticated;

drop policy if exists "qa_cases_owner_all" on qa_cases;
create policy "qa_cases_owner_all" on qa_cases for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "qa_runs_owner_all" on qa_runs;
create policy "qa_runs_owner_all" on qa_runs for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "bugs_owner_all" on bugs;
create policy "bugs_owner_all" on bugs for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "journal_owner_all" on journal;
create policy "journal_owner_all" on journal for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- ============================================================
-- Lo que la base hace sola
-- ============================================================

-- Tareas: las fechas del ciclo no se cargan a mano.
--   empezada    = la primera vez que pasó a doing
--   pasada_a_qa = la última vez que pasó a qa
--   cerrada     = la última vez que pasó a done; se vacía si sale de done
create or replace function public.tasks_sellar_fechas() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.creada := now();
    new.empezada := null;
    new.pasada_a_qa := null;
    new.cerrada := null;
  else
    new.creada := old.creada;
    new.empezada := old.empezada;
    new.pasada_a_qa := old.pasada_a_qa;
    new.cerrada := old.cerrada;
  end if;
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    if new.estado = 'doing' and new.empezada is null then new.empezada := now(); end if;
    if new.estado = 'qa' then new.pasada_a_qa := now(); end if;
    new.cerrada := case when new.estado = 'done' then now() end;
  end if;
  return new;
end $$;

create or replace trigger tasks_sellar_fechas before insert or update on tasks
  for each row execute function public.tasks_sellar_fechas();

-- Tareas: cada alta y cada cambio de estado quedan en task_events. Corre como dueña de la función
-- (security definer) porque el navegador no puede escribir en task_events.
create or replace function public.tasks_anotar_evento() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    insert into public.task_events (owner_id, task_id, estado_anterior, estado_nuevo)
    values (new.owner_id, new.id, case when tg_op = 'UPDATE' then old.estado end, new.estado);
  end if;
  return null;
end $$;

create or replace trigger tasks_anotar_evento after insert or update on tasks
  for each row execute function public.tasks_anotar_evento();

-- Bugs: cerrado_en se pone al pasar a "cerrado" y se vacía si el bug se reabre.
create or replace function public.bugs_sellar_cierre() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.estado = 'cerrado' then
    if tg_op = 'INSERT' or old.estado is distinct from 'cerrado' then
      new.cerrado_en := now();
    else
      new.cerrado_en := old.cerrado_en;
    end if;
  else
    new.cerrado_en := null;
  end if;
  return new;
end $$;

create or replace trigger bugs_sellar_cierre before insert or update on bugs
  for each row execute function public.bugs_sellar_cierre();

-- Bugs: un bug cargado sobre una tarea que está en QA la devuelve a doing (queda el evento).
create or replace function public.bugs_devolver_tarea() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.task_origen is not null then
    update public.tasks set estado = 'doing' where id = new.task_origen and estado = 'qa';
  end if;
  return null;
end $$;

create or replace trigger bugs_devolver_tarea after insert on bugs
  for each row execute function public.bugs_devolver_tarea();

-- Último movimiento del proyecto: lo actualiza cualquier cambio de trabajo (tareas, sprints, bugs,
-- corridas de QA, bitácora). La plata no cuenta.
create or replace function public.tocar_proyecto() returns trigger
language plpgsql set search_path = '' as $$
declare
  proyecto uuid;
begin
  if tg_table_name = 'qa_runs' then
    select project_id into proyecto from public.qa_cases where id = new.qa_case_id;
  else
    proyecto := new.project_id;
  end if;
  if proyecto is not null then
    update public.projects set ultimo_movimiento = now() where id = proyecto;
  end if;
  return null;
end $$;

create or replace trigger tasks_tocar_proyecto after insert or update on tasks
  for each row execute function public.tocar_proyecto();
create or replace trigger sprints_tocar_proyecto after insert or update on sprints
  for each row execute function public.tocar_proyecto();
create or replace trigger bugs_tocar_proyecto after insert or update on bugs
  for each row execute function public.tocar_proyecto();
create or replace trigger qa_runs_tocar_proyecto after insert or update on qa_runs
  for each row execute function public.tocar_proyecto();
create or replace trigger journal_tocar_proyecto after insert or update on journal
  for each row execute function public.tocar_proyecto();

-- projects: ultimo_movimiento no se escribe desde el panel. Un cambio que viene directo del
-- navegador (pg_trigger_depth() = 1) lo deja como estaba, salvo que cambie el pulso, el próximo
-- paso o el bloqueante. Los que vienen de los triggers de arriba (profundidad 2 o más) pasan.
create or replace function public.projects_ultimo_movimiento() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.ultimo_movimiento := now();
  elsif pg_trigger_depth() = 1 then
    new.ultimo_movimiento := old.ultimo_movimiento;
    if (new.pulso, new.proximo_paso, new.bloqueante)
       is distinct from (old.pulso, old.proximo_paso, old.bloqueante) then
      new.ultimo_movimiento := now();
    end if;
  end if;
  return new;
end $$;

create or replace trigger projects_ultimo_movimiento before insert or update on projects
  for each row execute function public.projects_ultimo_movimiento();

-- Las funciones de los triggers no se llaman desde afuera (la API expone las funciones de public).
revoke execute on function public.tasks_sellar_fechas() from public, anon, authenticated;
revoke execute on function public.tasks_anotar_evento() from public, anon, authenticated;
revoke execute on function public.bugs_sellar_cierre() from public, anon, authenticated;
revoke execute on function public.bugs_devolver_tarea() from public, anon, authenticated;
revoke execute on function public.tocar_proyecto() from public, anon, authenticated;
revoke execute on function public.projects_ultimo_movimiento() from public, anon, authenticated;
