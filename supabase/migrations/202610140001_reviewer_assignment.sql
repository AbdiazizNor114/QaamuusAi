-- Assign queue items without changing review decisions or granting member roles.
create function public.assign_dataset_reviewer(revision uuid, reviewer uuid, reason text) returns void
language plpgsql security definer set search_path = public as $$
declare r dataset_entry_revisions;
begin
  if auth.uid() is null or not has_role('editor') or reason is null or length(trim(reason)) not between 1 and 10000 then
    raise exception 'Editor and rationale required';
  end if;
  -- Serialize eligibility checks with controlled member-role changes.
  perform pg_advisory_xact_lock(130001);
  select * into r from dataset_entry_revisions where id = revision for update;
  if not found or r.status <> 'submitted' then raise exception 'Submitted revision required'; end if;
  if reviewer is null or reviewer = r.author_id or not exists(
    select 1 from user_roles where user_id = reviewer and role in ('reviewer','editor')
  ) then raise exception 'Independent qualified reviewer required'; end if;
  if r.assigned_reviewer_id is not distinct from reviewer then raise exception 'No assignment change'; end if;
  update dataset_entry_revisions set assigned_reviewer_id = reviewer, updated_at = now() where id = revision;
  insert into audit_logs(actor_id,action,record_id,details)
    values(auth.uid(),'reviewer_assigned',revision,jsonb_build_object(
      'previous_reviewer',r.assigned_reviewer_id,'reviewer',reviewer,'rationale',trim(reason)));
end $$;
revoke execute on function public.assign_dataset_reviewer(uuid,uuid,text) from public, anon;
grant execute on function public.assign_dataset_reviewer(uuid,uuid,text) to authenticated;
