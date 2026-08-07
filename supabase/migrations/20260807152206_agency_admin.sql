-- Управление агентством: приглашения, реквизиты, роль, вид, удаление.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ОТКУДА ЭТА МИГРАЦИЯ
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Перепись кабинета оставила шесть кнопок без действия, и пять из них
-- упирались не в дизайн — кадры нарисованы, — а сюда: хранить нечего.
-- «Изменить реквизиты» некуда сохранять, «Передать роль» нечем записать,
-- «Пригласить агента» не существует в базе вовсе.
--
-- Кнопка, за которой нет данных, — не забытый обработчик. Дорисовать ей
-- действие без этой миграции значило бы сделать вид, что она работает.

-- ═══════════════════════════════════════════════════════════════════════════
-- РЕКВИЗИТЫ ЮРЛИЦА
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Печатаются в счёте, акте и счёте-фактуре. До сих пор ИНН, который человек
-- вводил при регистрации, просто выбрасывался: `signUp` его не принимал,
-- а колонки под него не было.
--
-- Пусто — законное состояние: агентство может работать картой и без
-- реквизитов, они нужны только для счёта на юрлицо.

alter table public.agencies add column legal_name text;
alter table public.agencies add column inn text;
alter table public.agencies add column legal_address text;

-- ═══════════════════════════════════════════════════════════════════════════
-- ВИД ПО УМОЛЧАНИЮ
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Плотность интерфейса — настройка человека, но у агентства есть значение
-- по умолчанию для НОВЫХ сотрудников. Это разные вещи, и они разведены:
-- `agencies.default_view` — что достанется следующему, `people.view` —
-- что выбрал этот.
--
-- Раскатка на существующих делается отдельным действием и с подтверждением:
-- она меняет чужие экраны, а прежние значения не сохраняются.

alter table public.agencies
  add column default_view text not null default 'spacious'
  check (default_view in ('spacious', 'compact'));

alter table public.people
  add column view text not null default 'spacious'
  check (view in ('spacious', 'compact'));

-- ═══════════════════════════════════════════════════════════════════════════
-- ЗАПРОС НА УДАЛЕНИЕ
-- ═══════════════════════════════════════════════════════════════════════════
--
-- **Запрос, а не удаление.** Данные удаляются за три рабочих дня, а журнал
-- доступа хранится год по закону — стереть его по нажатию кнопки нельзя,
-- даже если очень просят.
--
-- Отметка времени, а не флаг: «когда попросили» отвечает и на вопрос
-- «попросили ли», и на вопрос «сколько осталось до срока». Флаг отвечает
-- только на первый, и срок пришлось бы держать где-то ещё.
alter table public.agencies add column deletion_requested_at timestamptz;

-- ═══════════════════════════════════════════════════════════════════════════
-- ПРИГЛАШЕНИЯ
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Сотрудник появляется в агентстве в два шага: руководитель зовёт, человек
-- принимает. Между ними — эта таблица.
--
-- **Строка в `people` при этом не заводится заранее.** Приглашённый ещё
-- не сотрудник: он может не принять, и агентство, у которого «пять человек»,
-- из которых двое никогда не входили, врёт своему же руководителю.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null default public.my_agency_id() references public.agencies (id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'agent' check (role in ('owner', 'agent')),
  -- Дневной лимит раскрытий назначается сразу: приглашая, руководитель
  -- уже решает, сколько человек может тратить. NULL — без лимита.
  day_limit integer,
  -- Ключ из письма. Случайный и длинный: по нему принимают приглашение,
  -- и подобрать его перебором нельзя.
  token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  -- Приглашение живёт семь дней. Бессрочное — это дверь, о которой забыли.
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  invited_by text not null,
  -- Дважды позвать одного человека в одно агентство нельзя: второе письмо
  -- отменяло бы первое, и человек с первой ссылкой упирался бы в отказ.
  unique (agency_id, email)
);

create index invitations_agency_idx on public.invitations (agency_id);

alter table public.invitations enable row level security;
grant select, insert, delete on public.invitations to authenticated;

-- Свои приглашения видит и отзывает агентство. Чужие не существуют.
create policy invitations_own on public.invitations
  for all to authenticated
  using (agency_id = public.my_agency_id())
  with check (agency_id = public.my_agency_id());

-- ═══════════════════════════════════════════════════════════════════════════
-- ДЕЙСТВИЯ, КОТОРЫЕ БРАУЗЕРУ ДЕЛАТЬ НЕЛЬЗЯ
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Ниже четыре функции, и все четыре существуют по одной причине: каждая
-- меняет то, что запросом из браузера менять нельзя. Правило доступа
-- отвечает на вопрос «чьи это строки», а не «имеет ли право этот человек».
-- Разницу видно на передаче роли: строки свои у обоих, а передать роль
-- может только руководитель.

/** Руководитель ли вошедший. */
create or replace function public.i_am_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.people
    where user_id = auth.uid() and role = 'owner'
  );
$$;

/**
 * Позвать сотрудника.
 *
 * Только руководитель: агент, зовущий агентов, обходит лимиты и превращает
 * счёт агентства в общий кошелёк.
 */
create or replace function public.invite_agent(
  invite_email text,
  invite_name text,
  invite_limit integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  me uuid;
begin
  me := public.my_agency_id();
  if me is null then
    raise exception 'Вошедший не состоит в агентстве';
  end if;
  if not public.i_am_owner() then
    raise exception 'Приглашать сотрудников может только руководитель';
  end if;
  if exists (select 1 from public.people where agency_id = me and email = lower(invite_email)) then
    raise exception 'Этот человек уже работает в агентстве';
  end if;

  insert into public.invitations (agency_id, email, name, day_limit, invited_by)
  values (
    me,
    lower(invite_email),
    invite_name,
    invite_limit,
    (select name from public.people where user_id = auth.uid())
  )
  returning id into new_id;

  return new_id;
end;
$$;

/**
 * Принять приглашение.
 *
 * `security definer` здесь обязателен вдвойне: принимающий ещё не сотрудник
 * ни одного агентства, и правила доступа не пустят его ни к приглашению,
 * ни к таблице людей. Ключ из письма — единственное, что у него есть.
 */
create or replace function public.accept_invitation(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Принять приглашение может только вошедший';
  end if;

  select * into invite from public.invitations where token = invite_token;

  if invite.id is null then raise exception 'Приглашение не найдено'; end if;
  if invite.accepted_at is not null then raise exception 'Приглашение уже принято'; end if;
  if invite.expires_at < now() then raise exception 'Срок приглашения истёк'; end if;
  if exists (select 1 from public.people where user_id = auth.uid()) then
    raise exception 'Этот человек уже состоит в агентстве';
  end if;

  insert into public.people (agency_id, user_id, name, initials, email, role, day_limit, view)
  values (
    invite.agency_id,
    auth.uid(),
    invite.name,
    upper(left(invite.name, 1)),
    invite.email,
    invite.role,
    invite.day_limit,
    -- Новому достаётся вид агентства, а не свой: выбирать его он ещё
    -- не мог, а показывать просторный там, где всё агентство работает
    -- в плотном, значит выдать новичку другой продукт.
    (select default_view from public.agencies where id = invite.agency_id)
  );

  update public.invitations set accepted_at = now() where id = invite.id;

  return invite.agency_id;
end;
$$;

/**
 * Передать роль руководителя.
 *
 * **Ролей в системе ровно две, поэтому роль ответственного за данные
 * неразрывна с руководительской.** Тот, кому её передали, становится
 * руководителем; передавший становится агентом. Обе строки меняются
 * в одном действии: между ними не бывает мгновения с двумя руководителями
 * или без единого.
 */
create or replace function public.transfer_owner(to_person uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
begin
  me := public.my_agency_id();
  if not public.i_am_owner() then
    raise exception 'Передать роль может только руководитель';
  end if;
  if not exists (select 1 from public.people where id = to_person and agency_id = me) then
    raise exception 'Этот человек не работает в вашем агентстве';
  end if;

  update public.people set role = 'agent' where user_id = auth.uid() and agency_id = me;
  update public.people set role = 'owner', day_limit = null where id = to_person;
end;
$$;

/**
 * Поставить вид всем сотрудникам.
 *
 * Отдельное действие, а не побочный эффект смены значения по умолчанию:
 * оно меняет ЧУЖИЕ экраны, и прежний выбор каждого не сохраняется.
 * Поэтому в интерфейсе перед ним стоит подтверждение с числом и именами.
 */
create or replace function public.apply_view_to_all(next_view text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
  touched integer;
begin
  me := public.my_agency_id();
  if not public.i_am_owner() then
    raise exception 'Раскатать вид может только руководитель';
  end if;
  if next_view not in ('spacious', 'compact') then
    raise exception 'Неизвестный вид';
  end if;

  update public.agencies set default_view = next_view where id = me;
  update public.people set view = next_view where agency_id = me;
  get diagnostics touched = row_count;

  return touched;
end;
$$;

/**
 * Запросить удаление агентства.
 *
 * Ставит отметку времени и больше ничего. Само удаление делается вручную
 * и не раньше трёх рабочих дней: это единственное действие продукта,
 * которое нельзя отменить, и единственное, где задержка — не медлительность,
 * а защита.
 *
 * Журнал доступа при этом хранится год по закону и не удаляется вместе
 * с агентством.
 */
create or replace function public.request_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.i_am_owner() then
    raise exception 'Запросить удаление может только руководитель';
  end if;
  update public.agencies set deletion_requested_at = now() where id = public.my_agency_id();
end;
$$;

revoke all on function public.invite_agent(text, text, integer) from public;
revoke all on function public.accept_invitation(uuid) from public;
revoke all on function public.transfer_owner(uuid) from public;
revoke all on function public.apply_view_to_all(text) from public;
revoke all on function public.request_deletion() from public;
revoke all on function public.i_am_owner() from public;

grant execute on function public.invite_agent(text, text, integer) to authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;
grant execute on function public.transfer_owner(uuid) to authenticated;
grant execute on function public.apply_view_to_all(text) to authenticated;
grant execute on function public.request_deletion() to authenticated;
grant execute on function public.i_am_owner() to authenticated;

-- Новая таблица получила бы права гостю автоматически — это правило облака,
-- на котором мы уже спотыкались. Отзыв стоит здесь, рядом с созданием,
-- а не в отдельной миграции через месяц.
revoke all on public.invitations from anon;
