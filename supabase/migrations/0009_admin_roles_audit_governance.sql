create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('super-admin', 'content-admin', 'support')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, role)
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  resource_type text not null,
  resource_id text,
  before_json jsonb,
  after_json jsonb,
  request_id text,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references auth.users(id) on delete set null,
  resource_type text not null,
  resource_id text,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  moderator_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.app_config_flags (
  key text primary key,
  value jsonb not null default 'false'::jsonb,
  description text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists user_roles_user_role_idx on public.user_roles(user_id, role) where revoked_at is null;
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
create index if not exists admin_audit_logs_resource_idx on public.admin_audit_logs(resource_type, resource_id, created_at desc);
create index if not exists admin_reports_status_idx on public.admin_reports(status, created_at desc);

create or replace function public.evolvefit_has_admin_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.revoked_at is null
      and (
        ur.role = 'super-admin'
        or (required_permission in ('content:read', 'content:write', 'audit:read', 'admin:dashboard') and ur.role = 'content-admin')
        or (required_permission in ('support:read', 'audit:read', 'admin:dashboard') and ur.role = 'support')
      )
  );
$$;

alter table public.user_roles enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.admin_reports enable row level security;
alter table public.app_config_flags enable row level security;

drop policy if exists "super admins manage roles" on public.user_roles;
create policy "super admins manage roles"
on public.user_roles for all
using (public.evolvefit_has_admin_permission('roles:write'))
with check (public.evolvefit_has_admin_permission('roles:write'));

drop policy if exists "admins read audit logs" on public.admin_audit_logs;
create policy "admins read audit logs"
on public.admin_audit_logs for select
using (public.evolvefit_has_admin_permission('audit:read'));

drop policy if exists "admins insert audit logs" on public.admin_audit_logs;
create policy "admins insert audit logs"
on public.admin_audit_logs for insert
with check (public.evolvefit_has_admin_permission('admin:dashboard'));

drop policy if exists "support admins moderate reports" on public.admin_reports;
create policy "support admins moderate reports"
on public.admin_reports for all
using (public.evolvefit_has_admin_permission('support:read'))
with check (public.evolvefit_has_admin_permission('support:read'));

drop policy if exists "super admins manage app config" on public.app_config_flags;
create policy "super admins manage app config"
on public.app_config_flags for all
using (public.evolvefit_has_admin_permission('roles:write'))
with check (public.evolvefit_has_admin_permission('roles:write'));
