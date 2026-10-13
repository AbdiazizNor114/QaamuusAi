-- Community writes are RPC-only; no privileged account is bootstrapped here.
alter table public.scholar_applications add column expertise text not null default '',
  add column decision text, add column decided_by uuid references public.profiles(id), add column decided_at timestamptz;
create unique index applications_one_pending on public.scholar_applications(applicant_id) where status = 'pending';
drop policy applications_insert on public.scholar_applications;

create function public.change_member_role(member uuid, wanted public.app_role, remove boolean, reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or member = auth.uid() or reason is null or length(trim(reason)) not between 1 and 10000 then raise exception 'Independent authority and rationale required'; end if;
  perform pg_advisory_xact_lock(130001);
  if (wanted in ('reviewer','editor') and not has_role('editor')) or
     (wanted in ('contributor','technical_admin') and not has_role('technical_admin')) then raise exception 'Appropriate role authority required'; end if;
  perform 1 from profiles where id = member;
  if not found then raise exception 'Member profile required'; end if;
  if remove then
    if wanted in ('editor','technical_admin') and not exists(select 1 from user_roles where role = wanted and user_id <> member) then raise exception 'Last authority cannot be revoked'; end if;
    delete from user_roles where user_id = member and role = wanted;
  else
    insert into user_roles(user_id,role,granted_by) values(member,wanted,auth.uid()) on conflict do nothing;
  end if;
  if not found then raise exception 'No role change'; end if;
  insert into audit_logs(actor_id,action,record_id,details) values(auth.uid(),case when remove then 'role_revoked' else 'role_granted' end,member,jsonb_build_object('role',wanted,'rationale',reason));
end $$;
create function public.apply_scholar(expertise text, rationale text) returns uuid
language plpgsql security definer set search_path = public as $$
declare created uuid;
begin
  if auth.uid() is null or expertise is null or length(trim(expertise)) not between 1 and 10000 or rationale is null or length(trim(rationale)) not between 1 and 10000 then raise exception 'Expertise and rationale required'; end if;
  insert into scholar_applications(applicant_id,expertise,rationale) values(auth.uid(),expertise,rationale) returning id into created;
  insert into audit_logs(actor_id,action,record_id,details) values(auth.uid(),'scholar_applied',created,jsonb_build_object('rationale',rationale));
  return created;
end $$;
create function public.decide_scholar(application uuid, accept boolean, reason text) returns void
language plpgsql security definer set search_path = public as $$
declare applicant uuid;
begin
  perform pg_advisory_xact_lock(130001);
  if not has_role('editor') or reason is null or length(trim(reason)) not between 1 and 10000 then raise exception 'Editor and rationale required'; end if;
  select applicant_id into applicant from scholar_applications where id = application and status = 'pending' for update;
  if applicant is null or applicant = auth.uid() then raise exception 'Independent pending application required'; end if;
  if accept and not exists(select 1 from user_roles where user_id = applicant and role = 'reviewer') then perform change_member_role(applicant,'reviewer',false,reason); end if;
  update scholar_applications set status = case when accept then 'accepted' else 'declined' end, decision = reason, decided_by = auth.uid(), decided_at = now() where id = application;
  insert into audit_logs(actor_id,action,record_id,details) values(auth.uid(),case when accept then 'scholar_accepted' else 'scholar_declined' end,application,jsonb_build_object('applicant',applicant,'rationale',reason));
end $$;
create function public.community_members() returns table(id uuid, display_name text, roles public.app_role[])
language sql stable security definer set search_path = public as $$
  select p.id,p.display_name,array(select r.role from user_roles r where r.user_id=p.id order by r.role)
  from profiles p where has_role('editor') or has_role('technical_admin') order by p.created_at
$$;
create policy audit_editor_community on public.audit_logs for select to authenticated using(
  has_role('editor') and action in ('role_granted','role_revoked','scholar_applied','scholar_accepted','scholar_declined','release_created')
);

alter table public.articles add column summary text not null default '', add column source text not null default '',
  add column reviewer_id uuid references public.profiles(id), add column parent_id uuid references public.articles(id), add column version integer not null default 1 check(version>0);
alter table public.article_revisions add column summary text not null default '', add column source text not null default '',
  add column version integer not null default 1 check(version>0), add column assigned_reviewer_id uuid references public.profiles(id),
  add column approved_by uuid references public.profiles(id), add constraint article_independent_reviewer check(author_id is distinct from assigned_reviewer_id),
  add constraint article_independent_approval check(author_id is distinct from approved_by);
drop policy article_drafts_insert on public.article_revisions;
drop policy article_drafts_read on public.article_revisions;
create function public.can_review_article(revision uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from article_revisions r where r.id=revision and r.author_id<>auth.uid() and
    (has_role('editor') or (has_role('reviewer') and (r.assigned_reviewer_id=auth.uid() or (r.assigned_reviewer_id is null and r.status='submitted')))))
$$;
create function public.can_read_article_revision(revision uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from article_revisions r where r.id=revision and (r.author_id=auth.uid() or can_review_article(r.id)))
$$;
create policy article_revision_read on public.article_revisions for select to authenticated using(can_read_article_revision(id));
create policy audit_article_history on public.audit_logs for select to authenticated using(can_read_article_revision(record_id));
create table public.article_review_decisions (
  id uuid primary key default gen_random_uuid(), revision_id uuid not null references public.article_revisions(id),
  reviewer_id uuid not null references public.profiles(id), decision public.submission_status not null,
  rationale text not null, created_at timestamptz not null default now()
);
alter table public.article_review_decisions enable row level security;
create policy article_decisions_read on public.article_review_decisions for select to authenticated using(can_read_article_revision(revision_id));

create function public.save_article_proposal(content jsonb, revision uuid default null, original uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare saved uuid; parent articles; r article_revisions;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if content->>'license' is null or content->>'license' not in ('CC0-1.0','CC-BY-4.0','Permission pending') or
     coalesce(length(trim(content->>'title')),0) not between 1 and 10000 or
     coalesce(length(trim(content->>'summary')),0) not between 1 and 10000 or
     coalesce(length(trim(content->>'body')),0) not between 1 and 10000 or
     coalesce(length(trim(content->>'source')),0) not between 1 and 10000 then raise exception 'Complete article content required'; end if;
  if revision is not null then
    select * into r from article_revisions where id=revision for update;
    if not found or r.author_id<>auth.uid() or r.status not in ('draft','changes_requested') or original is not null then raise exception 'Editable own proposal required'; end if;
    update article_revisions set title=content->>'title',summary=content->>'summary',body=content->>'body',source=content->>'source',license=content->>'license',updated_at=now(),approved_by=null where id=revision;
    saved=revision;
  else
    if original is not null then
      select * into parent from articles where id=original;
      if not found then raise exception 'Published original required'; end if;
    end if;
    insert into article_revisions(article_id,author_id,title,summary,body,source,license,version)
    values(original,auth.uid(),content->>'title',content->>'summary',content->>'body',content->>'source',content->>'license',coalesce(parent.version+1,1)) returning id into saved;
  end if;
  return saved;
end $$;
create function public.transition_article(revision uuid, next_status public.submission_status, reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare r article_revisions; published uuid;
begin
  if auth.uid() is null or reason is null or length(trim(reason)) not between 1 and 10000 then raise exception 'Identity and rationale required'; end if;
  select * into r from article_revisions where id=revision for update;
  if not found then raise exception 'Article proposal required'; end if;
  if next_status='submitted' then
    if r.author_id<>auth.uid() or r.status not in ('draft','changes_requested') then raise exception 'Own editable proposal required'; end if;
  else
    if not can_review_article(revision) then raise exception 'Independent editorial authority required'; end if;
    if not ((r.status='submitted' and next_status='under_review') or
      (r.status='under_review' and next_status in ('approved','changes_requested','rejected','disputed')) or
      (r.status='approved' and next_status='published' and has_role('editor')) or
      (r.status='disputed' and next_status='under_review' and has_role('editor'))) then raise exception 'Invalid article transition'; end if;
  end if;
  if next_status='published' then
    if r.approved_by is null or r.approved_by=r.author_id or r.license not in ('CC0-1.0','CC-BY-4.0') then raise exception 'Independent approval and redistribution permission required'; end if;
    insert into articles(title,summary,body,source,author_id,reviewer_id,license,parent_id,version)
      values(r.title,r.summary,r.body,r.source,r.author_id,r.approved_by,r.license,r.article_id,r.version) returning id into published;
  end if;
  update article_revisions set status=next_status,updated_at=now(),
    assigned_reviewer_id=case when next_status='submitted' then assigned_reviewer_id else coalesce(assigned_reviewer_id,auth.uid()) end,
    approved_by=case when next_status='approved' then auth.uid() when next_status in ('changes_requested','disputed','submitted') then null else approved_by end where id=revision;
  insert into article_review_decisions(revision_id,reviewer_id,decision,rationale) values(revision,auth.uid(),next_status,reason);
  insert into audit_logs(actor_id,action,record_id,details) values(auth.uid(),'article_'||next_status::text,revision,jsonb_build_object('rationale',reason,'published_id',published));
  return published;
end $$;

alter table public.dataset_releases add column notes text not null default '', add column snapshot jsonb not null default '[]';
create function public.publish_dataset_release(release_version text, entries uuid[], notes text) returns uuid
language plpgsql security definer set search_path = public as $$
declare frozen jsonb; manifest jsonb; created uuid; selected_count integer;
begin
  if not has_role('editor') or notes is null or length(trim(notes)) not between 1 and 10000 then raise exception 'Editor and release notes required'; end if;
  if release_version is null or release_version !~ '^[0-9]+\.[0-9]+\.[0-9]+$' or cardinality(entries) is null or cardinality(entries) not between 1 and 500 then raise exception 'Version and selected entries required'; end if;
  select count(*),jsonb_agg((to_jsonb(e)-'contributor_id'-'reviewer_id')||jsonb_build_object('contributor',e.contributor_id,'reviewer',e.reviewer_id,'status','published') order by e.id),
    jsonb_agg(jsonb_build_object('id',e.id,'version',e.version,'license',e.license,'source',e.source,'attribution',e.contributor_id) order by e.id)
  into selected_count,frozen,manifest from dataset_entries e where e.id=any(entries) and e.license in ('CC0-1.0','CC-BY-4.0') and e.reviewer_id is not null;
  if selected_count<>cardinality(entries) then raise exception 'Only unique published redistributable entries permitted'; end if;
  insert into dataset_releases(version,entry_ids,published_by,license_manifest,notes,snapshot) values(release_version,entries,auth.uid(),manifest,notes,frozen) returning id into created;
  insert into audit_logs(actor_id,action,record_id,details) values(auth.uid(),'release_created',created,jsonb_build_object('version',release_version,'rationale',notes,'entries',entries));
  return created;
end $$;
revoke execute on function public.change_member_role(uuid,public.app_role,boolean,text),public.apply_scholar(text,text),public.decide_scholar(uuid,boolean,text),public.community_members(),public.save_article_proposal(jsonb,uuid,uuid),public.transition_article(uuid,public.submission_status,text),public.publish_dataset_release(text,uuid[],text) from public,anon;
grant execute on function public.change_member_role(uuid,public.app_role,boolean,text),public.apply_scholar(text,text),public.decide_scholar(uuid,boolean,text),public.community_members(),public.save_article_proposal(jsonb,uuid,uuid),public.transition_article(uuid,public.submission_status,text),public.publish_dataset_release(text,uuid[],text) to authenticated;
