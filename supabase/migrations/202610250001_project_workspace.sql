-- Starter project work, separate from language publication and access permissions.
create table public.project_tasks (
 id text primary key, title text not null, track text not null check(track in ('engineering','design','language','data','community')),
 scope text not null, acceptance text not null, guidance text not null, dependencies text[] not null default '{}',
 status text not null default 'open' check(status in ('open','claimed','in_progress','review','completed')),
 owner_id uuid references public.profiles(id), reviewer_id uuid references public.profiles(id),
 evidence_url text not null default '', note text not null default '', version integer not null default 1,
 updated_at timestamptz not null default now(), check(reviewer_id is null or owner_id is distinct from reviewer_id),
 check((status='open' and owner_id is null) or (status<>'open' and owner_id is not null))
);
create table public.workspace_preferences (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 area text not null check(area in ('engineering','design','language','data','community'))
);
alter table public.project_tasks enable row level security;
alter table public.workspace_preferences enable row level security;
revoke all on public.project_tasks,public.workspace_preferences from anon,authenticated;
grant select on public.project_tasks,public.workspace_preferences to authenticated;
create policy project_tasks_read on public.project_tasks for select to authenticated using(true);
create policy workspace_preferences_own on public.workspace_preferences for select to authenticated using(user_id=auth.uid());
insert into public.project_tasks(id,title,track,scope,acceptance,guidance,dependencies) values('T01','Reproduce the contributor setup','engineering','Document a clean local install and a restricted test environment. Keep production credentials out of local onboarding.','A new developer follows the instructions; typecheck, lint and unit tests pass; missing-service states are documented; no secrets appear in logs or Git.','None',array[]::text[]);
insert into public.project_tasks(id,title,track,scope,acceptance,guidance,dependencies) values('T02','Review transcription and dialect conventions','language','Review the proposed speech standard with Somali language specialists. Decide spelling, code-switching, uncertain segments and self-described dialect labels.','Record decisions and unresolved disagreements; provide at least ten invented transcript edge cases; appoint an independent language reviewer before approval.','None',array[]::text[]);
insert into public.project_tasks(id,title,track,scope,acceptance,guidance,dependencies) values('T03','Review consent and participant information','community','Adapt the consent draft with the responsible organization and a qualified privacy reviewer. Identify contact, retention, permitted purposes and downstream-release limits.','Name the data steward and support channel; review the Somali explanation; separate ASR, TTS and public-release choices; document withdrawal handling; no recordings collected yet.','T02 draft',array[]::text[]);
insert into public.project_tasks(id,title,track,scope,acceptance,guidance,dependencies) values('T04','Design the recording and review journey','design','Create a phone-first design covering information, consent, record, listen, retry, transcript and submission, plus independent review.','Show keyboard/focus behavior, text alternatives, errors and deletion requests; test the prototype with three volunteers using no recorded voice; link the design and findings.','T02 and T03 drafts',array[]::text[]);
insert into public.project_tasks(id,title,track,scope,acceptance,guidance,dependencies) values('T05','Prototype accessible recording controls','engineering','Build an isolated prototype with record, stop, playback, discard and transcript fields. Use synthetic local audio and explicit microphone permission.','Keyboard controls and accessible names work; unsupported browsers and denied permission are handled; audio never uploads automatically; document codec/sample-rate inspection and limitations.','T04',array['T04']::text[]);
insert into public.project_tasks(id,title,track,scope,acceptance,guidance,dependencies) values('T06','Design private audio ingestion','engineering','Propose private object storage, short-lived authorized upload access, file limits, content inspection, checksums and consent linkage. Do not enable public collection.','Document RLS/access rules, quotas, orphan cleanup, review states, retention and backup/restore; tests cover unauthorized reads, uploads and public URL exposure in an isolated environment.','T03 and speech schema review',array['T03']::text[]);
insert into public.project_tasks(id,title,track,scope,acceptance,guidance,dependencies) values('T07','Implement a speech-manifest validator','data','Use the draft JSON Schema for structure and add checks against actual audio and private consent records. Keep the existing text validator unchanged.','Detect duplicate IDs, wrong hashes/duration/sample rate, missing rights, author-as-reviewer, unsafe paths, withdrawn consent and split leakage; synthetic pass/fail fixtures; no real voice in CI.','T02 and T03',array['T02','T03']::text[]);
insert into public.project_tasks(id,title,track,scope,acceptance,guidance,dependencies) values('T08','Run a small collection rehearsal','language','Rehearse with consenting adult participants and approved prompts only after storage, consent and named owners are ready. Target two speakers first, before scaling.','Verify playback, transcript review, consent linkage, discard/withdrawal and access controls; log issues without identities; obtain go/no-go from data and language owners.','T02, T03, T04, T06 and T07 approved',array['T02','T03','T04','T06','T07']::text[]);
insert into public.project_tasks(id,title,track,scope,acceptance,guidance,dependencies) values('T09','Reproduce the speech baseline','data','Follow the model evaluation plan. Pin model revisions and environment; compare ASR candidates on identical approved inputs. Keep restricted models research-only.','Publish configuration and aggregate results with WER/CER, subgroup counts, timing, hardware and costs; a second contributor reproduces a subset; no invented quality claims or raw private data.','Authorized evaluation data and T07',array['T07']::text[]);
insert into public.project_tasks(id,title,track,scope,acceptance,guidance,dependencies) values('T10','Prepare pilot funding and progress brief','community','Turn the budget into a clear milestone-based sponsor brief, with current facts separated from planned outputs.','Show cash and volunteer assumptions, funding gap, receipt owner and monthly report; sponsor recognition confers no editorial authority; no messages, fundraising account or purchases without explicit authorization.','Budget and owners reviewed',array[]::text[]);

create function public.project_board() returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 return jsonb_build_object('area',(select area from workspace_preferences where user_id=auth.uid()),
 'tasks',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('owner_name',p.display_name,'reviewer_name',v.display_name) order by t.id)
 from project_tasks t left join profiles p on p.id=t.owner_id left join profiles v on v.id=t.reviewer_id),'[]'::jsonb));
end $$;
create function public.set_workspace_area(selected_area text) returns void
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from profiles where id=auth.uid()) then raise exception 'Complete your profile first'; end if;
 insert into workspace_preferences(user_id,area) values(auth.uid(),selected_area) on conflict(user_id) do update set area=excluded.area;
end $$;
create function public.transition_project_task(task_id text, expected_version integer, action text, evidence text default '', explanation text default '') returns void
language plpgsql security definer set search_path=public as $$
declare t project_tasks; next_status text; authorized_reviewer boolean;
begin
 if auth.uid() is null or not exists(select 1 from profiles where id=auth.uid()) then raise exception 'Complete your profile first'; end if;
 select * into t from project_tasks where id=task_id for update;
 if not found or t.version<>expected_version then raise exception 'Task changed; refresh and try again'; end if;
 if length(evidence)>2000 or length(explanation)>2000 then raise exception 'Text too long'; end if;
 if evidence<>'' and evidence !~ '^https?://[^[:space:]]+$' then raise exception 'Use an HTTP or HTTPS evidence link'; end if;
 authorized_reviewer := t.owner_id is distinct from auth.uid() and
   case when t.track='language' then has_role('reviewer') or has_role('editor') else has_role('technical_admin') end;
 if action='claim' and t.status='open' then
   if exists(select 1 from project_tasks d where d.id=any(t.dependencies) and d.status<>'completed') then raise exception 'Complete task dependencies first'; end if;
   next_status:='claimed';
 elsif action='start' and t.status='claimed' and t.owner_id=auth.uid() then next_status:='in_progress';
 elsif action='submit' and t.status='in_progress' and t.owner_id=auth.uid() and length(trim(evidence))>0 and length(trim(explanation))>0 then next_status:='review';
 elsif action='release' and t.status in ('claimed','in_progress') and t.owner_id=auth.uid() then next_status:='open';
 elsif action='complete' and t.status='review' and authorized_reviewer and length(trim(explanation))>0 then next_status:='completed';
 elsif action='request_changes' and t.status='review' and authorized_reviewer and length(trim(explanation))>0 then next_status:='in_progress';
 else raise exception 'Task transition not permitted'; end if;
 update project_tasks set status=next_status,
 owner_id=case when action='claim' then auth.uid() when action='release' then null else owner_id end,
 reviewer_id=case when action='complete' then auth.uid() else null end,
 evidence_url=case when action='submit' then evidence when action='release' then '' else evidence_url end,
 note=case when action='release' then '' when action in ('submit','complete','request_changes') then trim(explanation) else note end,
 version=version+1,updated_at=now() where id=task_id;
 insert into audit_logs(actor_id,action,details) values(auth.uid(),'project_task_'||action,jsonb_build_object('task_id',task_id,'from',t.status,'to',next_status,'evidence',evidence,'explanation',explanation));
end $$;
revoke all on function public.project_board() from public;
revoke all on function public.set_workspace_area(text) from public;
revoke all on function public.transition_project_task(text,integer,text,text,text) from public;
grant execute on function public.project_board(),public.set_workspace_area(text),public.transition_project_task(text,integer,text,text,text) to authenticated;
