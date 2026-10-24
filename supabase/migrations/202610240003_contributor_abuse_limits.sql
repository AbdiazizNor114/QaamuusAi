-- Every application passes through the server and a database-backed budget.
-- No raw IP addresses are stored. Budgets are shared by all app instances.
create table public.contributor_request_budgets (
  bucket text primary key,
  started_at timestamptz not null,
  requests integer not null check (requests > 0)
);
alter table public.contributor_request_budgets enable row level security;
revoke all on public.contributor_request_budgets from public, anon, authenticated, service_role;

create function public.consume_contributor_budget(budget_key text, max_requests integer, seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare used integer;
begin
  insert into contributor_request_budgets as b(bucket,started_at,requests)
    values(budget_key,now(),1)
    on conflict(bucket) do update set
      requests = case when b.started_at <= now() - make_interval(secs => seconds) then 1 else b.requests + 1 end,
      started_at = case when b.started_at <= now() - make_interval(secs => seconds) then now() else b.started_at end
    where b.started_at <= now() - make_interval(secs => seconds) or b.requests < max_requests
    returning requests into used;
  return used is not null;
end $$;
revoke all on function public.consume_contributor_budget(text,integer,integer) from public, anon, authenticated, service_role;

-- Preserve the validated insertion logic, but remove all direct public access.
alter function public.request_contributor_access(text,text,text,text) rename to insert_contributor_request;
revoke all on function public.insert_contributor_request(text,text,text,text) from public, anon, authenticated, service_role;

create function public.request_contributor_access(
  applicant_name text, applicant_email text, applicant_study text, applicant_role text,
  client_hash text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if client_hash is null or client_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid client'; end if;
  -- Bound storage, including under attacks using many source addresses.
  delete from contributor_request_budgets where started_at < now() - interval '1 day';
  if not consume_contributor_budget('global',100,3600)
     or not consume_contributor_budget('client:' || client_hash,5,900) then
    raise sqlstate 'P0429' using message = 'Application rate limit exceeded';
  end if;
  perform insert_contributor_request(applicant_name,applicant_email,applicant_study,applicant_role);
end $$;
revoke all on function public.request_contributor_access(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.request_contributor_access(text,text,text,text,text) to service_role;
