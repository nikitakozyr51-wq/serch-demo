/**
 * Приглашение отдаёт ключ, а не свой внутренний номер.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧТО БЫЛО СЛОМАНО
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `invite_agent` возвращал `id` строки приглашения. Принимает приглашение
 * функция `accept_invitation`, и ищет она по колонке `token` — другому,
 * случайному ключу. То есть номер, который получал руководитель, ни к чему
 * не подходил: по нему нельзя было ни собрать ссылку, ни принять
 * приглашение. Путь «позвать человека → он вошёл» не работал в принципе,
 * и заметить это по коду было нельзя: обе функции по отдельности верны.
 *
 * Почему ключей два и почему нужен именно `token`: `id` — внутренний номер
 * строки, он появляется по порядку и утекает в чужие запросы. `token`
 * случаен, живёт семь дней и гасится при приёме. Ссылку строят только
 * из него.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Тип возврата у функции меняется, поэтому её приходится снести и создать
 * заново: `create or replace` менять тип результата не умеет. Права
 * выдаются повторно — вместе с функцией пропадают и они.
 */

drop function if exists public.invite_agent(text, text, integer);

create function public.invite_agent(
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
  new_token uuid;
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
  returning token into new_token;

  return new_token;
end;
$$;

revoke all on function public.invite_agent(text, text, integer) from public;
revoke all on function public.invite_agent(text, text, integer) from anon;
grant execute on function public.invite_agent(text, text, integer) to authenticated;
