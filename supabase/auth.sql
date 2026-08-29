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
create policy "authenticated write quiz_exams" on quiz_exams for insert
  with check (auth.uid() is not null);
drop policy if exists "public update quiz_exams" on quiz_exams;
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
create policy "news manager write articles" on articles for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin and email = 'icomputer.gpt.ct@gmail.com'
    )
  );
drop policy if exists "admin update articles" on articles;
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
