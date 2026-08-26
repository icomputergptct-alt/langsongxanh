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
