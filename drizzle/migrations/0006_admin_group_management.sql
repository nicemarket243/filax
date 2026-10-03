-- Admin group management functions (admin-only, verified inside each function)

create or replace function public.admin_list_groups()
returns table(
  id uuid,
  name text,
  category text,
  currency text,
  target numeric,
  collected numeric,
  deadline date,
  created_at timestamptz,
  owner_id uuid,
  owner_name text,
  owner_filax_id text,
  members_count bigint,
  contributions_count bigint,
  withdrawals_count bigint
)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.category, g.currency, g.target, g.collected, g.deadline, g.created_at,
         g.owner_id,
         coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username, '—'),
         p.filax_id,
         (select count(*) from group_members gm where gm.group_id = g.id),
         (select count(*) from group_contributions gc where gc.group_id = g.id),
         (select count(*) from group_withdrawals gw where gw.group_id = g.id)
  from groups g
  left join profiles p on p.user_id = g.owner_id
  where public.has_role(auth.uid(), 'admin')
  order by g.created_at desc
$$;

create or replace function public.admin_create_group(
  _name text, _category text, _currency text, _target numeric, _deadline date, _owner uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  if _name is null or length(trim(_name)) = 0 then raise exception 'name required'; end if;
  if not exists (select 1 from profiles where user_id = _owner) then raise exception 'owner not found'; end if;
  insert into groups (owner_id, name, category, currency, target, deadline)
  values (_owner, left(trim(_name), 80), coalesce(nullif(_category,''), 'Famille'), coalesce(nullif(_currency,''), 'USD'), _target, _deadline)
  returning id into _id;
  insert into group_members (group_id, user_id) values (_id, _owner) on conflict do nothing;
  return _id;
end $$;

create or replace function public.admin_update_group(
  _id uuid, _name text, _category text, _target numeric, _deadline date
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  if _name is null or length(trim(_name)) = 0 then raise exception 'name required'; end if;
  update groups set name = left(trim(_name), 80), category = coalesce(nullif(_category,''), category),
         target = _target, deadline = _deadline
  where id = _id;
  if not found then raise exception 'group not found'; end if;
end $$;

create or replace function public.admin_delete_group(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  delete from group_contributions where group_id = _id;
  delete from group_withdrawals where group_id = _id;
  delete from group_members where group_id = _id;
  delete from groups where id = _id;
  if not found then raise exception 'group not found'; end if;
end $$;

revoke all on function public.admin_list_groups() from public, anon, authenticated;
revoke all on function public.admin_create_group(text, text, text, numeric, date, uuid) from public, anon, authenticated;
revoke all on function public.admin_update_group(uuid, text, text, numeric, date) from public, anon, authenticated;
revoke all on function public.admin_delete_group(uuid) from public, anon, authenticated;
grant execute on function public.admin_list_groups() to authenticated;
grant execute on function public.admin_create_group(text, text, text, numeric, date, uuid) to authenticated;
grant execute on function public.admin_update_group(uuid, text, text, numeric, date) to authenticated;
grant execute on function public.admin_delete_group(uuid) to authenticated;