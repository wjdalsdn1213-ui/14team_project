create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('patient', 'therapist')),
  name text not null,
  email text not null unique,
  avatar_initials text,
  therapist_id uuid null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_profiles (
  patient_id uuid primary key references public.profiles (id) on delete cascade,
  diagnosis text not null,
  injury_date date not null,
  surgery_date date null,
  rehab_status text not null check (rehab_status in ('acute', 'subacute', 'chronic', 'maintenance')),
  status_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  body_part text not null check (body_part in ('shoulder', 'knee', 'back', 'hip', 'ankle')),
  default_reps integer not null check (default_reps > 0),
  default_sets integer not null check (default_sets > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  therapist_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date date null,
  notes text null,
  status text not null default 'active' check (status in ('draft', 'active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prescription_exercises (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  target_reps integer not null check (target_reps > 0),
  target_sets integer not null check (target_sets > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (prescription_id, exercise_id)
);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  prescription_id uuid null references public.prescriptions (id) on delete set null,
  log_date date not null,
  actual_reps integer not null check (actual_reps > 0),
  actual_sets integer not null check (actual_sets > 0),
  pain_score integer not null check (pain_score between 0 and 10),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  memo text null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  sent_at timestamptz not null default now(),
  read_at timestamptz null
);

create table if not exists public.therapist_comments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  therapist_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_therapist_id on public.profiles (therapist_id);
create index if not exists idx_prescriptions_patient_id on public.prescriptions (patient_id);
create index if not exists idx_prescriptions_therapist_id on public.prescriptions (therapist_id);
create index if not exists idx_logs_patient_date on public.exercise_logs (patient_id, log_date desc);
create index if not exists idx_messages_sender_receiver_sent_at on public.messages (sender_id, receiver_id, sent_at desc);
create index if not exists idx_comments_patient_created_at on public.therapist_comments (patient_id, created_at desc);

-- 1. 치료사 ID 가져오기 함수 (안전하게 RLS 우회)
create or replace function public.get_my_therapist_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select therapist_id from public.profiles where id = auth.uid();
$$;

-- 2. 업데이트 시간 자동 변경 함수
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_patient_profiles_updated_at on public.patient_profiles;
create trigger set_patient_profiles_updated_at
before update on public.patient_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_prescriptions_updated_at on public.prescriptions;
create trigger set_prescriptions_updated_at
before update on public.prescriptions
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.patient_profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.prescriptions enable row level security;
alter table public.prescription_exercises enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.messages enable row level security;
alter table public.therapist_comments enable row level security;

create policy "profiles self read"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles self insert"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
  and role = 'patient'
  and therapist_id is null
  and email = auth.email()
);

create policy "profiles therapist can read assigned patients"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()             -- 1. 내 프로필이거나
  or therapist_id = auth.uid() -- 2. 내 환자의 프로필이거나
  or id = public.get_my_therapist_id() -- 3. 내 치료사의 프로필인 경우 (함수 사용으로 루프 해결!)
);

create policy "patient profiles self or assigned therapist read"
on public.patient_profiles
for select
to authenticated
using (
  patient_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = patient_id
      and p.therapist_id = auth.uid()
  )
);

create policy "patient profiles self insert"
on public.patient_profiles
for insert
to authenticated
with check (patient_id = auth.uid());

create policy "exercises authenticated read"
on public.exercises
for select
to authenticated
using (is_active = true);

create policy "prescriptions patient or assigned therapist read"
on public.prescriptions
for select
to authenticated
using (
  patient_id = auth.uid()
  or therapist_id = auth.uid()
);

create policy "prescriptions therapist insert"
on public.prescriptions
for insert
to authenticated
with check (
  therapist_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = patient_id
      and p.therapist_id = auth.uid()
  )
);

create policy "prescription exercises patient or assigned therapist read"
on public.prescription_exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.prescriptions pr
    where pr.id = prescription_id
      and (pr.patient_id = auth.uid() or pr.therapist_id = auth.uid())
  )
);

create policy "prescription exercises therapist insert"
on public.prescription_exercises
for insert
to authenticated
with check (
  exists (
    select 1
    from public.prescriptions pr
    where pr.id = prescription_id
      and pr.therapist_id = auth.uid()
  )
);

create policy "exercise logs patient or assigned therapist read"
on public.exercise_logs
for select
to authenticated
using (
  patient_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = patient_id
      and p.therapist_id = auth.uid()
  )
);

create policy "exercise logs patient insert own"
on public.exercise_logs
for insert
to authenticated
with check (patient_id = auth.uid());

create policy "messages participant read"
on public.messages
for select
to authenticated
using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "messages sender insert"
on public.messages
for insert
to authenticated
with check (sender_id = auth.uid());

create policy "messages receiver update read_at"
on public.messages
for update
to authenticated
using (receiver_id = auth.uid())
with check (receiver_id = auth.uid());

create policy "therapist comments therapist read own patients"
on public.therapist_comments
for select
to authenticated
using (
  therapist_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = patient_id
      and p.therapist_id = auth.uid()
  )
);

create policy "therapist comments therapist insert own patients"
on public.therapist_comments
for insert
to authenticated
with check (
  therapist_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = patient_id
      and p.therapist_id = auth.uid()
  )
);
