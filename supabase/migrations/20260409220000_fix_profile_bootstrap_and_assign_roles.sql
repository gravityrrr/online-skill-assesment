drop policy if exists "Users can insert own profile" on public.users;

create policy "Users can insert own profile"
on public.users
for insert
with check (
  auth.uid() = id
  and role in ('Learner', 'Instructor')
  and (
    (role = 'Learner' and is_approved = true and approval_state = 'approved')
    or (role = 'Instructor' and is_approved = false and approval_state = 'pending')
  )
);

create or replace function public.ensure_user_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_user auth.users%rowtype;
  requested_role text;
  target_role public.user_role;
  target_approved boolean;
  target_state text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into auth_user
  from auth.users
  where id = auth.uid();

  if not found then
    raise exception 'Auth user not found';
  end if;

  requested_role := coalesce(auth_user.raw_user_meta_data->>'role', 'Learner');

  if requested_role = 'Instructor' then
    target_role := 'Instructor'::public.user_role;
    target_approved := false;
    target_state := 'pending';
  else
    target_role := 'Learner'::public.user_role;
    target_approved := true;
    target_state := 'approved';
  end if;

  insert into public.users (id, email, name, role, is_approved, approval_state)
  values (
    auth_user.id,
    auth_user.email,
    coalesce(auth_user.raw_user_meta_data->>'name', split_part(auth_user.email, '@', 1)),
    target_role,
    target_approved,
    target_state
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = coalesce(public.users.name, excluded.name);
end;
$$;

revoke all on function public.ensure_user_profile() from public;
revoke all on function public.ensure_user_profile() from anon;
revoke all on function public.ensure_user_profile() from authenticated;
grant execute on function public.ensure_user_profile() to authenticated;

insert into public.users (id, email, name, role, is_approved, approval_state)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  'Learner'::public.user_role,
  true,
  'approved'
from auth.users au
on conflict (id) do nothing;

update public.users
set role = 'Learner', is_approved = true, approval_state = 'approved'
where lower(email) = 'rushil.reddycode@gmail.com';

update public.users
set role = 'Instructor', is_approved = true, approval_state = 'approved'
where lower(email) = 'gravitygraver@gmail.com';

update public.users
set role = 'Admin', is_approved = true, approval_state = 'approved'
where lower(email) = 'rushil.reddy4726@gmail.com';
