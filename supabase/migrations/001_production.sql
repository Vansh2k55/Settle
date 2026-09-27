create extension if not exists pgcrypto;

create table if not exists public.mediation_sessions (
  id uuid primary key,
  code text unique not null,
  title text not null,
  category text not null,
  status text not null,
  jurisdiction text not null default 'IN',
  state_code text,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_members (
  session_id uuid references public.mediation_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  party_role text not null check (party_role in ('partyA','partyB','mediator')),
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.mediation_sessions(id) on delete cascade,
  email text not null,
  role text not null check (role in ('partyA','partyB','mediator')),
  token_hash text unique not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mediator_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.mediation_sessions(id) on delete cascade,
  requested_by uuid references auth.users(id),
  assigned_to uuid references auth.users(id),
  reason text not null,
  priority text not null default 'normal',
  status text not null default 'queued',
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.signature_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.mediation_sessions(id) on delete cascade,
  user_id uuid references auth.users(id),
  proposal_id uuid not null,
  typed_name text not null,
  consent_text text not null,
  signature text not null,
  signed_at timestamptz not null,
  audit jsonb not null,
  unique(session_id, user_id, proposal_id)
);

alter table public.mediation_sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.invitations enable row level security;
alter table public.mediator_reviews enable row level security;
alter table public.signature_records enable row level security;

create policy "members read sessions" on public.mediation_sessions for select using (
  exists(select 1 from public.session_members m where m.session_id=id and m.user_id=auth.uid())
);
create policy "members read membership" on public.session_members for select using (
  user_id=auth.uid() or exists(select 1 from public.session_members m where m.session_id=session_members.session_id and m.user_id=auth.uid())
);
create policy "users read own invitations" on public.invitations for select using (
  lower(email)=lower(coalesce(auth.jwt()->>'email',''))
);
create policy "participants request review" on public.mediator_reviews for insert with check (
  exists(select 1 from public.session_members m where m.session_id=session_id and m.user_id=auth.uid())
);
create policy "reviewers access assigned reviews" on public.mediator_reviews for select using (
  requested_by=auth.uid() or assigned_to=auth.uid()
);
create policy "users read own signatures" on public.signature_records for select using (
  user_id=auth.uid()
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('evidence','evidence',false,10485760,array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=10485760;

create policy "members upload evidence" on storage.objects for insert to authenticated with check (
  bucket_id='evidence' and exists(
    select 1 from public.session_members m
    where m.user_id=auth.uid() and m.session_id::text=(storage.foldername(name))[1]
  )
);
create policy "members read evidence" on storage.objects for select to authenticated using (
  bucket_id='evidence' and exists(
    select 1 from public.session_members m
    where m.user_id=auth.uid() and m.session_id::text=(storage.foldername(name))[1]
  )
);

alter publication supabase_realtime add table public.mediation_sessions;
alter publication supabase_realtime add table public.mediator_reviews;
