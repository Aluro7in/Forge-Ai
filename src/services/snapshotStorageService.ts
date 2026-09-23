import {
  Project,
  Task,
  Milestone,
  Document,
  CanvasCard,
} from '../types/forge';
import {
  WorkspaceSnapshotRecord,
  SnapshotStats,
  SnapshotViewConfig,
  WorkspaceViewId,
} from '../types/snapshot';
import {
  INITIAL_PROJECT,
  INITIAL_TASKS,
  INITIAL_MILESTONES,
  INITIAL_DOCUMENTS,
  INITIAL_CARDS,
} from '../data/seed';

export const SNAPSHOT_STORAGE_KEY = 'forge_workspace_snapshots_v1';
export const SNAPSHOT_SCHEMA_VERSION = '1.0.0';

/**
 * Formats a raw byte count into human-readable size (e.g. "12.4 KB")
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Computes deep metrics and statistics for a given workspace data payload
 */
export function calculateSnapshotStats(data: {
  tasks: Task[];
  milestones: Milestone[];
  documents: Document[];
  cards: CanvasCard[];
}): SnapshotStats {
  const tasks = data.tasks || [];
  const milestones = data.milestones || [];
  const documents = data.documents || [];
  const cards = data.cards || [];

  const tasksByStatus = {
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
    archived: 0,
  };

  const tasksByPriority = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  let totalEstimateDays = 0;
  let completedEstimateDays = 0;

  for (const t of tasks) {
    if (t.archived) {
      tasksByStatus.archived++;
    } else if (t.status in tasksByStatus) {
      tasksByStatus[t.status as keyof typeof tasksByStatus]++;
    }

    if (t.priority in tasksByPriority) {
      tasksByPriority[t.priority as keyof typeof tasksByPriority]++;
    }

    const est = Number(t.estimateDays) || 0;
    totalEstimateDays += est;
    if (t.status === 'done') {
      completedEstimateDays += est;
    }
  }

  const completionPercentage =
    tasks.length > 0
      ? Math.round(
          (tasks.filter((t) => t.status === 'done' && !t.archived).length /
            Math.max(1, tasks.filter((t) => !t.archived).length)) *
            100
        )
      : 0;

  // Approximate payload size in bytes
  const serialized = JSON.stringify(data);
  const byteSize = typeof Blob !== 'undefined' ? new Blob([serialized]).size : serialized.length;

  return {
    totalTasks: tasks.length,
    tasksByStatus,
    tasksByPriority,
    totalEstimateDays,
    completedEstimateDays,
    completionPercentage,
    milestoneCount: milestones.length,
    documentCount: documents.length,
    cardCount: cards.length,
    byteSize,
    formattedSize: formatBytes(byteSize),
  };
}

/**
 * Creates a baseline default snapshot from seed data to seed LocalStorage if empty
 */
export function createDefaultStarterSnapshot(): WorkspaceSnapshotRecord {
  const seedData = {
    project: JSON.parse(JSON.stringify(INITIAL_PROJECT)),
    tasks: JSON.parse(JSON.stringify(INITIAL_TASKS)),
    milestones: JSON.parse(JSON.stringify(INITIAL_MILESTONES)),
    documents: JSON.parse(JSON.stringify(INITIAL_DOCUMENTS)),
    cards: JSON.parse(JSON.stringify(INITIAL_CARDS)),
  };

  const stats = calculateSnapshotStats(seedData);
  const now = new Date().toISOString();

  return {
    id: `snap_starter_baseline_${Date.now()}`,
    projectId: INITIAL_PROJECT.id,
    projectName: INITIAL_PROJECT.name,
    name: 'Initial Baseline Template',
    description: 'Clean starter workspace state with default sprints, roadmap milestones, and technical PRD.',
    createdAt: now,
    updatedAt: now,
    version: SNAPSHOT_SCHEMA_VERSION,
    tags: ['template', 'baseline', 'default'],
    isAutoBackup: false,
    viewConfig: {
      activeView: 'board',
      swimlaneMode: 'none',
      theme: 'dark',
      fontSizeMode: 'comfortable',
    },
    stats,
    data: seedData,
  };
}

/**
 * Loads all stored snapshots from LocalStorage.
 * If storage is empty, auto-seeds with the baseline snapshot.
 */
export function loadStoredSnapshots(): WorkspaceSnapshotRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [createDefaultStarterSnapshot()];
  }

  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) {
      const defaultSnap = createDefaultStarterSnapshot();
      try {
        localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify([defaultSnap]));
      } catch {
        // ignore localStorage error on initial set
      }
      return [defaultSnap];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const defaultSnap = createDefaultStarterSnapshot();
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify([defaultSnap]));
      return [defaultSnap];
    }

    // Sort newest first
    return parsed.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  } catch (error) {
    console.error('Failed to load snapshots from localStorage:', error);
    return [createDefaultStarterSnapshot()];
  }
}

/**
 * Saves a snapshot to LocalStorage.
 * If snapshot already exists by ID, it updates it. Otherwise prepends it.
 */
export function saveSnapshotToStorage(
  snapshot: WorkspaceSnapshotRecord
): { success: boolean; snapshots: WorkspaceSnapshotRecord[]; error?: string } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { success: false, snapshots: [], error: 'localStorage is not available' };
  }

  try {
    const existing = loadStoredSnapshots();
    const index = existing.findIndex((s) => s.id === snapshot.id);

    let updated: WorkspaceSnapshotRecord[];
    if (index >= 0) {
      updated = [...existing];
      updated[index] = {
        ...snapshot,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updated = [snapshot, ...existing];
    }

    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(updated));
    return { success: true, snapshots: updated };
  } catch (error: any) {
    console.error('Failed to write snapshot to localStorage:', error);
    const isQuota =
      error?.name === 'QuotaExceededError' ||
      error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      String(error).includes('quota');

    return {
      success: false,
      snapshots: loadStoredSnapshots(),
      error: isQuota
        ? 'LocalStorage quota exceeded. Please delete older snapshots to free up browser storage.'
        : `Storage write failed: ${error?.message || String(error)}`,
    };
  }
}

/**
 * Removes a snapshot by ID from LocalStorage
 */
export function deleteSnapshotFromStorage(
  snapshotId: string
): { success: boolean; snapshots: WorkspaceSnapshotRecord[]; error?: string } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { success: false, snapshots: [], error: 'localStorage is not available' };
  }

  try {
    const existing = loadStoredSnapshots();
    const updated = existing.filter((s) => s.id !== snapshotId);
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(updated));
    return { success: true, snapshots: updated };
  } catch (error: any) {
    console.error('Failed to delete snapshot from localStorage:', error);
    return {
      success: false,
      snapshots: loadStoredSnapshots(),
      error: error?.message || 'Failed to delete snapshot',
    };
  }
}

/**
 * Updates metadata (name, description, tags) of an existing snapshot
 */
export function updateSnapshotMetadata(
  snapshotId: string,
  updates: { name?: string; description?: string; tags?: string[] }
): { success: boolean; snapshots: WorkspaceSnapshotRecord[]; error?: string } {
  try {
    const existing = loadStoredSnapshots();
    const target = existing.find((s) => s.id === snapshotId);
    if (!target) {
      return { success: false, snapshots: existing, error: 'Snapshot not found' };
    }

    const updatedTarget: WorkspaceSnapshotRecord = {
      ...target,
      name: updates.name !== undefined ? updates.name.trim() : target.name,
      description: updates.description !== undefined ? updates.description.trim() : target.description,
      tags: updates.tags !== undefined ? updates.tags : target.tags,
      updatedAt: new Date().toISOString(),
    };

    return saveSnapshotToStorage(updatedTarget);
  } catch (error: any) {
    return {
      success: false,
      snapshots: loadStoredSnapshots(),
      error: error?.message || 'Failed to update snapshot',
    };
  }
}

/**
 * Builds a complete WorkspaceSnapshotRecord from live state
 */
export function buildSnapshotRecord({
  name,
  description,
  project,
  tasks,
  milestones,
  documents,
  cards,
  activeView = 'board',
  viewConfig = {},
  isAutoBackup = false,
  tags = [],
}: {
  name: string;
  description?: string;
  project: Project;
  tasks: Task[];
  milestones: Milestone[];
  documents: Document[];
  cards: CanvasCard[];
  activeView?: WorkspaceViewId;
  viewConfig?: Partial<SnapshotViewConfig>;
  isAutoBackup?: boolean;
  tags?: string[];
}): WorkspaceSnapshotRecord {
  const data = {
    project: JSON.parse(JSON.stringify(project)),
    tasks: JSON.parse(JSON.stringify(tasks)),
    milestones: JSON.parse(JSON.stringify(milestones)),
    documents: JSON.parse(JSON.stringify(documents)),
    cards: JSON.parse(JSON.stringify(cards)),
  };

  const stats = calculateSnapshotStats(data);
  const now = new Date().toISOString();
  const id = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    projectId: project.id,
    projectName: project.name,
    name: name.trim() || `Snapshot ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    description: description?.trim(),
    createdAt: now,
    updatedAt: now,
    version: SNAPSHOT_SCHEMA_VERSION,
    tags: tags.length ? tags : ['manual'],
    isAutoBackup,
    viewConfig: {
      activeView,
      swimlaneMode: viewConfig.swimlaneMode || 'none',
      theme: viewConfig.theme || 'dark',
      fontSizeMode: viewConfig.fontSizeMode || 'comfortable',
    },
    stats,
    data,
  };
}

/**
 * Exports a single snapshot record as a formatted JSON file download
 */
export function exportSnapshotAsJSON(snapshot: WorkspaceSnapshotRecord): void {
  const filename = `forge-snapshot-${snapshot.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
  const jsonContent = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports all stored snapshots as an archive bundle JSON file download
 */
export function exportAllSnapshotsAsJSON(): void {
  const snapshots = loadStoredSnapshots();
  const filename = `forge-all-snapshots-${new Date().toISOString().slice(0, 10)}.json`;
  const payload = {
    exportedAt: new Date().toISOString(),
    totalSnapshots: snapshots.length,
    version: SNAPSHOT_SCHEMA_VERSION,
    snapshots,
  };
  const jsonContent = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates and imports a snapshot from a raw JSON string
 */
export function importSnapshotFromJSONText(jsonText: string): {
  success: boolean;
  snapshot?: WorkspaceSnapshotRecord;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'File content is not a valid JSON object' };
    }

    // Check if it's already a WorkspaceSnapshotRecord
    if (parsed.data && parsed.data.tasks && Array.isArray(parsed.data.tasks)) {
      const stats = parsed.stats || calculateSnapshotStats(parsed.data);
      const imported: WorkspaceSnapshotRecord = {
        ...parsed,
        id: `snap_imported_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: parsed.name ? `${parsed.name} (Imported)` : 'Imported Snapshot',
        createdAt: parsed.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats,
      };
      saveSnapshotToStorage(imported);
      return { success: true, snapshot: imported };
    }

    // Check if it's a raw workspace export ({ project, tasks, milestones, documents, cards })
    if (parsed.tasks && Array.isArray(parsed.tasks)) {
      const project: Project = parsed.project || {
        id: `proj_${Date.now()}`,
        name: 'Imported Project',
        description: 'Workspace restored from imported JSON file',
        vision: '',
        status: 'active',
        tags: ['imported'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const data = {
        project,
        tasks: parsed.tasks,
        milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
        documents: Array.isArray(parsed.documents) ? parsed.documents : [],
        cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      };

      const stats = calculateSnapshotStats(data);
      const imported: WorkspaceSnapshotRecord = {
        id: `snap_imported_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        projectId: project.id,
        projectName: project.name,
        name: `Imported Snapshot (${parsed.tasks.length} tasks)`,
        description: `Imported from JSON file on ${new Date().toLocaleDateString()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: SNAPSHOT_SCHEMA_VERSION,
        tags: ['imported', 'file-upload'],
        isAutoBackup: false,
        viewConfig: {
          activeView: 'board',
          swimlaneMode: 'none',
          theme: 'dark',
          fontSizeMode: 'comfortable',
        },
        stats,
        data,
      };

      saveSnapshotToStorage(imported);
      return { success: true, snapshot: imported };
    }

    return {
      success: false,
      error: 'Invalid snapshot format. Must contain at least a "tasks" array or a valid WorkspaceSnapshot structure.',
    };
  } catch (error: any) {
    return {
      success: false,
      error: `JSON parsing error: ${error?.message || String(error)}`,
    };
  }
}
