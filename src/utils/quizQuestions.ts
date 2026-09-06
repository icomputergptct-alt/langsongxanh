import { QuizOption } from '../types';

// Options with actual content — used to tell a real 2-option "Đúng/Sai" question
// apart from a 4-option question that just has blank C/D slots (a state that can
// exist from before this file's options grid supported collapsing to 2 options).
export function getMeaningfulOptions(options: QuizOption[]): QuizOption[] {
  return options.filter((opt) => opt.text.trim() !== '' || !!opt.image);
}

// A question is treated as "Đúng/Sai" purely by having exactly 2 real options —
// no separate type/kind field on QuizQuestion, so this stays the single source
// of truth everywhere a question needs to be classified.
export function isTrueFalseQuestion(options: QuizOption[]): boolean {
  return getMeaningfulOptions(options).length === 2;
}

// Splits any list of questions/reviewed-answers (anything with `options: QuizOption[]`)
// into the two exam sections, preserving original order within each — shared by
// the exam creator, the exported PDF/Word file, and the post-submit review screen
// so all three agree on which questions land in which section.
export function splitIntoSections<T extends { options: QuizOption[] }>(
  items: T[]
): { regular: T[]; trueFalse: T[] } {
  const regular: T[] = [];
  const trueFalse: T[] = [];
  for (const item of items) {
    (isTrueFalseQuestion(item.options) ? trueFalse : regular).push(item);
  }
  return { regular, trueFalse };
}
