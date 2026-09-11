import { Task } from '../types/forge';

/**
 * Checks if query characters appear in order inside text (subsequence matching)
 */
function isSubsequence(text: string, query: string): boolean {
  let tIdx = 0;
  let qIdx = 0;
  while (tIdx < text.length && qIdx < query.length) {
    if (text[tIdx] === query[qIdx]) {
      qIdx++;
    }
    tIdx++;
  }
  return qIdx === query.length;
}

/**
 * Fuzzy matches a task against a search query.
 * Supports:
 * - Direct substring matches (case-insensitive) across title, description, tags, assignee, id, status, priority
 * - Multi-word tokens: all words in the query must match something in the task
 * - Fuzzy subsequence match on title/description when single word
 */
export function matchesTaskFuzzy(task: Task, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  const tokens = query.split(/\s+/).filter(Boolean);
  const title = (task.title || '').toLowerCase();
  const desc = (task.description || '').toLowerCase();
  const id = (task.id || '').toLowerCase();
  const assignee = (task.assignee || '').toLowerCase();
  const status = (task.status || '').toLowerCase().replace('_', ' ');
  const priority = (task.priority || '').toLowerCase();
  const tags = (task.tags || []).map((t) => t.toLowerCase()).join(' ');

  const searchableText = `${title} ${desc} ${id} ${assignee} ${status} ${priority} ${tags}`;

  // Every token in the query must match somewhere in the task (either as substring or fuzzy subsequence on title)
  return tokens.every((token) => {
    // 1. Direct substring match in any field
    if (searchableText.includes(token)) return true;

    // 2. Fuzzy subsequence match on title
    if (token.length >= 2 && isSubsequence(title, token)) return true;

    // 3. Fuzzy subsequence match on description
    if (token.length >= 3 && isSubsequence(desc, token)) return true;

    return false;
  });
}

/**
 * Formats an ISO date string into a friendly, human-readable relative time
 * (e.g., 'Just now', '12m ago', '3h ago', 'Yesterday', '4d ago', 'Sep 4')
 */
export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return 'Recently';

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // If in future or very recent (< 45s)
  if (diffMs < 45 * 1000) {
    return 'Just now';
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatFullDateTime(isoString?: string): string {
  if (!isoString) return 'Unknown date';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
