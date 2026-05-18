-- Run this after:
-- 1. executing supabase/schema.sql
-- 2. creating Auth users in Supabase Auth with these emails:
--    minjun@rehab.com
--    seoyeon@email.com
--    jihoon@email.com
--    sua@email.com
--    dohyun@email.com
--    yuna@email.com
--
-- Suggested test password for all users:
-- 1234

with therapist as (
  select id, email
  from auth.users
  where email = 'minjun@rehab.com'
),
patients as (
  select id, email
  from auth.users
  where email in (
    'seoyeon@email.com',
    'jihoon@email.com',
    'sua@email.com',
    'dohyun@email.com',
    'yuna@email.com'
  )
)
insert into public.profiles (id, role, name, email, avatar_initials, therapist_id)
select
  u.id,
  seeded.role,
  seeded.name,
  seeded.email,
  seeded.avatar_initials,
  case when seeded.role = 'patient' then (select id from therapist) else null end
from (
  values
    ('therapist', '김민준', 'minjun@rehab.com', '김민'),
    ('patient', '이서연', 'seoyeon@email.com', '이서'),
    ('patient', '박지훈', 'jihoon@email.com', '박지'),
    ('patient', '최수아', 'sua@email.com', '최수'),
    ('patient', '정도현', 'dohyun@email.com', '정도'),
    ('patient', '강유나', 'yuna@email.com', '강유')
) as seeded(role, name, email, avatar_initials)
join auth.users u on u.email = seeded.email
on conflict (id) do update
set
  role = excluded.role,
  name = excluded.name,
  email = excluded.email,
  avatar_initials = excluded.avatar_initials,
  therapist_id = excluded.therapist_id;

insert into public.patient_profiles (patient_id, diagnosis, injury_date, surgery_date, rehab_status, status_label)
select
  p.id,
  seeded.diagnosis,
  seeded.injury_date::date,
  seeded.surgery_date::date,
  seeded.rehab_status,
  seeded.status_label
from (
  values
    ('seoyeon@email.com', 'Shoulder Impingement Syndrome', '2026-02-15', null, 'subacute', '아급성기'),
    ('jihoon@email.com', 'Knee Meniscus Injury Post-op Rehab', '2026-01-20', '2026-02-05', 'subacute', '수술 후 재활'),
    ('sua@email.com', 'Chronic Low Back Pain', '2025-09-01', null, 'chronic', '만성기'),
    ('dohyun@email.com', 'Grade II Ankle Sprain', '2026-04-18', null, 'acute', '급성기'),
    ('yuna@email.com', 'Total Hip Arthroplasty Rehab', '2026-03-01', '2026-03-15', 'acute', '수술 직후')
) as seeded(email, diagnosis, injury_date, surgery_date, rehab_status, status_label)
join auth.users p on p.email = seeded.email
on conflict (patient_id) do update
set
  diagnosis = excluded.diagnosis,
  injury_date = excluded.injury_date,
  surgery_date = excluded.surgery_date,
  rehab_status = excluded.rehab_status,
  status_label = excluded.status_label;

insert into public.exercises (id, name, description, body_part, default_reps, default_sets, is_active)
values
  ('11111111-1111-1111-1111-111111111111', '어깨 회전 운동', '밴드를 이용해 팔꿈치를 90도로 굽힌 뒤 바깥쪽으로 회전합니다.', 'shoulder', 15, 3, true),
  ('22222222-2222-2222-2222-222222222222', '어깨 굴곡 운동', '팔을 앞으로 천천히 들어 올려 가능한 범위까지 유지합니다.', 'shoulder', 12, 3, true),
  ('33333333-3333-3333-3333-333333333333', '무릎 신전 운동', '앉은 자세에서 무릎을 펴는 동작을 반복합니다.', 'knee', 20, 3, true),
  ('44444444-4444-4444-4444-444444444444', '미니 스쿼트', '발을 어깨 너비로 벌리고 무릎을 30도만 굽힙니다.', 'knee', 15, 3, true),
  ('55555555-5555-5555-5555-555555555555', '고양이-소 스트레칭', '척추를 천천히 말았다 펴며 허리 유연성을 높입니다.', 'back', 10, 2, true),
  ('66666666-6666-6666-6666-666666666666', '요추 회전 스트레칭', '누운 자세에서 상체를 고정한 채 허리를 회전합니다.', 'back', 10, 2, true),
  ('77777777-7777-7777-7777-777777777777', '브릿지', '누운 자세에서 엉덩이를 들어 올리는 운동입니다.', 'hip', 15, 3, true),
  ('88888888-8888-8888-8888-888888888888', '클램쉘', '누운 자세에서 무릎을 벌렸다 모으는 운동입니다.', 'hip', 15, 3, true),
  ('99999999-9999-9999-9999-999999999999', '발목 펌프 운동', '발목을 위아래로 반복해 움직이는 운동입니다.', 'ankle', 20, 3, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '발목 원 그리기', '발목으로 시계 방향과 반시계 방향 원을 그립니다.', 'ankle', 10, 2, true)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  body_part = excluded.body_part,
  default_reps = excluded.default_reps,
  default_sets = excluded.default_sets,
  is_active = excluded.is_active;

with therapist_profile as (
  select id from public.profiles where email = 'minjun@rehab.com'
),
patient_profile_map as (
  select id, email from public.profiles
  where email in (
    'seoyeon@email.com',
    'jihoon@email.com',
    'sua@email.com',
    'dohyun@email.com',
    'yuna@email.com'
  )
),
seeded_prescriptions as (
  select *
  from (
    values
      ('b1111111-1111-1111-1111-111111111111', 'seoyeon@email.com', '2026-04-01', '2026-05-31', '어깨 충돌 증후군 재활. 통증이 6 이상이면 운동 중단.'),
      ('b2222222-2222-2222-2222-222222222222', 'jihoon@email.com', '2026-04-15', '2026-06-15', '무릎 재활. 미니 스쿼트 강도 주의.'),
      ('b3333333-3333-3333-3333-333333333333', 'sua@email.com', '2026-03-20', null, '만성 허리 통증. 코어 강화 위주 처방.'),
      ('b4444444-4444-4444-4444-444444444444', 'dohyun@email.com', '2026-04-20', null, '발목 염좌 재활. 부종과 통증 변화 체크.'),
      ('b5555555-5555-5555-5555-555555555555', 'yuna@email.com', '2026-04-10', null, '고관절 수술 후 재활. 무릎 굴곡 90도 제한.')
  ) as t(id, patient_email, start_date, end_date, notes)
)
insert into public.prescriptions (id, patient_id, therapist_id, start_date, end_date, notes, status)
select
  seeded.id::uuid,
  patient.id,
  therapist.id,
  seeded.start_date::date,
  seeded.end_date::date,
  seeded.notes,
  'active'
from seeded_prescriptions seeded
join patient_profile_map patient on patient.email = seeded.patient_email
cross join therapist_profile therapist
on conflict (id) do update
set
  patient_id = excluded.patient_id,
  therapist_id = excluded.therapist_id,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  notes = excluded.notes,
  status = excluded.status;

insert into public.prescription_exercises (prescription_id, exercise_id, target_reps, target_sets, sort_order)
select
  seeded.prescription_id::uuid,
  seeded.exercise_id::uuid,
  seeded.target_reps,
  seeded.target_sets,
  seeded.sort_order
from (
  values
    ('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 15, 3, 0),
    ('b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 12, 3, 1),
    ('b1111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 10, 2, 2),
    ('b2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 20, 3, 0),
    ('b2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 15, 3, 1),
    ('b2222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', 15, 3, 2),
    ('b3333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 10, 3, 0),
    ('b3333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', 10, 3, 1),
    ('b3333333-3333-3333-3333-333333333333', '88888888-8888-8888-8888-888888888888', 15, 3, 2),
    ('b4444444-4444-4444-4444-444444444444', '99999999-9999-9999-9999-999999999999', 20, 3, 0),
    ('b4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 10, 2, 1),
    ('b4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 10, 2, 2),
    ('b5555555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777', 15, 3, 0),
    ('b5555555-5555-5555-5555-555555555555', '88888888-8888-8888-8888-888888888888', 15, 3, 1),
    ('b5555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 15, 3, 2),
    ('b5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 12, 3, 3)
) as seeded(prescription_id, exercise_id, target_reps, target_sets, sort_order)
join public.prescriptions pr on pr.id = seeded.prescription_id::uuid
on conflict (prescription_id, exercise_id) do update
set
  target_reps = excluded.target_reps,
  target_sets = excluded.target_sets,
  sort_order = excluded.sort_order;

with p as (
  select email, id
  from public.profiles
)
insert into public.therapist_comments (patient_id, therapist_id, content, created_at)
select
  patient.id,
  therapist.id,
  seeded.content,
  seeded.created_at::timestamptz
from (
  values
    ('seoyeon@email.com', '어깨 가동범위가 개선 중입니다. 다음 주에 강도 상향 검토 예정입니다.', '2026-05-05T10:00:00Z'),
    ('jihoon@email.com', '통증 수치가 높아 강도 조절이 필요합니다. 상태 악화 여부를 계속 체크합니다.', '2026-05-06T09:30:00Z')
) as seeded(patient_email, content, created_at)
join p patient on patient.email = seeded.patient_email
join p therapist on therapist.email = 'minjun@rehab.com'
where not exists (
  select 1
  from public.therapist_comments existing
  where existing.patient_id = patient.id
    and existing.therapist_id = therapist.id
    and existing.content = seeded.content
);
