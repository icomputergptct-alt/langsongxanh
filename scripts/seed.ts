import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
import { INITIAL_ARTICLES, INITIAL_COMMENTS, INITIAL_EXAMS, INITIAL_ATTEMPTS } from '../src/data/initialData';
import { Comment } from '../src/types';

const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function flattenComments(comments: Comment[], articleId: string, parentId: string | null = null): any[] {
  const rows: any[] = [];
  for (const c of comments) {
    rows.push({
      id: c.id,
      article_id: articleId,
      parent_id: parentId,
      author_name: c.authorName,
      author_avatar: c.authorAvatar,
      author_role: c.authorRole,
      author_badge: c.authorBadge || null,
      content: c.content,
      created_at: c.createdAt,
      likes: c.likes || 0,
    });
    if (c.replies && c.replies.length > 0) {
      rows.push(...flattenComments(c.replies, articleId, c.id));
    }
  }
  return rows;
}

async function seed() {
  console.log('Seeding articles...');
  const articleRows = INITIAL_ARTICLES.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    summary: a.summary,
    content: a.content,
    author_name: a.author.name,
    author_role: a.author.role,
    author_avatar: a.author.avatar,
    author_verified: !!a.author.verified,
    published_at: a.publishedAt,
    read_time_minutes: a.readTimeMinutes,
    category: a.category,
    tags: a.tags,
    cover_image: a.coverImage,
    views: a.views,
    likes: a.likes,
    is_deep_analysis: !!a.isDeepAnalysis,
    is_trending: !!a.isTrending,
    key_insights: a.keyInsights || [],
  }));
  let { error } = await supabase.from('articles').upsert(articleRows);
  if (error) throw error;

  console.log('Seeding comments...');
  const commentRows = INITIAL_COMMENTS.flatMap((c) => flattenComments([c], c.articleId));
  ({ error } = await supabase.from('comments').upsert(commentRows));
  if (error) throw error;

  console.log('Seeding quiz_exams...');
  const examRows = INITIAL_EXAMS.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    category: e.category,
    difficulty: e.difficulty,
    duration_minutes: e.durationMinutes,
    pass_score_percent: e.passScorePercent,
    questions: e.questions,
    created_at: e.createdAt,
    author_name: e.authorName,
    participants_count: e.participantsCount,
    average_score: e.averageScore,
    source_file: e.sourceFile || null,
    is_featured: !!e.isFeatured,
  }));
  ({ error } = await supabase.from('quiz_exams').upsert(examRows));
  if (error) throw error;

  console.log('Seeding exam_attempts...');
  const attemptRows = INITIAL_ATTEMPTS.map((a) => ({
    id: a.id,
    exam_id: a.examId,
    exam_title: a.examTitle,
    user_id: a.userId,
    user_name: a.userName,
    user_avatar: a.userAvatar,
    user_role: a.userRole || null,
    score: a.score,
    max_score: a.maxScore,
    percentage: a.percentage,
    passed: a.passed,
    started_at: a.startedAt,
    completed_at: a.completedAt,
    duration_seconds: a.durationSeconds,
    answers: a.answers,
    flagged_questions: a.flaggedQuestions || [],
  }));
  ({ error } = await supabase.from('exam_attempts').upsert(attemptRows));
  if (error) throw error;

  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
