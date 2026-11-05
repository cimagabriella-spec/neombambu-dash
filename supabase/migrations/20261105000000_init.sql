-- ═══════════════════════════════════════════════════════════════════════════
-- NEOBAMBU · Content Approval Hub — schema inicial
-- Autenticação (Supabase Auth), permissões reais via RLS, versionamento,
-- histórico de aprovações, notificações e fila de e-mails.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ───────────────────────────── tipos
create type app_role as enum ('marketing', 'diretoria', 'admin');
create type content_status as enum ('ideia','producao','revisao','aguardando','ajustes','aprovado','programado','publicado');
create type content_channel as enum ('instagram','linkedin');
create type content_format as enum ('feed','carrossel','reels','stories','post','documento','video');
create type campaign_status as enum ('planejamento','ativa','pausada','concluida');
create type approval_action as enum ('created','submitted','approved','changes_requested','new_version','status_changed','rescheduled');
create type media_category as enum ('produtos','colecoes','projetos','showroom','eventos','institucional','videos','identidade');
create type notification_type as enum ('awaiting_approval','approved','changes_requested','comment','upcoming','pending_reminder');

-- ───────────────────────────── perfis
-- role NULL = conta criada, mas ainda não liberada por um administrador.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  title text not null default '',
  role app_role,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.my_role() returns app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.has_role(roles app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = any(roles) from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role is not null)
$$;

-- ───────────────────────────── taxonomias editáveis
create table public.editorial_lines (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  active boolean not null default true,
  sort int not null default 0
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  active boolean not null default true,
  sort int not null default 0
);

insert into public.editorial_lines (name, sort) values
  ('Institucional e posicionamento de marca', 0), ('Arquitetura de superfícies', 1), ('Produtos e coleções', 2),
  ('Educação técnica', 3), ('Sustentabilidade e ESG', 4), ('Projetos e aplicações', 5), ('Eventos e relacionamento', 6),
  ('Arquitetos e especificadores', 7), ('Lifestyle e wellness', 8), ('Imprensa e reconhecimento', 9);
insert into public.products (name, sort) values
  ('ThermoWood®', 0), ('Bambu Densità', 1), ('Coleção Celta', 2), ('Bespoke', 3), ('Multitech', 4), ('Teca', 5),
  ('Soul Exotic Hardwood', 6), ('Helveti', 7), ('Neoteca XCore™', 8);

-- ───────────────────────────── campanhas
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'comercial' check (kind in ('institucional','comercial')),
  objective text not null default '',
  description text not null default '',
  start_date date,
  end_date date,
  product_ids uuid[] not null default '{}',
  status campaign_status not null default 'planejamento',
  owner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

-- ───────────────────────────── conteúdos
create table public.contents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  publish_date date not null,
  publish_time time not null default '10:00',
  channel content_channel not null,
  format content_format not null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  editorial_line_id uuid references public.editorial_lines (id) on delete restrict,
  product_ids uuid[] not null default '{}',
  objective text not null default '',
  copy_art text not null default '',
  caption text not null default '',
  cta text not null default '',
  hashtags text not null default '',
  internal_notes text not null default '',
  reference_links text[] not null default '{}',
  -- [{id, kind, name, path, width, height, mediaId}] — arquivos no bucket content-assets
  assets jsonb not null default '[]'::jsonb check (jsonb_typeof(assets) = 'array'),
  status content_status not null default 'ideia',
  owner_id uuid references public.profiles (id) on delete set null,
  version int not null default 1,
  submitted_version int,
  approved_version int,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  parent_id uuid references public.contents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contents_publish_idx on public.contents (publish_date);
create index contents_status_idx on public.contents (status);

create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents (id) on delete cascade,
  number int not null,
  snapshot jsonb not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, number)
);

create table public.approval_events (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents (id) on delete cascade,
  version int not null,
  action approval_action not null,
  user_id uuid references public.profiles (id) on delete set null,
  message text,
  from_status content_status,
  to_status content_status,
  created_at timestamptz not null default now()
);
create index approval_events_content_idx on public.approval_events (content_id, created_at);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents (id) on delete cascade,
  version int not null,
  parent_id uuid references public.comments (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  kind text not null default 'comment' check (kind in ('comment','adjustment')),
  -- {assetId, x, y} em % — comentário ancorado em um ponto da imagem
  pin jsonb,
  resolved boolean not null default false,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index comments_content_idx on public.comments (content_id);

-- ───────────────────────────── biblioteca de mídia
create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'image' check (kind in ('image','video','file')),
  path text not null,
  category media_category not null default 'institucional',
  folder text not null default 'Geral',
  tags text[] not null default '{}',
  credits text not null default '',
  usage_rights text not null default '',
  origin text not null default '',
  rights_expire_at date,
  authorized boolean not null default false,
  size bigint not null default 0,
  width int,
  height int,
  uploaded_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ───────────────────────────── notificações + fila de e-mail
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type notification_type not null,
  content_id uuid references public.contents (id) on delete cascade,
  title text not null,
  body text not null default '',
  read boolean not null default false,
  dedupe_key text,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Fila preparada para envio por e-mail. Nenhum envio acontece até que uma
-- Edge Function (ou worker) com um provedor SMTP/API seja configurada para
-- consumir as linhas com status = 'pending'.
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications (id) on delete cascade,
  to_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create or replace function public.notify_users(p_users uuid[], p_type notification_type, p_content uuid, p_title text, p_body text, p_dedupe text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r record; nid uuid;
begin
  for r in select distinct p.id, p.email from public.profiles p
           where p.id = any(p_users) and p.role is not null and p.id is distinct from auth.uid() loop
    insert into public.notifications (user_id, type, content_id, title, body, dedupe_key)
    values (r.id, p_type, p_content, p_title, p_body, p_dedupe)
    on conflict (user_id, dedupe_key) do nothing
    returning id into nid;
    if nid is not null and r.email <> '' then
      insert into public.email_outbox (notification_id, to_email, subject, body)
      values (nid, r.email, 'NEOBAMBU · ' || p_title, p_body);
    end if;
  end loop;
end $$;

create or replace function public.users_with_role(roles app_role[]) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(id), '{}') from public.profiles where role = any(roles)
$$;

-- ───────────────────────────── regras de conteúdo (triggers)
create or replace function public.content_versioned_fields(c public.contents) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'title', c.title, 'channel', c.channel, 'format', c.format, 'campaignId', c.campaign_id,
    'editorialLineId', c.editorial_line_id, 'productIds', to_jsonb(c.product_ids), 'objective', c.objective,
    'copyArt', c.copy_art, 'caption', c.caption, 'cta', c.cta, 'hashtags', c.hashtags,
    'referenceLinks', to_jsonb(c.reference_links),
    -- urls assinadas não fazem parte da versão
    'assets', coalesce((select jsonb_agg(a - 'url') from jsonb_array_elements(c.assets) a), '[]'::jsonb))
$$;

create or replace function public.via_rpc() returns boolean language sql stable as $$
  select coalesce(current_setting('nb.via_rpc', true), '') = 'on'
$$;

create or replace function public.contents_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.status := 'ideia';
  new.version := 1;
  new.submitted_version := null;
  new.approved_version := null;
  new.approved_by := null;
  new.approved_at := null;
  new.owner_id := coalesce(new.owner_id, auth.uid());
  new.assets := coalesce((select jsonb_agg(a - 'url') from jsonb_array_elements(new.assets) a), '[]'::jsonb);
  return new;
end $$;
create trigger contents_before_insert before insert on public.contents
  for each row execute function public.contents_before_insert();

create or replace function public.contents_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare changed boolean;
begin
  new.assets := coalesce((select jsonb_agg(a - 'url') from jsonb_array_elements(new.assets) a), '[]'::jsonb);
  new.updated_at := now();
  new.created_at := old.created_at;

  if not public.via_rpc() then
    -- status e campos de aprovação só mudam pelas funções RPC
    if new.status is distinct from old.status then
      raise exception 'Altere o status com set_content_status / submit_content.' using errcode = '42501';
    end if;
    new.version := old.version;
    new.submitted_version := old.submitted_version;
    new.approved_version := old.approved_version;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;

    changed := public.content_versioned_fields(new) is distinct from public.content_versioned_fields(old);
    if old.status = 'publicado' and (changed or (new.publish_date, new.publish_time) is distinct from (old.publish_date, old.publish_time)) then
      raise exception 'Conteúdos publicados não podem ser alterados. Duplique para criar uma nova publicação.' using errcode = '42501';
    end if;
    -- versão enviada é imutável: qualquer alteração gera nova versão
    if changed and old.status in ('aguardando','ajustes','aprovado','programado') and old.submitted_version = old.version then
      new.version := old.version + 1;
      if old.status in ('aprovado','programado') then
        new.status := 'aguardando';
        new.submitted_version := new.version;
        new.approved_by := null;
        new.approved_at := null;
      elsif old.status = 'aguardando' then
        new.submitted_version := new.version;
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger contents_before_update before update on public.contents
  for each row execute function public.contents_before_update();

create or replace function public.contents_after_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.content_versions (content_id, number, snapshot, created_by)
  values (new.id, new.version, public.content_versioned_fields(new), auth.uid())
  on conflict (content_id, number) do update set snapshot = excluded.snapshot, updated_at = now();

  if tg_op = 'INSERT' then
    insert into public.approval_events (content_id, version, action, user_id, to_status)
    values (new.id, 1, 'created', auth.uid(), new.status);
    return new;
  end if;

  if new.version > old.version then
    insert into public.approval_events (content_id, version, action, user_id, message, from_status, to_status)
    values (new.id, new.version, 'new_version', auth.uid(),
      case when old.status in ('aprovado','programado') then 'Conteúdo aprovado foi alterado — nova aprovação necessária.'
           else 'Versão ' || new.version || ' criada' end,
      old.status, new.status);
    if new.submitted_version = new.version then
      perform public.notify_users(public.users_with_role('{diretoria,admin}'), 'awaiting_approval', new.id,
        'Nova versão aguardando aprovação', new.title || ' · v' || new.version);
    end if;
  end if;

  if (new.publish_date, new.publish_time) is distinct from (old.publish_date, old.publish_time) then
    insert into public.approval_events (content_id, version, action, user_id, message, from_status, to_status)
    values (new.id, new.version, 'rescheduled', auth.uid(),
      old.publish_date || ' ' || to_char(old.publish_time, 'HH24:MI') || ' → ' || new.publish_date || ' ' || to_char(new.publish_time, 'HH24:MI'),
      new.status, new.status);
  end if;
  return new;
end $$;
create trigger contents_after_write after insert or update on public.contents
  for each row execute function public.contents_after_write();

-- ───────────────────────────── RPCs do fluxo de aprovação
create or replace function public.set_content_status(p_id uuid, p_status content_status, p_message text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c public.contents; allowed content_status[];
begin
  if not public.has_role('{marketing,admin}') then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if p_status = 'aguardando' then perform public.submit_content(p_id); return; end if;
  select * into c from public.contents where id = p_id for update;
  if not found then raise exception 'Conteúdo não encontrado.'; end if;
  allowed := case c.status
    when 'ideia' then '{producao}'::content_status[]
    when 'producao' then '{ideia,revisao}'
    when 'revisao' then '{producao}'
    when 'aguardando' then '{revisao}'
    when 'ajustes' then '{producao,revisao}'
    when 'aprovado' then '{programado}'
    when 'programado' then '{aprovado,publicado}'
    else '{}' end;
  if not p_status = any(allowed) then
    raise exception 'Transição não permitida: % → %', c.status, p_status using errcode = '42501';
  end if;
  perform set_config('nb.via_rpc', 'on', true);
  update public.contents set status = p_status,
    submitted_version = case when c.status = 'aguardando' then null else submitted_version end
  where id = p_id;
  perform set_config('nb.via_rpc', '', true);
  insert into public.approval_events (content_id, version, action, user_id, message, from_status, to_status)
  values (p_id, c.version, 'status_changed', auth.uid(), p_message, c.status, p_status);
end $$;

create or replace function public.submit_content(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.contents;
begin
  if not public.has_role('{marketing,admin}') then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into c from public.contents where id = p_id for update;
  if not found then raise exception 'Conteúdo não encontrado.'; end if;
  if c.status not in ('ideia','producao','revisao','ajustes') then raise exception 'Este conteúdo não pode ser enviado agora.'; end if;
  if jsonb_array_length(c.assets) = 0 then raise exception 'Anexe ao menos uma arte antes de enviar para aprovação.'; end if;
  if c.status = 'ajustes' and c.submitted_version = c.version then
    raise exception 'Faça os ajustes solicitados (gerando uma nova versão) antes de reenviar.';
  end if;
  perform set_config('nb.via_rpc', 'on', true);
  update public.contents set status = 'aguardando', submitted_version = version where id = p_id;
  perform set_config('nb.via_rpc', '', true);
  insert into public.approval_events (content_id, version, action, user_id, from_status, to_status)
  values (p_id, c.version, 'submitted', auth.uid(), c.status, 'aguardando');
  perform public.notify_users(public.users_with_role('{diretoria,admin}'), 'awaiting_approval', p_id,
    'Novo conteúdo aguardando aprovação', c.title || ' · v' || c.version);
end $$;

-- p_items: [{"id": "...", "version": 2}, ...] — tudo ou nada
create or replace function public.approve_contents(p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare it jsonb; c public.contents; n int := jsonb_array_length(p_items); me text;
begin
  if not public.has_role('{diretoria,admin}') then raise exception 'Somente a diretoria pode aprovar.' using errcode = '42501'; end if;
  select name into me from public.profiles where id = auth.uid();
  perform set_config('nb.via_rpc', 'on', true);
  for it in select * from jsonb_array_elements(p_items) loop
    select * into c from public.contents where id = (it ->> 'id')::uuid for update;
    if not found then raise exception 'Conteúdo não encontrado.'; end if;
    if c.status <> 'aguardando' then raise exception '"%" não está aguardando aprovação.', c.title; end if;
    if c.version <> (it ->> 'version')::int then
      raise exception '"%" mudou para a v% enquanto você revisava. Reabra antes de aprovar.', c.title, c.version;
    end if;
    update public.contents set status = 'aprovado', approved_by = auth.uid(), approved_at = now(), approved_version = c.version
    where id = c.id;
    insert into public.approval_events (content_id, version, action, user_id, message, from_status, to_status)
    values (c.id, c.version, 'approved', auth.uid(), case when n > 1 then 'Aprovação em lote (' || n || ' conteúdos)' end, 'aguardando', 'aprovado');
    perform public.notify_users(array_append(public.users_with_role('{marketing}'), c.owner_id), 'approved', c.id,
      'Conteúdo aprovado', c.title || ' · v' || c.version || ' por ' || coalesce(me, ''));
  end loop;
  perform set_config('nb.via_rpc', '', true);
end $$;

create or replace function public.request_changes(p_id uuid, p_version int, p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare c public.contents;
begin
  if not public.has_role('{diretoria,admin}') then raise exception 'Somente a diretoria pode solicitar ajustes.' using errcode = '42501'; end if;
  if length(trim(coalesce(p_message, ''))) < 5 then raise exception 'Descreva as alterações necessárias.'; end if;
  select * into c from public.contents where id = p_id for update;
  if not found then raise exception 'Conteúdo não encontrado.'; end if;
  if c.status <> 'aguardando' then raise exception 'Este conteúdo não está aguardando aprovação.'; end if;
  if c.version <> p_version then raise exception 'O conteúdo recebeu uma nova versão. Reabra antes de solicitar ajustes.'; end if;
  perform set_config('nb.via_rpc', 'on', true);
  update public.contents set status = 'ajustes' where id = p_id;
  perform set_config('nb.via_rpc', '', true);
  insert into public.approval_events (content_id, version, action, user_id, message, from_status, to_status)
  values (p_id, c.version, 'changes_requested', auth.uid(), trim(p_message), 'aguardando', 'ajustes');
  insert into public.comments (content_id, version, author_id, body, kind)
  values (p_id, c.version, auth.uid(), trim(p_message), 'adjustment');
  perform public.notify_users(array_append(public.users_with_role('{marketing}'), c.owner_id), 'changes_requested', p_id,
    'Ajustes solicitados', c.title || ': ' || left(trim(p_message), 90));
end $$;

-- Alertas de publicação próxima / aprovação pendente (idempotente).
-- Chamada pelo app ao carregar; também pode ser agendada com pg_cron.
create or replace function public.refresh_due_notifications()
returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if not public.is_member() then return; end if;
  for c in select * from public.contents
           where status <> 'publicado'
             and (publish_date + publish_time) between (now() at time zone 'America/Sao_Paulo') and (now() at time zone 'America/Sao_Paulo') + interval '96 hours' loop
    if (c.publish_date + c.publish_time) <= (now() at time zone 'America/Sao_Paulo') + interval '48 hours' then
      insert into public.notifications (user_id, type, content_id, title, body, dedupe_key)
      values (auth.uid(), 'upcoming', c.id,
        case when c.status in ('aprovado','programado') then 'Publicação próxima' else 'Publicação próxima ainda sem aprovação' end,
        c.title || ' · ' || to_char(c.publish_date, 'DD/MM') || ' ' || to_char(c.publish_time, 'HH24:MI'),
        'upcoming:' || c.id || ':' || c.publish_date)
      on conflict (user_id, dedupe_key) do nothing;
    end if;
    if c.status = 'aguardando' and public.my_role() in ('diretoria','admin') then
      insert into public.notifications (user_id, type, content_id, title, body, dedupe_key)
      values (auth.uid(), 'pending_reminder', c.id, 'Aprovação pendente',
        c.title || ' publica em ' || to_char(c.publish_date, 'DD/MM'), 'pending:' || c.id || ':v' || c.version)
      on conflict (user_id, dedupe_key) do nothing;
    end if;
  end loop;
end $$;

-- ───────────────────────────── comentários
create or replace function public.comments_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
    new.created_at := now();
    if new.kind = 'adjustment' and not public.via_rpc() and not public.has_role('{diretoria,admin}') then
      new.kind := 'comment';
    end if;
    if not public.via_rpc() then new.resolved := false; new.resolved_by := null; new.resolved_at := null; end if;
    return new;
  end if;
  -- UPDATE: apenas o estado de "resolvido" pode mudar
  if (new.body, new.content_id, new.version, new.author_id, new.pin, new.kind, new.parent_id)
     is distinct from (old.body, old.content_id, old.version, old.author_id, old.pin, old.kind, old.parent_id) then
    raise exception 'Comentários não podem ser editados — responda ou marque como resolvido.' using errcode = '42501';
  end if;
  new.resolved_by := case when new.resolved then auth.uid() end;
  new.resolved_at := case when new.resolved then now() end;
  return new;
end $$;
create trigger comments_before_write before insert or update on public.comments
  for each row execute function public.comments_before_write();

create or replace function public.comments_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.contents; who text; targets uuid[];
begin
  if new.kind = 'adjustment' then return new; end if; -- já notificado por request_changes
  select * into c from public.contents where id = new.content_id;
  select name into who from public.profiles where id = new.author_id;
  select array_agg(distinct author_id) into targets from public.comments where content_id = new.content_id;
  perform public.notify_users(array_append(coalesce(targets, '{}'), c.owner_id), 'comment', c.id,
    'Comentário de ' || coalesce(who, 'usuário'), c.title || ': ' || left(new.body, 90));
  return new;
end $$;
create trigger comments_after_insert after insert on public.comments
  for each row execute function public.comments_after_insert();

-- papéis só mudam por administradores
create or replace function public.profiles_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = SQL Editor / service role (usado para liberar o primeiro admin)
  if new.role is distinct from old.role and auth.uid() is not null and not public.has_role('{admin}') then
    raise exception 'Somente administradores alteram papéis.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_before_update before update on public.profiles
  for each row execute function public.profiles_before_update();

-- ───────────────────────────── RLS
alter table public.profiles enable row level security;
alter table public.editorial_lines enable row level security;
alter table public.products enable row level security;
alter table public.campaigns enable row level security;
alter table public.contents enable row level security;
alter table public.content_versions enable row level security;
alter table public.approval_events enable row level security;
alter table public.comments enable row level security;
alter table public.media_items enable row level security;
alter table public.notifications enable row level security;
alter table public.email_outbox enable row level security; -- sem políticas: apenas service role

create policy "membros veem perfis" on public.profiles for select to authenticated using (public.is_member() or id = auth.uid());
create policy "editar o próprio perfil" on public.profiles for update to authenticated using (id = auth.uid() or public.has_role('{admin}'));

create policy "membros leem linhas" on public.editorial_lines for select to authenticated using (public.is_member());
create policy "marketing gerencia linhas" on public.editorial_lines for all to authenticated
  using (public.has_role('{marketing,admin}')) with check (public.has_role('{marketing,admin}'));
create policy "membros leem produtos" on public.products for select to authenticated using (public.is_member());
create policy "marketing gerencia produtos" on public.products for all to authenticated
  using (public.has_role('{marketing,admin}')) with check (public.has_role('{marketing,admin}'));

create policy "membros leem campanhas" on public.campaigns for select to authenticated using (public.is_member());
create policy "marketing gerencia campanhas" on public.campaigns for all to authenticated
  using (public.has_role('{marketing,admin}')) with check (public.has_role('{marketing,admin}'));

create policy "membros leem conteúdos" on public.contents for select to authenticated using (public.is_member());
create policy "marketing cria conteúdos" on public.contents for insert to authenticated with check (public.has_role('{marketing,admin}'));
create policy "marketing edita conteúdos" on public.contents for update to authenticated
  using (public.has_role('{marketing,admin}')) with check (public.has_role('{marketing,admin}'));
create policy "marketing exclui não publicados" on public.contents for delete to authenticated
  using (public.has_role('{marketing,admin}') and status <> 'publicado');

create policy "membros leem versões" on public.content_versions for select to authenticated using (public.is_member());
create policy "membros leem histórico" on public.approval_events for select to authenticated using (public.is_member());

create policy "membros leem comentários" on public.comments for select to authenticated using (public.is_member());
create policy "membros comentam" on public.comments for insert to authenticated with check (public.is_member());
create policy "membros resolvem comentários" on public.comments for update to authenticated using (public.is_member());

create policy "membros leem mídia" on public.media_items for select to authenticated using (public.is_member());
create policy "marketing gerencia mídia" on public.media_items for all to authenticated
  using (public.has_role('{marketing,admin}')) with check (public.has_role('{marketing,admin}'));

create policy "ler as próprias notificações" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "marcar como lida" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant execute on function public.set_content_status, public.submit_content, public.approve_contents,
  public.request_changes, public.refresh_due_notifications to authenticated;
revoke execute on function public.notify_users from public, anon, authenticated;

-- ───────────────────────────── Storage (buckets privados)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('content-assets', 'content-assets', false, 104857600,
    array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','video/mp4','video/quicktime','video/webm','application/pdf']),
  ('media-library', 'media-library', false, 104857600,
    array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','video/mp4','video/quicktime','video/webm','application/pdf'])
on conflict (id) do nothing;

create policy "membros leem arquivos" on storage.objects for select to authenticated
  using (bucket_id in ('content-assets','media-library') and public.is_member());
create policy "marketing envia arquivos" on storage.objects for insert to authenticated
  with check (bucket_id in ('content-assets','media-library') and public.has_role('{marketing,admin}'));
create policy "marketing altera arquivos" on storage.objects for update to authenticated
  using (bucket_id in ('content-assets','media-library') and public.has_role('{marketing,admin}'));
create policy "marketing remove arquivos" on storage.objects for delete to authenticated
  using (bucket_id in ('content-assets','media-library') and public.has_role('{marketing,admin}'));

-- ───────────────────────────── Realtime (atualização ao vivo)
do $$ begin
  alter publication supabase_realtime add table public.contents, public.comments, public.approval_events, public.notifications;
exception when undefined_object then null; end $$;
