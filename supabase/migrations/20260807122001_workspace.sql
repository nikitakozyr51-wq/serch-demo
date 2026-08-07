-- Работа агентства: то, что до сих пор лежало в браузере одного человека.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ЗАЧЕМ ВООБЩЕ СЕРВЕР
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Без него не работают четыре вещи, и все четыре — обещания продукта:
--
--   1. Ссылка на подборку у клиента. Клиент открывает её на своём телефоне,
--      без входа. Данные из браузера агента туда не попадут никогда.
--   2. Общие поиски агентства. «Общее для всех сотрудников» в браузере
--      одного человека существовать не может физически.
--   3. «Коллега уже звонил». Пока журналы у каждого свои, два агента
--      звонят одному собственнику и агентство получает жалобу.
--   4. Настоящий вход по паролю.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ПРАВИЛО, КОТОРОЕ ДЕРЖИТ ВСЁ ОСТАЛЬНОЕ
-- ═══════════════════════════════════════════════════════════════════════════
--
-- **Ключ доступа уезжает в браузер, и это нормально.** Он не пароль:
-- он говорит «я приложение», а не «я такой-то человек». Кто именно пришёл,
-- решает Supabase по сеансу входа, а что ему можно — правила ниже (RLS).
--
-- Поэтому запрет живёт в базе, а не в коде экранов. Экран можно обойти
-- через консоль браузера за минуту; правило базы обойти нельзя.
--
-- Каждая таблица закрыта по одному и тому же признаку: **строку видно
-- только сотруднику того же агентства.** Исключение ровно одно и названо
-- отдельно — публичная подборка.

-- ═══════════════════════════════════════════════════════════════════════════
-- АГЕНТСТВА И ЛЮДИ
-- ═══════════════════════════════════════════════════════════════════════════

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  -- Пробные раскрытия и остаток счёта — свойства агентства, а не человека:
  -- деньги общие, и сотрудник тратит их же.
  balance integer not null default 0,
  trial integer not null default 0
);

-- Сотрудник агентства. Связан с человеком, который вошёл, — `user_id`.
create table public.people (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  -- Пусто, пока приглашение не принято: строка уже есть, а вошедшего ещё нет.
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  initials text not null,
  email text not null,
  role text not null check (role in ('owner', 'agent')),
  -- Дневной лимит раскрытий. NULL — без лимита, и это не то же самое, что 0.
  day_limit integer,
  added_at timestamptz not null default now(),
  unique (agency_id, email)
);

create index people_agency_idx on public.people (agency_id);
create index people_user_idx on public.people (user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ЖУРНАЛЫ РАБОТЫ
-- ═══════════════════════════════════════════════════════════════════════════

-- Раскрытие контакта: единственное место, где списываются деньги.
create table public.disclosures (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  address text not null,
  at timestamptz not null default now(),
  amount integer not null,
  -- Имя на момент раскрытия, а не ссылка на человека. Журнал доступа
  -- отвечает на вопрос «кто это сделал тогда», и переименование сотрудника
  -- не должно переписывать прошлое.
  by_name text not null,
  trial boolean not null default false,
  refunded boolean not null default false,
  -- За один объект агентство платит один раз. Правило продукта, и держать
  -- его обязана база: два экрана, нажатые одновременно, иначе спишут дважды.
  unique (agency_id, address)
);

create index disclosures_agency_at_idx on public.disclosures (agency_id, at desc);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  address text not null,
  at timestamptz not null default now(),
  -- Словарь исходов закрыт: это язык продукта, а не свободный текст.
  outcome text not null check (
    outcome in ('в работе', 'дозвонился', 'не дозвонился', 'отказ', 'посредник', 'отложен')
  ),
  answered text,
  note text,
  remind_at timestamptz,
  by_name text not null
);

create index calls_agency_at_idx on public.calls (agency_id, at desc);
create index calls_address_idx on public.calls (agency_id, address);

-- ═══════════════════════════════════════════════════════════════════════════
-- ПОДБОРКИ
-- ═══════════════════════════════════════════════════════════════════════════

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  name text not null,
  -- Хвост публичного адреса. Постоянный: ссылку уже могли отправить клиенту,
  -- и смена хвоста сломала бы её у всех, кому переслали.
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Ссылка создана и работает. Выключение не удаляет подборку: агент
  -- закрывает доступ, а состав остаётся ему.
  linked boolean not null default false,
  by_name text not null
);

create index collections_agency_idx on public.collections (agency_id);

create table public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  address text not null,
  -- Порядок задаёт агент перетаскиванием, и клиент видит именно его.
  position integer not null,
  primary key (collection_id, address)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ПОИСКИ
-- ═══════════════════════════════════════════════════════════════════════════

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  by_name text not null,
  -- Общий поиск видят все сотрудники, личный — только автор.
  shared boolean not null default false,
  notify text not null default 'instant' check (notify in ('instant', 'hourly', 'morning', 'off')),
  last_opened_at timestamptz,
  -- Условия хранятся как есть: их читает экран выдачи, и раскладывать их
  -- по колонкам значило бы завести второе описание фильтров, которое
  -- разъедется с первым при первой же новой группе условий.
  query jsonb not null
);

create index saved_searches_agency_idx on public.saved_searches (agency_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ДЕНЬГИ
-- ═══════════════════════════════════════════════════════════════════════════

create table public.top_ups (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  at timestamptz not null default now(),
  amount integer not null check (amount > 0),
  method text not null
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  at timestamptz not null default now(),
  address text not null,
  amount integer not null,
  reason text not null,
  -- Объективные причины в лимит возвратов не считаются: номер не существует —
  -- это брак данных, а не передумавший агент.
  objective boolean not null default false,
  by_name text not null
);

create index top_ups_agency_idx on public.top_ups (agency_id, at desc);
create index refunds_agency_idx on public.refunds (agency_id, at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- СТОП-ЛИСТ
-- ═══════════════════════════════════════════════════════════════════════════

-- Собственник просил не звонить. Снять отметку нельзя ни агенту, ни
-- руководителю — поэтому политики удаления у этой таблицы нет вовсе,
-- а не «есть, но кнопки нет». Запрет живёт в базе.
create table public.stop_list (
  agency_id uuid not null references public.agencies (id) on delete cascade,
  address text not null,
  added_at timestamptz not null default now(),
  by_name text not null,
  primary key (agency_id, address)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- КТО ГДЕ РАБОТАЕТ
-- ═══════════════════════════════════════════════════════════════════════════

-- В каком агентстве работает вошедший.
--
-- Объявлена ПОСЛЕ таблиц, потому что читает `people`: тело функции на языке
-- SQL проверяется в момент создания, и над несуществующей таблицей она
-- просто не создастся. Первая сборка на этом и споткнулась.
--
-- `security definer` обязателен по другой причине: функция читает `people`,
-- а на `people` висит правило, которое само зовёт эту функцию. Без него
-- правило вызывало бы себя и упало бы бесконечной рекурсией.
create or replace function public.my_agency_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select agency_id from public.people where user_id = auth.uid() limit 1;
$$;

-- Агентство подставляет база, а не браузер.
--
-- Это не удобство, а защита: присланное поле можно подменить из консоли
-- браузера, вычисленное базой — нельзя. Правило доступа ниже проверяет
-- то же значение ещё раз, и обе проверки должны сойтись.
alter table public.people alter column agency_id set default public.my_agency_id();
alter table public.disclosures alter column agency_id set default public.my_agency_id();
alter table public.calls alter column agency_id set default public.my_agency_id();
alter table public.collections alter column agency_id set default public.my_agency_id();
alter table public.saved_searches alter column agency_id set default public.my_agency_id();
alter table public.top_ups alter column agency_id set default public.my_agency_id();
alter table public.refunds alter column agency_id set default public.my_agency_id();
alter table public.stop_list alter column agency_id set default public.my_agency_id();

-- ═══════════════════════════════════════════════════════════════════════════
-- КТО ЧТО ВИДИТ
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.agencies enable row level security;
alter table public.people enable row level security;
alter table public.disclosures enable row level security;
alter table public.calls enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.saved_searches enable row level security;
alter table public.top_ups enable row level security;
alter table public.refunds enable row level security;
alter table public.stop_list enable row level security;

-- Своё агентство: видно и правится. Чужое не видно вовсе — не «видно,
-- но серым», а не существует для запроса.
create policy agencies_own on public.agencies
  for all to authenticated
  using (id = public.my_agency_id())
  with check (id = public.my_agency_id());

create policy people_own on public.people
  for all to authenticated
  using (agency_id = public.my_agency_id())
  with check (agency_id = public.my_agency_id());

-- Журналы. Одно правило на таблицу, потому что смысл один: это работа
-- агентства, и она принадлежит агентству целиком, а не сотруднику.
create policy disclosures_own on public.disclosures
  for all to authenticated
  using (agency_id = public.my_agency_id())
  with check (agency_id = public.my_agency_id());

create policy calls_own on public.calls
  for all to authenticated
  using (agency_id = public.my_agency_id())
  with check (agency_id = public.my_agency_id());

create policy saved_searches_own on public.saved_searches
  for all to authenticated
  using (agency_id = public.my_agency_id())
  with check (agency_id = public.my_agency_id());

create policy top_ups_own on public.top_ups
  for all to authenticated
  using (agency_id = public.my_agency_id())
  with check (agency_id = public.my_agency_id());

create policy refunds_own on public.refunds
  for all to authenticated
  using (agency_id = public.my_agency_id())
  with check (agency_id = public.my_agency_id());

-- Стоп-лист: читать и добавлять можно, УДАЛЯТЬ НЕЛЬЗЯ.
--
-- Политики `delete` здесь нет намеренно, и это не пропуск. «Снять отказ
-- из интерфейса нельзя ни агенту, ни руководителю» — правило продукта,
-- и держать его должна база, а не отсутствие кнопки. Кнопку дорисуют,
-- а правило останется.
create policy stop_list_read on public.stop_list
  for select to authenticated
  using (agency_id = public.my_agency_id());

create policy stop_list_add on public.stop_list
  for insert to authenticated
  with check (agency_id = public.my_agency_id());

-- ═══════════════════════════════════════════════════════════════════════════
-- ЕДИНСТВЕННОЕ ИСКЛЮЧЕНИЕ: ПОДБОРКА ДЛЯ КЛИЕНТА
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Клиент открывает ссылку без входа — значит запрос приходит от `anon`.
-- Ему видна подборка с включённой ссылкой и её состав, и БОЛЬШЕ НИЧЕГО:
-- ни телефона собственника (его в базе нет вовсе), ни того, сколько
-- агентство заплатило, ни других подборок агентства.
--
-- «Открытие ссылки не тратит деньги агентства и не считается раскрытием» —
-- и на уровне базы это верно буквально: анонимный запрос физически не может
-- прочитать `disclosures`.

create policy collections_own on public.collections
  for all to authenticated
  using (agency_id = public.my_agency_id())
  with check (agency_id = public.my_agency_id());

create policy collections_public on public.collections
  for select to anon
  using (linked = true);

create policy collection_items_own on public.collection_items
  for all to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.agency_id = public.my_agency_id()
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.agency_id = public.my_agency_id()
    )
  );

create policy collection_items_public on public.collection_items
  for select to anon
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.linked = true
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- ЗАВЕДЕНИЕ АГЕНТСТВА
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Создать агентство и стать его руководителем — одно действие, а не два.
-- Двумя запросами оно ломается посередине: агентство есть, сотрудников нет,
-- и человек, который его завёл, в него же попасть не может. Правила выше
-- этого не допустят — `my_agency_id()` вернёт пусто.
--
-- `security definer` здесь по той же причине: на момент создания агентства
-- вошедший ещё не сотрудник ни одного агентства, и правила его не пустят.
create or replace function public.create_agency(agency_name text, person_name text, initials text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_agency uuid;
begin
  if auth.uid() is null then
    raise exception 'Завести агентство может только вошедший';
  end if;

  if exists (select 1 from public.people where user_id = auth.uid()) then
    raise exception 'Этот человек уже состоит в агентстве';
  end if;

  insert into public.agencies (name) values (agency_name) returning id into new_agency;

  insert into public.people (agency_id, user_id, name, initials, email, role, day_limit)
  values (
    new_agency,
    auth.uid(),
    person_name,
    initials,
    (select email from auth.users where id = auth.uid()),
    'owner',
    null
  );

  return new_agency;
end;
$$;

revoke all on function public.create_agency(text, text, text) from public;
grant execute on function public.create_agency(text, text, text) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- ПРАВА НА ТАБЛИЦЫ
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Правил доступа мало: они говорят, КАКИЕ строки видно, а права — можно ли
-- вообще обратиться к таблице. Без прав запрос падает «permission denied»
-- ещё до того, как правило успеет что-то отфильтровать.
--
-- Первая сборка это и пропустила: правила были написаны верно, а кабинет
-- не мог записать ни строки. Поймала проверка `access-rules`, а не чтение
-- SQL глазами — SQL читается правильно и тогда, когда работает неправильно.
--
-- Права широкие, а отбор строк — узкий. Так и задумано: разделение
-- «куда можно обратиться» и «что там видно» держит правило в одном месте.
-- Строки чужого агентства не покажет ни один из этих грантов.

grant select, update on public.agencies to authenticated;
grant select, insert, update, delete on public.people to authenticated;
grant select, insert, update, delete on public.disclosures to authenticated;
grant select, insert, update, delete on public.calls to authenticated;
grant select, insert, update, delete on public.collections to authenticated;
grant select, insert, update, delete on public.collection_items to authenticated;
grant select, insert, update, delete on public.saved_searches to authenticated;
grant select, insert on public.top_ups to authenticated;
grant select, insert on public.refunds to authenticated;

-- Стоп-лист: читать и добавлять. **Удалять права нет ни у кого.**
--
-- Запрет стоит дважды — здесь и в отсутствии политики `delete` выше, — и это
-- не перестраховка. Право и правило отвечают на разные вопросы, и снятие
-- любого из них поодиночке не откроет удаление. Чтобы разрешить снимать
-- отказы, придётся сознательно править два места, а не забыть одно.
grant select, insert on public.stop_list to authenticated;

-- Клиент агентства: только подборка и её состав, только на чтение.
-- Ни раскрытий, ни сотрудников, ни денег — этих грантов у `anon` нет вовсе,
-- и никакое правило их не добавит.
grant select on public.collections to anon;
grant select on public.collection_items to anon;
