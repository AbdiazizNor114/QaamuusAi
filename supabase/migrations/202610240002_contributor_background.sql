-- Keep existing applications readable while requiring a background on new requests.
alter table public.contributor_requests
  add column study text check (length(trim(study)) between 1 and 200),
  add column professional_role text check (professional_role in (
    'frontend','backend','fullstack','devops','data_science','ml','design',
    'linguist','grammar_teacher','language_teacher','translator','writer','editor','researcher','student','other'
  ));
-- Remove the older public entry point so background validation cannot be bypassed.
drop function public.request_contributor_access(text,text);
create function public.request_contributor_access(applicant_name text, applicant_email text, applicant_study text, applicant_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if applicant_name is null or length(trim(applicant_name)) not between 1 and 120
    or applicant_email is null or length(applicant_email) > 254
    or applicant_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or applicant_study is null or length(trim(applicant_study)) not between 1 and 200
    or applicant_role is null or applicant_role not in (
      'frontend','backend','fullstack','devops','data_science','ml','design',
      'linguist','grammar_teacher','language_teacher','translator','writer','editor','researcher','student','other'
    ) then raise exception 'Invalid application'; end if;
  insert into contributor_requests(name,email,study,professional_role)
    values(trim(applicant_name),lower(trim(applicant_email)),trim(applicant_study),applicant_role)
    on conflict(email) do nothing;
end $$;
revoke all on function public.request_contributor_access(text,text,text,text) from public;
grant execute on function public.request_contributor_access(text,text,text,text) to anon,authenticated;
