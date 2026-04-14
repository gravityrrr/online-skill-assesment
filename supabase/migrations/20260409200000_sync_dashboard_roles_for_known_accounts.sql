with target(email, role_text, approved_flag, state_text) as (
  values
    ('rushil.reddycode@gmail.com', 'Learner', true, 'approved'),
    ('gravitygraver@gmail.com', 'Instructor', true, 'approved'),
    ('rushil.reddy4726@gmail.com', 'Admin', true, 'approved')
),
upsert_users as (
  insert into public.users (id, email, name, role, is_approved, approval_state)
  select
    au.id,
    au.email,
    coalesce(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
    target.role_text::public.user_role,
    target.approved_flag,
    target.state_text
  from auth.users au
  join target on lower(target.email) = lower(au.email)
  on conflict (id) do update
  set
    email = excluded.email,
    role = excluded.role,
    is_approved = excluded.is_approved,
    approval_state = excluded.approval_state
  returning id
)
select
  target.email as requested_email,
  au.id as auth_user_id,
  pu.role,
  pu.is_approved,
  pu.approval_state
from target
left join auth.users au on lower(target.email) = lower(au.email)
left join public.users pu on pu.id = au.id
order by target.email;
