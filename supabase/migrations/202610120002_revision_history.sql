-- Audit snapshots are immutable to all client roles.
create function public.record_revision_snapshot() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs(actor_id,action,record_id,details)
    values(auth.uid(), case when TG_OP = 'INSERT' then 'revision_created' else 'revision_snapshot' end,
      new.id, jsonb_build_object('before',case when TG_OP = 'UPDATE' then to_jsonb(old) else null end,'after',to_jsonb(new)));
  return new;
end $$;
create trigger revision_snapshot after insert or update on public.dataset_entry_revisions
  for each row execute function public.record_revision_snapshot();
create trigger article_snapshot after insert or update on public.article_revisions
  for each row execute function public.record_revision_snapshot();

create function public.save_revision(revision uuid, content jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  update dataset_entry_revisions set
    category = (content->>'category')::dataset_category, term = content->>'term',
    translation = content->>'translation', notes = coalesce(content->>'notes',''),
    source = content->>'source', license = content->>'license', dialect = content->>'dialect', updated_at = now()
    where id = revision and author_id = auth.uid() and status in ('draft','changes_requested');
  if not found then raise exception 'Editable own revision required'; end if;
end $$;
create function public.propose_correction(published_entry uuid, content jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare original dataset_entries; proposed uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into original from dataset_entries where id = published_entry;
  if not found then raise exception 'Published entry required'; end if;
  insert into dataset_entry_revisions(entry_id,author_id,category,term,translation,notes,source,license,dialect,version)
    values(original.id,auth.uid(),(content->>'category')::dataset_category,content->>'term',content->>'translation',
      coalesce(content->>'notes',''),content->>'source',content->>'license',content->>'dialect',original.version + 1)
    returning id into proposed;
  return proposed;
end $$;
revoke execute on function public.save_revision(uuid,jsonb), public.propose_correction(uuid,jsonb) from public, anon;
grant execute on function public.save_revision(uuid,jsonb), public.propose_correction(uuid,jsonb) to authenticated;
revoke execute on function public.record_revision_snapshot() from public, anon, authenticated;
create policy audit_revision_history on audit_logs for select to authenticated
  using(action in ('revision_created','revision_snapshot') and can_read_revision(record_id));
