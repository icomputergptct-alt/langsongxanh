-- TechPulse / langsongxanh — Auth & admin migration
-- Run this once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- (Run AFTER schema.sql has already been applied.)

-- Profiles table: one row per auth.users, tracks the admin flag.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "users read own profile" on profiles;
create policy "users read own profile" on profiles for select using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up. The very first account
-- ever created becomes admin automatically; everyone after that is a regular user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, (select count(*) from public.profiles) = 0);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Track who created each quiz, so a user can manage their own quizzes and an
-- admin can manage any of them.
alter table quiz_exams add column if not exists created_by uuid references auth.users(id);

-- Tighten RLS now that we have real accounts:
-- - Articles: anyone can read, only an admin can write/edit/delete.
-- - Quizzes: anyone can read; creating one requires being logged in; editing/
--   deleting requires being the creator or an admin.
-- - Comments and exam attempts stay fully public (no login required to discuss
--   or take a quiz).

drop policy if exists "public write articles" on articles;
create policy "admin write articles" on articles for insert
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin));
drop policy if exists "public update articles" on articles;
create policy "admin update articles" on articles for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin));
drop policy if exists "admin delete articles" on articles;
create policy "admin delete articles" on articles for delete
  using (exists (select 1 from profiles where id = auth.uid() and is_admin));

drop policy if exists "public write quiz_exams" on quiz_exams;
drop policy if exists "authenticated write quiz_exams" on quiz_exams;
create policy "authenticated write quiz_exams" on quiz_exams for insert
  with check (auth.uid() is not null);
drop policy if exists "public update quiz_exams" on quiz_exams;
drop policy if exists "owner or admin update quiz_exams" on quiz_exams;
create policy "owner or admin update quiz_exams" on quiz_exams for update
  using (
    created_by = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and is_admin)
  )
  with check (
    created_by = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and is_admin)
  );
drop policy if exists "public delete quiz_exams" on quiz_exams;
drop policy if exists "owner or admin delete quiz_exams" on quiz_exams;
create policy "owner or admin delete quiz_exams" on quiz_exams for delete
  using (
    created_by = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

-- Migration: teacher profile fields shown/edited in the "Hồ Sơ Giáo Viên" card.
alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists school_name text;
alter table profiles add column if not exists phone text;

drop policy if exists "users update own profile" on profiles;
create policy "users update own profile" on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Migration: "Liên Hệ Hệ Thống" contact page — anyone can submit (no login
-- required), but only an admin can read the submitted messages back.
create table if not exists contact_messages (
  id text primary key,
  title text not null,
  content text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;

drop policy if exists "public write contact_messages" on contact_messages;
create policy "public write contact_messages" on contact_messages for insert with check (true);

drop policy if exists "admin read contact_messages" on contact_messages;
create policy "admin read contact_messages" on contact_messages for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin));

-- Migration: news article management is further restricted to one specific
-- admin account (matches the client-side gate in AdminDashboard.tsx) instead
-- of every is_admin account being able to write/edit/delete articles. Reading
-- articles stays public — this only tightens insert/update/delete.
drop policy if exists "admin write articles" on articles;
drop policy if exists "news manager write articles" on articles;
create policy "news manager write articles" on articles for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin and email = 'icomputer.gpt.ct@gmail.com'
    )
  );
drop policy if exists "admin update articles" on articles;
drop policy if exists "news manager update articles" on articles;
create policy "news manager update articles" on articles for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin and email = 'icomputer.gpt.ct@gmail.com'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin and email = 'icomputer.gpt.ct@gmail.com'
    )
  );
drop policy if exists "admin delete articles" on articles;
drop policy if exists "news manager delete articles" on articles;
create policy "news manager delete articles" on articles for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin and email = 'icomputer.gpt.ct@gmail.com'
    )
  );

-- ============================================================================
-- Security hardening migration (2026-08-28 security review)
-- Run this once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- Fixes 3 real, unauthenticated data-exposure/tampering issues found in review:
--   1. quiz_exams.room_password was readable by anyone (public "select using (true)"),
--      so any visitor could read every room's password directly via the REST API,
--      bypassing the password gate in the UI entirely.
--   2. exam_attempts was readable by anyone (public "select using (true)"), leaking
--      every student's name, score, and per-question answers for every exam.
--   3. comments and exam_documents both had a fully open UPDATE policy
--      ("using (true) with check (true))"), letting anyone rewrite any other
--      user's comment or any document's metadata (e.g. swap its file_url) —
--      not just bump the like/view counters the app actually needed that for.
-- ============================================================================

-- --- Fix 1: quiz_exams.room_password -----------------------------------------
-- Everyone still needs to browse the exam list (there's no student login), but
-- nobody except the room's own creator/admin should ever see the raw password.
-- Reads now go through this view instead of the table directly: it always
-- exposes has_password (safe for everyone) and only unmasks room_password for
-- the owner/admin. The app (storageService.ts) has been updated to select from
-- quiz_exams_public instead of quiz_exams for all read paths.
create or replace view public.quiz_exams_public as
select
  id, title, description, category, difficulty, duration_minutes, pass_score_percent,
  questions, created_at, author_name, school_name, class_name, grade, school_year,
  deadline_at, is_archived, is_draft, participants_count, average_score, source_file,
  is_featured, created_by,
  (room_password is not null and room_password <> '') as has_password,
  case
    when created_by = auth.uid()
      or exists (select 1 from profiles where id = auth.uid() and is_admin)
    then room_password
    else null
  end as room_password
from quiz_exams;

grant select on public.quiz_exams_public to anon, authenticated;

-- Belt-and-suspenders: even if a client queries quiz_exams directly instead of
-- the view above, it can no longer read any column of it at all (writes are
-- untouched — INSERT/UPDATE/DELETE still work exactly as the RLS policies
-- above already allow).
revoke select on quiz_exams from anon, authenticated;

-- A student verifying a room password never needs to see the real value —
-- this just answers true/false, running with elevated (security definer)
-- privilege so it can read room_password despite the revoke above.
create or replace function public.verify_room_password(p_exam_id text, p_password text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(room_password, '') = coalesce(p_password, '')
  from quiz_exams
  where id = p_exam_id;
$$;

grant execute on function public.verify_room_password(text, text) to anon, authenticated;

-- storageService.recordAttempt used to read+update quiz_exams.participants_count/
-- average_score directly. That already silently failed for anonymous students
-- (the "owner or admin update quiz_exams" policy blocks anyone who isn't the
-- room's creator/admin — i.e. every real student, since there's no student
-- login) and would now also fail to even SELECT after the table-wide revoke
-- above. This RPC does the read-increment-write atomically and works for
-- anonymous students too, fixing both issues at once.
create or replace function public.record_exam_participation(p_exam_id text, p_percentage numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_count int;
  old_avg numeric;
  new_count int;
begin
  select participants_count, average_score into old_count, old_avg
  from quiz_exams where id = p_exam_id;

  if not found then
    return;
  end if;

  old_count := coalesce(old_count, 0);
  old_avg := coalesce(old_avg, 0);
  new_count := old_count + 1;

  update quiz_exams
  set participants_count = new_count,
      average_score = round(((old_avg * old_count) + p_percentage) / new_count, 1)
  where id = p_exam_id;
end;
$$;

grant execute on function public.record_exam_participation(text, numeric) to anon, authenticated;

-- --- Fix 2: exam_attempts --------------------------------------------------
-- Only the exam's own creator (or an admin) can read attempt rows now —
-- previously anyone could dump every student's name/score/answers for every
-- exam. The AdminDashboard/TeacherProfile screens that read this table already
-- require login, so this doesn't change their behavior.
--
-- Routed through a security-definer helper rather than a raw subquery: a
-- plain "exists (select 1 from quiz_exams ...)" inside the USING clause is
-- evaluated with the *querying role's* table privileges, and anon/authenticated
-- no longer have any SELECT grant on quiz_exams (see Fix 1's revoke) — without
-- this helper the policy itself would fail with "permission denied for table
-- quiz_exams" for everyone, not just unauthorized readers.
create or replace function public.is_exam_owner_or_admin(p_exam_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from quiz_exams
    where id = p_exam_id
      and (
        created_by = auth.uid()
        or exists (select 1 from profiles where id = auth.uid() and is_admin)
      )
  );
$$;

grant execute on function public.is_exam_owner_or_admin(text) to anon, authenticated;

drop policy if exists "public read exam_attempts" on exam_attempts;
drop policy if exists "owner or admin read exam_attempts" on exam_attempts;
create policy "owner or admin read exam_attempts" on exam_attempts for select
  using (public.is_exam_owner_or_admin(exam_id));

-- The anonymous "you already took this exam" check needs a yes/no answer, not
-- a raw read of every attempt — this narrow, elevated-privilege function
-- replaces the old direct SELECT so it keeps working under the tighter policy
-- above. (Vietnamese-diacritic-insensitive matching is approximated with
-- unaccent(); slightly less exhaustive than the old client-side JS normalizer
-- for a couple of edge-case characters, which only affects this soft
-- "already took it?" convenience check, not anything security-sensitive.)
create extension if not exists unaccent;

create or replace function public.has_student_completed_exam(p_exam_id text, p_student_name text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from exam_attempts
    where exam_id = p_exam_id
      and lower(unaccent(trim(user_name))) = lower(unaccent(trim(p_student_name)))
  );
$$;

grant execute on function public.has_student_completed_exam(text, text) to anon, authenticated;

-- --- Fix 3: comments & exam_documents open UPDATE policies -----------------
-- The app only ever needed UPDATE for two narrow counters (comment likes,
-- document views) — never to let a random visitor overwrite someone else's
-- comment text or swap a document's file_url. Replace the open policies with
-- dedicated increment functions and drop UPDATE entirely otherwise.
drop policy if exists "public update comments" on comments;

create or replace function public.increment_comment_likes(p_comment_id text, p_delta int)
returns void
language sql
security definer
set search_path = public
as $$
  update comments set likes = greatest(0, likes + p_delta) where id = p_comment_id;
$$;

grant execute on function public.increment_comment_likes(text, int) to anon, authenticated;

drop policy if exists "public update exam_documents" on exam_documents;

create or replace function public.increment_exam_document_views(p_doc_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update exam_documents set views = views + 1 where id = p_doc_id;
$$;

grant execute on function public.increment_exam_document_views(text) to anon, authenticated;

-- ============================================================================
-- Fix: creating/saving/deleting an exam broke after the security hardening
-- migration above revoked ALL select on quiz_exams.
-- ============================================================================
-- storageService.saveExam upserts via "INSERT ... ON CONFLICT (id) DO UPDATE",
-- and every other write (deleteExam, archive-on-deadline, etc.) filters with
-- .eq('id', ...). Postgres requires SELECT privilege on any column used as an
-- ON CONFLICT arbiter or referenced in a WHERE clause — independent of
-- already holding INSERT/UPDATE/DELETE — so the table-wide revoke above also
-- blocked every one of those, not just reads. `id` isn't sensitive (unlike
-- room_password), so granting SELECT on just that one column restores every
-- id-filtered write while keeping every other column, room_password included,
-- unreadable directly off this table (real reads still go through
-- quiz_exams_public).
grant select (id) on quiz_exams to anon, authenticated;

-- ============================================================================
-- Site-wide visit counter (footer "lượt truy cập" stat).
-- ============================================================================
-- Single-row table holding a running total. Writes only ever go through the
-- increment_site_visit() RPC below (security definer), never a direct
-- UPDATE from the client — that's what stops any visitor from resetting or
-- inflating the counter arbitrarily via the REST API.
create table if not exists site_visits (
  id int primary key default 1,
  total_count bigint not null default 0,
  constraint site_visits_singleton check (id = 1)
);
insert into site_visits (id, total_count) values (1, 0) on conflict (id) do nothing;

alter table site_visits enable row level security;

drop policy if exists "public read site_visits" on site_visits;
create policy "public read site_visits" on site_visits for select using (true);

create or replace function public.increment_site_visit()
returns bigint
language sql
security definer
set search_path = public
as $$
  update site_visits set total_count = total_count + 1 where id = 1
  returning total_count;
$$;

grant execute on function public.increment_site_visit() to anon, authenticated;

-- ============================================================================
-- Admin "Nhật Ký Hoạt Động" (activity log) — who did what and when, across
-- guests/parents (no account — identified only by whatever name they typed,
-- e.g. entering an exam room) and teachers/admins (resolved from their auth
-- session, e.g. logging in, creating/deleting an exam or article).
-- ============================================================================
create table if not exists activity_logs (
  id text primary key,
  created_at timestamptz not null default now(),
  actor_type text not null check (actor_type in ('guest', 'teacher', 'admin')),
  actor_name text,
  actor_email text,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  detail text
);
create index if not exists activity_logs_created_at_idx on activity_logs(created_at desc);

alter table activity_logs enable row level security;

-- Anyone can write a log entry (guests have no account, so this has to stay
-- open like exam_attempts/contact_messages), but a client can only claim to
-- be a guest with no actor_id, or claim a teacher/admin identity that matches
-- their own logged-in session — never spoof another account or fake identity.
drop policy if exists "public write activity_logs" on activity_logs;
create policy "public write activity_logs" on activity_logs for insert
  with check (
    (actor_type = 'guest' and actor_id is null)
    or (actor_type in ('teacher', 'admin') and actor_id = auth.uid())
  );

-- Only admins can read the log back.
drop policy if exists "admin read activity_logs" on activity_logs;
create policy "admin read activity_logs" on activity_logs for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin));

-- ============================================================================
-- Server-side exam grading (2026-08-31).
-- ============================================================================
-- Root cause fixed here: quiz_exams_public exposed each question's full
-- correctOptionId/explanation to EVERY visitor, including anonymous students
-- who hadn't taken the exam yet — anyone could read the whole answer key
-- straight out of the Network tab before or during an attempt (not just via
-- the old post-submit review screen, which only made it easier to spot).
-- Grading also ran entirely in the browser: the client computed its own
-- score/percentage/passed and exam_attempts had an open "insert with check
-- (true)" policy, so a student could submit any score they liked directly via
-- the REST API, bypassing the app entirely.
--
-- Fix: the public view now strips the answer key from `questions` for anyone
-- but the room's own creator/admin (who need it to edit the exam), and all
-- grading + attempt-row writes move into one security-definer RPC that reads
-- the real answer key server-side. Direct inserts into exam_attempts are no
-- longer allowed from the client at all.

-- --- Strip the answer key out of quiz_exams_public for non-owners ----------
create or replace function public.strip_answer_key(p_questions jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_agg(elem - 'correctOptionId' - 'explanation'), '[]'::jsonb)
  from jsonb_array_elements(p_questions) as elem;
$$;

create or replace view public.quiz_exams_public as
select
  id, title, description, category, difficulty, duration_minutes, pass_score_percent,
  case
    when created_by = auth.uid()
      or exists (select 1 from profiles where id = auth.uid() and is_admin)
    then questions
    else public.strip_answer_key(questions)
  end as questions,
  created_at, author_name, school_name, class_name, grade, school_year,
  deadline_at, is_archived, is_draft, participants_count, average_score, source_file,
  is_featured, created_by,
  (room_password is not null and room_password <> '') as has_password,
  case
    when created_by = auth.uid()
      or exists (select 1 from profiles where id = auth.uid() and is_admin)
    then room_password
    else null
  end as room_password,
  -- Appended at the end, not inserted among the columns above: CREATE OR
  -- REPLACE VIEW matches existing columns by position, so adding a new one
  -- anywhere but last makes Postgres think every later column got renamed.
  allow_answer_review
from quiz_exams;

-- --- Grade server-side and write the attempt row ---------------------------
-- Takes only the student's raw picks (questionId/selectedOptionId) — never a
-- score, percentage, or per-answer correctness — and grades them against the
-- real quiz_exams.questions (readable here despite the anon/authenticated
-- revoke on that table, since this function runs as its owner). Returns just
-- the aggregate result; per-question correctness/answer key is intentionally
-- not returned to the client, so nothing leaks even by inspecting this call's
-- network response — UNLESS the room's own `allow_answer_review` flag is on,
-- in which case the full per-question breakdown (including the real answer
-- key) is returned in `review`, once, only to the browser that just submitted.
-- This never creates a way to read it back later for a different visitor, so
-- it doesn't reopen the "later test-taker reads a previous student's answer
-- key" leak the aggregate-only design above was built to close — it only
-- widens what the submitting student themselves immediately sees, which is
-- the teacher's explicit choice per exam.
drop function if exists public.submit_exam_attempt(
  text, text, text, text, text, text, timestamptz, timestamptz, int, jsonb, text[]
);

create or replace function public.submit_exam_attempt(
  p_attempt_id text,
  p_exam_id text,
  p_user_id text,
  p_user_name text,
  p_user_avatar text,
  p_user_role text,
  p_started_at timestamptz,
  p_completed_at timestamptz,
  p_duration_seconds int,
  p_selected_answers jsonb,
  p_flagged_questions text[]
)
returns table (score int, max_score int, percentage numeric, passed boolean, review jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exam_title text;
  v_pass_score_percent int;
  v_questions jsonb;
  v_allow_answer_review boolean;
  v_score int;
  v_max_score int;
  v_percentage numeric;
  v_passed boolean;
  v_answers jsonb;
  v_review jsonb;
begin
  select title, pass_score_percent, questions, allow_answer_review
  into v_exam_title, v_pass_score_percent, v_questions, v_allow_answer_review
  from quiz_exams
  where id = p_exam_id;

  if not found then
    raise exception 'Exam % not found', p_exam_id;
  end if;

  with q as (
    select value as question
    from jsonb_array_elements(v_questions)
  ),
  ans as (
    select "questionId", "selectedOptionId"
    from jsonb_to_recordset(coalesce(p_selected_answers, '[]'::jsonb))
      as x("questionId" text, "selectedOptionId" text)
  ),
  graded as (
    select
      q.question ->> 'id' as question_id,
      q.question as question_body,
      coalesce(a."selectedOptionId", '') as selected_option_id,
      (a."selectedOptionId" is not null and a."selectedOptionId" = q.question ->> 'correctOptionId') as is_correct
    from q
    left join ans a on a."questionId" = q.question ->> 'id'
  )
  select
    count(*) filter (where is_correct),
    count(*),
    jsonb_agg(jsonb_build_object(
      'questionId', question_id,
      'selectedOptionId', selected_option_id,
      'isCorrect', is_correct
    )),
    case when v_allow_answer_review then
      jsonb_agg(jsonb_build_object(
        'questionId', question_id,
        'questionText', question_body ->> 'question',
        'options', question_body -> 'options',
        'selectedOptionId', selected_option_id,
        'correctOptionId', question_body ->> 'correctOptionId',
        'isCorrect', is_correct,
        'explanation', question_body ->> 'explanation'
      ))
    else null end
  into v_score, v_max_score, v_answers, v_review
  from graded;

  v_percentage := case when v_max_score > 0 then round((v_score::numeric / v_max_score) * 100) else 0 end;
  v_passed := v_percentage >= v_pass_score_percent;

  insert into exam_attempts (
    id, exam_id, exam_title, user_id, user_name, user_avatar, user_role,
    score, max_score, percentage, passed, started_at, completed_at,
    duration_seconds, answers, flagged_questions
  ) values (
    p_attempt_id, p_exam_id, v_exam_title, p_user_id, p_user_name, p_user_avatar, p_user_role,
    v_score, v_max_score, v_percentage, v_passed, p_started_at, p_completed_at,
    p_duration_seconds, coalesce(v_answers, '[]'::jsonb), coalesce(p_flagged_questions, '{}')
  );

  perform public.record_exam_participation(p_exam_id, v_percentage);

  return query select v_score, v_max_score, v_percentage, v_passed, v_review;
end;
$$;

grant execute on function public.submit_exam_attempt(
  text, text, text, text, text, text, timestamptz, timestamptz, int, jsonb, text[]
) to anon, authenticated;

-- Direct inserts into exam_attempts are no longer allowed from the client —
-- every attempt must go through submit_exam_attempt() above, which is the
-- only thing that can compute a trustworthy score.
drop policy if exists "public write exam_attempts" on exam_attempts;

-- --- Full exam data for the deadline-archival flow --------------------------
-- storageService.archiveExpiredExams runs for whichever visitor happens to
-- have the Quiz Room open when a room's deadline passes, and needs the real
-- correctOptionId values to print the archived PDF's answer-key column — but
-- that visitor is essentially never the room's owner/admin, so
-- quiz_exams_public's masked `questions` (see above) isn't enough anymore.
-- This only ever returns data for a room that has ALREADY closed (deadline in
-- the past) and isn't archived yet, so by the time anything can read the
-- answer key through it, nobody can submit a new attempt for that room
-- anymore — there's no "later test-taker" left for it to leak to.
create or replace function public.get_exam_for_archival(p_exam_id text)
returns setof quiz_exams
language sql
security definer
set search_path = public
as $$
  select *
  from quiz_exams
  where id = p_exam_id
    and is_archived = false
    and deadline_at is not null
    and deadline_at < now();
$$;

grant execute on function public.get_exam_for_archival(text) to anon, authenticated;

-- ============================================================================
-- Lock down exam_documents writes (2026-09-15).
-- ============================================================================
-- exam_documents still had "insert with check (true)" from schema.sql, so
-- anyone hitting the REST API directly with the anon key could write a
-- document row (arbitrary title/file_url/grade) without ever going through
-- the app's upload UI — the client-side "must be logged in" gate added to the
-- upload buttons doesn't stop that. The only legitimate unauthenticated
-- writer is archiveExpiredExams (storageService.ts), which runs for whichever
-- guest happens to have an expired quiz room open. That path moves into the
-- security-definer RPC below (which also fixes a latent bug: its old direct
-- `.update(quiz_exams).eq('id', ...)` silently did nothing for a guest caller,
-- since "owner or admin update quiz_exams" blocks anyone who isn't the room's
-- creator/admin — is_archived never actually stuck, so the same expired room
-- would get re-archived, and a duplicate document row inserted, every time
-- another guest opened it). Every other write to exam_documents now requires
-- a real account.
create or replace function public.archive_exam_as_document(
  p_exam_id text,
  p_file_url text,
  p_file_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_grade int;
  v_class_name text;
  v_school_year text;
begin
  -- Atomically claim the archival: only an exam that's still past its
  -- deadline and not yet archived matches, and this marks it archived in
  -- the same statement — so two guests racing to open the same expired
  -- room can't both pass the check and insert a duplicate document row.
  update quiz_exams
  set is_archived = true
  where id = p_exam_id
    and is_archived = false
    and deadline_at is not null
    and deadline_at < now()
  returning title, grade, class_name, school_year
  into v_title, v_grade, v_class_name, v_school_year;

  if not found then
    return;
  end if;

  insert into exam_documents (
    id, title, grade, class_name, school_year, file_url, file_name, file_type, views, uploaded_at
  ) values (
    'doc-' || floor(extract(epoch from clock_timestamp()) * 1000)::text || '-' || substr(md5(random()::text), 1, 8),
    v_title, v_grade, v_class_name, v_school_year, p_file_url, p_file_name, 'pdf', 0, now()
  );
end;
$$;

grant execute on function public.archive_exam_as_document(text, text, text) to anon, authenticated;

drop policy if exists "public write exam_documents" on exam_documents;
drop policy if exists "authenticated write exam_documents" on exam_documents;
create policy "authenticated write exam_documents" on exam_documents for insert
  with check (auth.uid() is not null);

-- ============================================================================
-- Online meetings ("Phòng Họp Online", 2026-11-02).
-- ============================================================================
-- Calls themselves run on Jitsi; this table only tracks which rooms exist and
-- whether one is in progress, so the header can badge live meetings. Jitsi can't
-- tell us when a call ends, so "in progress" means: not ended by its host and
-- someone has had the room page open recently (the page heartbeats via
-- touch_meeting). Creating a meeting requires an account; joining doesn't.
-- Signed-out guests can't read the table directly, but list_active_meetings
-- shows them every live room so anyone on the lobby can click in.
create table if not exists meetings (
  id text primary key,
  title text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by_name text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table meetings enable row level security;

drop policy if exists "authenticated read meetings" on meetings;
create policy "authenticated read meetings" on meetings for select
  using (auth.uid() is not null);
drop policy if exists "authenticated create meetings" on meetings;
create policy "authenticated create meetings" on meetings for insert
  with check (auth.uid() = created_by);
drop policy if exists "host updates meetings" on meetings;
create policy "host updates meetings" on meetings for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Participants (not just the host, and guests too) keep a meeting marked live
-- while its page is open. Returns false for a room that doesn't exist or was
-- ended, which is also how joining by code rejects unknown rooms.
create or replace function public.touch_meeting(p_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update meetings set last_active_at = now()
  where id = p_id and ended_at is null;
  return found;
end;
$$;

grant execute on function public.touch_meeting(text) to anon, authenticated;

-- One open meeting by id, for guests arriving from an invite link (they can't
-- read the table directly).
create or replace function public.get_meeting(p_id text)
returns setof meetings
language sql
security definer
set search_path = public
stable
as $$
  select * from meetings where id = p_id and ended_at is null;
$$;

grant execute on function public.get_meeting(text) to anon, authenticated;

create or replace function public.count_active_meetings()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int from meetings
  where ended_at is null and last_active_at > now() - interval '5 minutes';
$$;

grant execute on function public.count_active_meetings() to anon, authenticated;

-- Live rooms for the lobby, open to guests too (2026-11-03).
create or replace function public.list_active_meetings()
returns setof meetings
language sql
security definer
set search_path = public
stable
as $$
  select * from meetings
  where ended_at is null and last_active_at > now() - interval '5 minutes'
  order by created_at desc
  limit 50;
$$;

grant execute on function public.list_active_meetings() to anon, authenticated;

-- ============================================================================
-- Security fix: profile privilege escalation (2026-11-09)
-- Run this once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
--
-- "users update own profile" allowed updating EVERY column of your own row,
-- including is_admin and email. Since the article policies trusted those two
-- columns, any signed-up user could set is_admin = true and
-- email = 'icomputer.gpt.ct@gmail.com' on their own profile and then post,
-- edit or delete articles (and read everything else gated on is_admin).
-- ============================================================================

-- 1) Users may only change their own display fields — never is_admin / email.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, school_name, phone) on public.profiles to authenticated;

-- 2) The news-manager check uses the signed-in account's real email from the
--    auth token (not editable by the user) instead of profiles.email.
drop policy if exists "news manager write articles" on articles;
create policy "news manager write articles" on articles for insert
  with check (
    (auth.jwt() ->> 'email') = 'icomputer.gpt.ct@gmail.com'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );
drop policy if exists "news manager update articles" on articles;
create policy "news manager update articles" on articles for update
  using (
    (auth.jwt() ->> 'email') = 'icomputer.gpt.ct@gmail.com'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  )
  with check (
    (auth.jwt() ->> 'email') = 'icomputer.gpt.ct@gmail.com'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );
drop policy if exists "news manager delete articles" on articles;
create policy "news manager delete articles" on articles for delete
  using (
    (auth.jwt() ->> 'email') = 'icomputer.gpt.ct@gmail.com'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

-- 3) Audit (run separately and read the result): every admin account, and
--    any profile whose stored email no longer matches its real login email —
--    a sign the hole above was used. Fix anything unexpected with e.g.
--      update profiles set is_admin = false where id = '<uuid>';
--      update profiles p set email = u.email from auth.users u where u.id = p.id;
-- select p.id, p.email as profile_email, u.email as login_email, p.is_admin, p.created_at
-- from profiles p join auth.users u on u.id = p.id
-- where p.is_admin or p.email is distinct from u.email
-- order by p.created_at;

-- ============================================================================
-- "Tin Học" video library (2026-11-10).
-- Run this once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- Anyone can watch; only admin accounts (profiles.is_admin) can add/edit/delete.
-- ============================================================================
create table if not exists videos (
  id text primary key,
  title text not null,
  url text not null,
  youtube_id text,
  thumbnail_url text,
  description text,
  category text not null default 'Khác',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table videos enable row level security;

drop policy if exists "public read videos" on videos;
create policy "public read videos" on videos for select using (true);

drop policy if exists "admin write videos" on videos;
create policy "admin write videos" on videos for insert
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

drop policy if exists "admin update videos" on videos;
create policy "admin update videos" on videos for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

drop policy if exists "admin delete videos" on videos;
create policy "admin delete videos" on videos for delete
  using (exists (select 1 from profiles where id = auth.uid() and is_admin));

-- ============================================================================
-- Anonymous visit analytics (admin "Thống Kê Truy Cập" tab).
-- ============================================================================
-- One row per browser-tab session: device type, OS, browser, approximate
-- city/country (from Vercel's geo headers) and the landing path. No IP, no
-- user id, no fingerprint — rows can't be tied back to a person. Rows older
-- than 180 days are pruned automatically by log_visit().
create table if not exists visit_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  device text not null default 'unknown',
  os text not null default 'Khác',
  browser text not null default 'Khác',
  country text,
  city text,
  path text
);
create index if not exists visit_events_created_at_idx on visit_events(created_at desc);

alter table visit_events enable row level security;
-- No insert/select policies: writes only via log_visit(), reads only via
-- get_visit_stats() (admin-checked), both security definer.

create or replace function public.log_visit(
  p_device text, p_os text, p_browser text, p_country text, p_city text, p_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into visit_events (device, os, browser, country, city, path)
  values (
    left(coalesce(nullif(p_device, ''), 'unknown'), 20),
    left(coalesce(nullif(p_os, ''), 'Khác'), 40),
    left(coalesce(nullif(p_browser, ''), 'Khác'), 40),
    left(nullif(p_country, ''), 8),
    left(nullif(p_city, ''), 80),
    left(nullif(p_path, ''), 200)
  );
  -- Occasional cleanup so the table never grows past ~180 days of data.
  if random() < 0.02 then
    delete from visit_events where created_at < now() - interval '180 days';
  end if;
end;
$$;

grant execute on function public.log_visit(text, text, text, text, text, text) to anon, authenticated;

-- Aggregated stats for the last p_days days (admin only). Hours/days are in
-- Vietnam time.
create or replace function public.get_visit_stats(p_days int default 30)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 180)));
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'not allowed';
  end if;

  with v as (select * from visit_events where created_at >= since)
  select json_build_object(
    'total', (select count(*) from v),
    'device', (select coalesce(json_agg(r order by r.count desc), '[]') from (select device as label, count(*) as count from v group by 1) r),
    'os', (select coalesce(json_agg(r order by r.count desc), '[]') from (select os as label, count(*) as count from v group by 1) r),
    'browser', (select coalesce(json_agg(r order by r.count desc), '[]') from (select browser as label, count(*) as count from v group by 1) r),
    'city', (select coalesce(json_agg(r order by r.count desc), '[]') from (
      select coalesce(city, 'Không rõ') || coalesce(' (' || country || ')', '') as label, count(*) as count
      from v group by 1 order by 2 desc limit 15) r),
    'path', (select coalesce(json_agg(r order by r.count desc), '[]') from (
      select coalesce(path, '/') as label, count(*) as count from v group by 1 order by 2 desc limit 15) r),
    'hour', (select coalesce(json_agg(r order by r.label), '[]') from (
      select extract(hour from created_at at time zone 'Asia/Ho_Chi_Minh')::int as label, count(*) as count from v group by 1) r),
    'day', (select coalesce(json_agg(r order by r.label), '[]') from (
      select to_char(created_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as label, count(*) as count from v group by 1) r)
  ) into result;
  return result;
end;
$$;

grant execute on function public.get_visit_stats(int) to authenticated;
