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

-- Public/no-auth demo app: allow the anon (publishable) key to read and write everything.
alter table articles enable row level security;
alter table comments enable row level security;
alter table quiz_exams enable row level security;
alter table exam_attempts enable row level security;

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
