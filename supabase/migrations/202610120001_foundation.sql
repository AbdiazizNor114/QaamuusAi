-- Apply through the Supabase CLI or SQL editor. Editorial transitions are RPC-only.
create extension if not exists pgcrypto;
create type public.app_role as enum ('contributor','reviewer','editor','technical_admin');
create type public.submission_status as enum ('draft','submitted','under_review','changes_requested','approved','published','rejected','disputed','superseded');
create type public.dataset_category as enum ('vocabulary','translation','grammar');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid references public.profiles(id) on delete cascade,
  role public.app_role not null, granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), primary key(user_id,role)
);
create table public.scholar_applications (
  id uuid primary key default gen_random_uuid(), applicant_id uuid not null references public.profiles(id),
  rationale text not null check(length(trim(rationale)) > 0), status text not null default 'pending' check(status in ('pending','accepted','declined')),
  created_at timestamptz not null default now()
);
create table public.articles (
  id uuid primary key default gen_random_uuid(), title text not null, body text not null,
  author_id uuid not null references public.profiles(id), license text not null,
  published_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.article_revisions (
  id uuid primary key default gen_random_uuid(), article_id uuid references public.articles(id),
  author_id uuid not null references public.profiles(id), title text not null, body text not null,
  license text not null, status public.submission_status not null default 'draft',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.dataset_entries (
  id uuid primary key default gen_random_uuid(), category public.dataset_category not null,
  term text not null check(length(trim(term)) > 0), translation text not null check(length(trim(translation)) > 0),
  notes text not null default '', source text not null check(length(trim(source)) > 0),
  license text not null check(license in ('CC0-1.0','CC-BY-4.0')), dialect text not null,
  contributor_id uuid not null references public.profiles(id), reviewer_id uuid not null references public.profiles(id),
  version integer not null default 1 check(version > 0), demonstration boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.dataset_entry_revisions (
  id uuid primary key default gen_random_uuid(), entry_id uuid references public.dataset_entries(id),
  author_id uuid not null references public.profiles(id), assigned_reviewer_id uuid references public.profiles(id),
  category public.dataset_category not null, term text not null check(length(trim(term)) > 0),
  translation text not null check(length(trim(translation)) > 0), notes text not null default '',
  source text not null check(length(trim(source)) > 0), license text not null check(license in ('CC0-1.0','CC-BY-4.0','Permission pending')),
  dialect text not null check(length(trim(dialect)) > 0), status public.submission_status not null default 'draft',
  version integer not null default 1 check(version > 0), demonstration boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(author_id is distinct from assigned_reviewer_id)
);
create table public.review_decisions (
  id uuid primary key default gen_random_uuid(), revision_id uuid not null references public.dataset_entry_revisions(id),
  reviewer_id uuid not null references public.profiles(id), decision public.submission_status not null,
  rationale text not null check(length(trim(rationale)) > 0), created_at timestamptz not null default now()
);
create table public.review_comments (
  id uuid primary key default gen_random_uuid(), revision_id uuid not null references public.dataset_entry_revisions(id),
  author_id uuid not null references public.profiles(id), body text not null check(length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create table public.linguistic_disputes (
  id uuid primary key default gen_random_uuid(), revision_id uuid not null references public.dataset_entry_revisions(id),
  opened_by uuid not null references public.profiles(id), position text not null check(length(trim(position)) > 0),
  resolution text, resolved_by uuid references public.profiles(id), created_at timestamptz not null default now(), resolved_at timestamptz,
  check((resolved_at is null and resolved_by is null and resolution is null) or (resolved_at is not null and resolved_by is not null and length(trim(resolution)) > 0))
);
create table public.dispute_evidence (
  id uuid primary key default gen_random_uuid(), dispute_id uuid not null references public.linguistic_disputes(id),
  author_id uuid not null references public.profiles(id), position text not null check(length(trim(position)) > 0),
  source text not null check(length(trim(source)) > 0), created_at timestamptz not null default now()
);
create table public.dataset_releases (
  id uuid primary key default gen_random_uuid(), version text unique not null,
  entry_ids uuid[] not null, published_by uuid not null references public.profiles(id),
  license_manifest jsonb not null, created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id),
  action text not null, record_id uuid, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index revisions_author on public.dataset_entry_revisions(author_id);
create index revisions_queue on public.dataset_entry_revisions(assigned_reviewer_id,status);
create index entries_category on public.dataset_entries(category);
create index decisions_revision on public.review_decisions(revision_id);
create index comments_revision on public.review_comments(revision_id);
create index disputes_revision on public.linguistic_disputes(revision_id);
create index evidence_dispute on public.dispute_evidence(dispute_id);
create index article_revisions_author on public.article_revisions(author_id);
create index applications_applicant on public.scholar_applications(applicant_id);
create index audit_actor on public.audit_logs(actor_id);

create function public.has_role(wanted public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = auth.uid() and role = wanted)
$$;
create function public.can_review(revision uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from dataset_entry_revisions r where r.id = revision and r.author_id <> auth.uid()
    and (has_role('editor') or (has_role('reviewer') and (r.assigned_reviewer_id = auth.uid() or (r.assigned_reviewer_id is null and r.status = 'submitted')))))
$$;
create function public.can_read_revision(revision uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from dataset_entry_revisions r where r.id = revision and (r.author_id = auth.uid() or can_review(r.id)))
$$;

do $$ declare t text; begin
  foreach t in array array['profiles','user_roles','scholar_applications','articles','article_revisions','dataset_entries','dataset_entry_revisions','review_decisions','review_comments','linguistic_disputes','dispute_evidence','dataset_releases','audit_logs'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
create policy profiles_own_read on profiles for select to authenticated using(id = auth.uid() or has_role('technical_admin'));
create policy profiles_own_insert on profiles for insert to authenticated with check(id = auth.uid());
create policy profiles_own_update on profiles for update to authenticated using(id = auth.uid()) with check(id = auth.uid());
create policy roles_read on user_roles for select to authenticated using(user_id = auth.uid() or has_role('technical_admin'));
-- No role write policy: grants require an audited, trusted database operation.
create policy applications_own on scholar_applications for select to authenticated using(applicant_id = auth.uid() or has_role('editor'));
create policy applications_insert on scholar_applications for insert to authenticated with check(applicant_id = auth.uid() and status = 'pending');
create policy articles_public on articles for select using(true);
create policy article_drafts_read on article_revisions for select to authenticated using(author_id = auth.uid());
create policy article_drafts_insert on article_revisions for insert to authenticated with check(author_id = auth.uid() and status = 'draft');
create policy entries_public on dataset_entries for select using(true);
create policy releases_public on dataset_releases for select using(true);
create policy revisions_read on dataset_entry_revisions for select to authenticated using(author_id = auth.uid() or can_review(id));
create policy revisions_insert on dataset_entry_revisions for insert to authenticated with check(author_id = auth.uid() and status = 'draft' and entry_id is null and assigned_reviewer_id is null and version = 1 and not demonstration);
create policy decisions_read on review_decisions for select to authenticated using(can_read_revision(revision_id));
create policy comments_read on review_comments for select to authenticated using(can_read_revision(revision_id));
create policy comments_insert on review_comments for insert to authenticated with check(author_id = auth.uid() and can_read_revision(revision_id));
create policy disputes_read on linguistic_disputes for select to authenticated using(can_read_revision(revision_id));
create policy evidence_read on dispute_evidence for select to authenticated using(exists(select 1 from linguistic_disputes d where d.id = dispute_id and can_read_revision(d.revision_id)));
create policy evidence_insert on dispute_evidence for insert to authenticated with check(author_id = auth.uid() and exists(select 1 from linguistic_disputes d where d.id = dispute_id and d.resolved_at is null and can_read_revision(d.revision_id)));
create policy audit_admin_read on audit_logs for select to authenticated using(has_role('technical_admin'));

create function public.submit_revision(revision uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update dataset_entry_revisions set status = 'submitted', updated_at = now()
    where id = revision and author_id = auth.uid() and status in ('draft','changes_requested');
  if not found then raise exception 'Submission not permitted'; end if;
  insert into audit_logs(actor_id,action,record_id) values(auth.uid(),'submitted',revision);
end $$;

create function public.review_revision(revision uuid, next_status public.submission_status, reason text) returns void
language plpgsql security definer set search_path = public as $$
declare r dataset_entry_revisions; reviewer uuid; published_id uuid;
begin
  if auth.uid() is null or length(trim(reason)) = 0 then raise exception 'Identity and rationale required'; end if;
  select * into r from dataset_entry_revisions where id = revision for update;
  if not found or r.author_id = auth.uid() then raise exception 'Independent review required'; end if;
  if not (has_role('editor') or (has_role('reviewer') and (r.assigned_reviewer_id = auth.uid() or (r.assigned_reviewer_id is null and r.status = 'submitted')))) then raise exception 'Editorial role required'; end if;
  if not ((r.status = 'submitted' and next_status = 'under_review') or
    (r.status = 'under_review' and next_status in ('approved','changes_requested','rejected','disputed')) or
    (r.status = 'approved' and next_status = 'published' and has_role('editor'))) then raise exception 'Invalid transition'; end if;
  if next_status = 'published' then
    if r.license not in ('CC0-1.0','CC-BY-4.0') then raise exception 'Redistribution permission required'; end if;
    select reviewer_id into reviewer from review_decisions where revision_id = revision and decision = 'approved' order by created_at desc limit 1;
    if reviewer is null then raise exception 'Approval required'; end if;
    -- Published versions are inserted, never overwritten; entry_id retains ancestry.
    insert into dataset_entries(category,term,translation,notes,source,license,dialect,contributor_id,reviewer_id,version,demonstration)
      values(r.category,r.term,r.translation,r.notes,r.source,r.license,r.dialect,r.author_id,reviewer,r.version,r.demonstration) returning id into published_id;
  end if;
  update dataset_entry_revisions set status = next_status, assigned_reviewer_id = coalesce(assigned_reviewer_id,auth.uid()), updated_at = now() where id = revision;
  insert into review_decisions(revision_id,reviewer_id,decision,rationale) values(revision,auth.uid(),next_status,reason);
  if next_status = 'disputed' then insert into linguistic_disputes(revision_id,opened_by,position) values(revision,auth.uid(),reason); end if;
  insert into audit_logs(actor_id,action,record_id,details) values(auth.uid(),next_status::text,revision,jsonb_build_object('published_id',published_id));
end $$;
create function public.resolve_dispute(dispute uuid, explanation text) returns void
language plpgsql security definer set search_path = public as $$
declare r_id uuid;
begin
  if not has_role('editor') or length(trim(explanation)) = 0 then raise exception 'Editor and explanation required'; end if;
  select revision_id into r_id from linguistic_disputes where id = dispute and resolved_at is null for update;
  if r_id is null or not can_review(r_id) then raise exception 'Resolution not permitted'; end if;
  perform 1 from dataset_entry_revisions where id = r_id and status = 'disputed' for update;
  if not found then raise exception 'Revision is not disputed'; end if;
  update linguistic_disputes set resolution = explanation, resolved_by = auth.uid(), resolved_at = now() where id = dispute;
  update dataset_entry_revisions set status = 'under_review', updated_at = now() where id = r_id;
  insert into review_decisions(revision_id,reviewer_id,decision,rationale) values(r_id,auth.uid(),'under_review',explanation);
  insert into audit_logs(actor_id,action,record_id) values(auth.uid(),'dispute_resolved',dispute);
end $$;
revoke execute on function public.submit_revision(uuid), public.review_revision(uuid,public.submission_status,text), public.resolve_dispute(uuid,text) from public, anon;
grant execute on function public.submit_revision(uuid), public.review_revision(uuid,public.submission_status,text), public.resolve_dispute(uuid,text) to authenticated;
