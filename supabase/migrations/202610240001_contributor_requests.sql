-- Requests are private. Only technical administrators can review identities.
create table public.contributor_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) between 1 and 120),
  email text not null unique check(length(email) <= 254 and email = lower(trim(email))),
  status text not null default 'pending' check(status in ('pending','sending','invited','failed','declined','accepted')),
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.contributor_requests enable row level security;
revoke all on public.contributor_requests from anon, authenticated;
grant select on public.contributor_requests to authenticated;
grant all on public.contributor_requests to service_role;
create policy contributor_requests_admin_read on public.contributor_requests for select to authenticated
  using(public.has_role('technical_admin'));

create function public.request_contributor_access(applicant_name text, applicant_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if length(trim(applicant_name)) not between 1 and 120 or length(applicant_email) > 254
    or applicant_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid request';
  end if;
  -- Duplicate requests never disclose whether an email has already applied.
  insert into contributor_requests(name,email) values(trim(applicant_name),lower(trim(applicant_email)))
    on conflict(email) do nothing;
end $$;
revoke all on function public.request_contributor_access(text,text) from public;
grant execute on function public.request_contributor_access(text,text) to anon,authenticated;

create function public.accept_contributor_invitation() returns void
language plpgsql security definer set search_path = public as $$
declare application contributor_requests;
begin
  -- Identity comes from Auth, never from editable user metadata or request input.
  select r.* into application from contributor_requests r join auth.users u
    on lower(u.email) = r.email where u.id = auth.uid() and u.email_confirmed_at is not null
    and r.status in ('sending','invited') for update of r;
  if not found then return; end if;
  insert into profiles(id,display_name) values(auth.uid(),application.name) on conflict(id) do nothing;
  insert into user_roles(user_id,role,granted_by) values(auth.uid(),'contributor',application.reviewed_by)
    on conflict do nothing;
  update contributor_requests set status='accepted' where id=application.id;
  insert into audit_logs(actor_id,action,record_id) values(auth.uid(),'accept_contributor_invitation',application.id);
end $$;
revoke all on function public.accept_contributor_invitation() from public;
grant execute on function public.accept_contributor_invitation() to authenticated;
