-- Persist admin role grants and audit logs from the API (previously in-memory only).

-- Denormalised email so role listings do not need to read auth.users.
alter table public.user_roles add column if not exists email text;
update public.user_roles ur
set email = lower(u.email)
from auth.users u
where u.id = ur.user_id
  and ur.email is null;

-- Resolves an email to a user id for role grants. Exposes auth.users, so only the service role may call it.
create or replace function public.evolvefit_admin_user_id_by_email(target_email text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(trim(target_email))
  limit 1;
$$;

revoke all on function public.evolvefit_admin_user_id_by_email(text) from public;
revoke all on function public.evolvefit_admin_user_id_by_email(text) from anon, authenticated;
grant execute on function public.evolvefit_admin_user_id_by_email(text) to service_role;

-- Audit logs are append-only: no update/delete policies exist, and the API writes them with the service role.
revoke update, delete on public.admin_audit_logs from anon, authenticated;
