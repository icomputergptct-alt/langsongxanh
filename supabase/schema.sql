-- TechPulse / langsongxanh — Supabase schema
-- Run this once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists articles (
  id text primary key,
  title text not null,
  slug text not null unique,
  summary text not null,
  content text not null,
  author_name text not null,
  author_role text not null,
  author_avatar text not null,
  author_verified boolean not null default false,
  published_at timestamptz not null,
  read_time_minutes int not null default 5,
  category text not null,
  tags text[] not null default '{}',
  cover_image text not null,
  views int not null default 0,
  likes int not null default 0,
  is_deep_analysis boolean not null default false,
  is_trending boolean not null default false,
  key_insights text[] not null default '{}'
);

create table if not exists comments (
  id text primary key,
  article_id text not null references articles(id) on delete cascade,
  parent_id text references comments(id) on delete cascade,
  author_name text not null,
  author_avatar text not null,
  author_role text not null,
  author_badge text,
  content text not null,
  created_at timestamptz not null default now(),
  likes int not null default 0
);
create index if not exists comments_article_id_idx on comments(article_id);
create index if not exists comments_parent_id_idx on comments(parent_id);

create table if not exists quiz_exams (
  id text primary key,
  title text not null,
  description text not null,
  category text not null,
  difficulty text not null,
  duration_minutes int not null default 15,
  pass_score_percent int not null default 70,
  questions jsonb not null default '[]',
  created_at timestamptz not null default now(),
  author_name text not null,
  school_name text,
  class_name text,
  room_password text,
  grade int,
  participants_count int not null default 0,
  average_score numeric not null default 0,
  source_file text,
  is_featured boolean not null default false
);

create table if not exists exam_attempts (
  id text primary key,
  exam_id text not null references quiz_exams(id) on delete cascade,
  exam_title text not null,
  user_id text not null,
  user_name text not null,
  user_avatar text not null,
  user_role text,
  score int not null,
  max_score int not null,
  percentage numeric not null,
  passed boolean not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  duration_seconds int not null,
  answers jsonb not null default '[]',
  flagged_questions text[] not null default '{}'
);
create index if not exists exam_attempts_exam_id_idx on exam_attempts(exam_id);

-- "Kho đề thi kiểm tra" file library — real uploaded .docx/.pdf documents, browsable by
-- grade, distinct from quiz_exams (which are interactive multiple-choice test rooms).
create table if not exists exam_documents (
  id text primary key,
  title text not null,
  grade int,
  semester text,
  category text,
  description text,
  file_url text not null,
  file_name text not null,
  file_type text not null,
  views int not null default 0,
  uploaded_at timestamptz not null default now()
);

-- Public/no-auth demo app: allow the anon (publishable) key to read and write everything.
alter table articles enable row level security;
alter table comments enable row level security;
alter table quiz_exams enable row level security;
alter table exam_attempts enable row level security;
alter table exam_documents enable row level security;

drop policy if exists "public read articles" on articles;
create policy "public read articles" on articles for select using (true);
drop policy if exists "public write articles" on articles;
create policy "public write articles" on articles for insert with check (true);
drop policy if exists "public update articles" on articles;
create policy "public update articles" on articles for update using (true) with check (true);

drop policy if exists "public read comments" on comments;
create policy "public read comments" on comments for select using (true);
drop policy if exists "public write comments" on comments;
create policy "public write comments" on comments for insert with check (true);
drop policy if exists "public update comments" on comments;
create policy "public update comments" on comments for update using (true) with check (true);

drop policy if exists "public read quiz_exams" on quiz_exams;
create policy "public read quiz_exams" on quiz_exams for select using (true);
drop policy if exists "public write quiz_exams" on quiz_exams;
create policy "public write quiz_exams" on quiz_exams for insert with check (true);
drop policy if exists "public update quiz_exams" on quiz_exams;
create policy "public update quiz_exams" on quiz_exams for update using (true) with check (true);
drop policy if exists "public delete quiz_exams" on quiz_exams;
create policy "public delete quiz_exams" on quiz_exams for delete using (true);

drop policy if exists "public read exam_attempts" on exam_attempts;
create policy "public read exam_attempts" on exam_attempts for select using (true);
drop policy if exists "public write exam_attempts" on exam_attempts;
create policy "public write exam_attempts" on exam_attempts for insert with check (true);

drop policy if exists "public read exam_documents" on exam_documents;
create policy "public read exam_documents" on exam_documents for select using (true);
drop policy if exists "public write exam_documents" on exam_documents;
create policy "public write exam_documents" on exam_documents for insert with check (true);
drop policy if exists "public update exam_documents" on exam_documents;
create policy "public update exam_documents" on exam_documents for update using (true) with check (true);
drop policy if exists "public delete exam_documents" on exam_documents;
create policy "public delete exam_documents" on exam_documents for delete using (true);

-- Storage bucket holding the uploaded exam files themselves (the actual .docx/.pdf bytes).
insert into storage.buckets (id, name, public)
values ('exam-files', 'exam-files', true)
on conflict (id) do nothing;

drop policy if exists "public read exam-files" on storage.objects;
create policy "public read exam-files" on storage.objects for select using (bucket_id = 'exam-files');
drop policy if exists "public upload exam-files" on storage.objects;
create policy "public upload exam-files" on storage.objects for insert with check (bucket_id = 'exam-files');
drop policy if exists "public update exam-files" on storage.objects;
create policy "public update exam-files" on storage.objects for update using (bucket_id = 'exam-files') with check (bucket_id = 'exam-files');
drop policy if exists "public delete exam-files" on storage.objects;
create policy "public delete exam-files" on storage.objects for delete using (bucket_id = 'exam-files');

-- Migration: adds school/class/room-password columns to a quiz_exams table that
-- already existed before this feature — safe to re-run, no-op if columns exist.
alter table quiz_exams add column if not exists school_name text;
alter table quiz_exams add column if not exists class_name text;
alter table quiz_exams add column if not exists room_password text;
alter table quiz_exams add column if not exists grade int;

-- Migration: exam_documents.semester started as an int (1/2) but now also needs to hold
-- "Giữa kỳ" — switch it to text and relabel the existing HK1/HK2 rows.
alter table exam_documents alter column semester type text using semester::text;
update exam_documents set semester = 'Học kỳ 1' where semester = '1';
update exam_documents set semester = 'Học kỳ 2' where semester = '2';

-- Migration: adds class name (Lớp) and school year (Năm học) to the generic
-- "Tải lên tài liệu" upload flow, in addition to the existing grade (Khối).
alter table exam_documents add column if not exists class_name text;
alter table exam_documents add column if not exists school_year text;

-- Migration: adds school year (Năm học) to quiz_exams so the global search bar
-- can find both documents and quiz rooms belonging to a given school year.
alter table quiz_exams add column if not exists school_year text;

-- Migration: adds an optional room deadline. Once it passes, the client-side
-- lazy archiver (storageService.archiveExpiredExams, run whenever anyone opens
-- the Quiz Room) converts the exam to a PDF in the document library and flips
-- is_archived so it no longer shows in the active quiz room list.
alter table quiz_exams add column if not exists deadline_at timestamptz;
alter table quiz_exams add column if not exists is_archived boolean not null default false;

-- Migration: draft exams — saved but not published to the student-facing Quiz
-- Room list yet. The teacher finishes editing later (from their profile) and
-- publishes when ready.
alter table quiz_exams add column if not exists is_draft boolean not null default false;
