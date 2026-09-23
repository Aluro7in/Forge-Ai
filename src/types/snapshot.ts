import { Project, Task, Milestone, Document, CanvasCard } from './forge';

export type WorkspaceViewId = 'board' | 'list' | 'milestones' | 'canvas' | 'docs' | 'inspector';

export interface SnapshotViewConfig {
  activeView: WorkspaceViewId;
  swimlaneMode?: 'none' | 'phase' | 'urgency';
  fontSizeMode?: 'compact' | 'comfortable' | 'spacious';
  theme?: 'light' | 'dark';
}

export interface SnapshotTaskBreakdown {
  todo: number;
  in_progress: number;
  review: number;
  done: number;
  archived: number;
}

export interface SnapshotPriorityBreakdown {
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

export interface SnapshotStats {
  totalTasks: number;
  tasksByStatus: SnapshotTaskBreakdown;
  tasksByPriority: SnapshotPriorityBreakdown;
  totalEstimateDays: number;
  completedEstimateDays: number;
  completionPercentage: number;
  milestoneCount: number;
  documentCount: number;
  cardCount: number;
  byteSize: number;
  formattedSize: string;
}

export interface WorkspaceSnapshotRecord {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  tags?: string[];
  isAutoBackup?: boolean;
  viewConfig: SnapshotViewConfig;
  stats: SnapshotStats;
  data: {
    project: Project;
    tasks: Task[];
    milestones: Milestone[];
    documents: Document[];
    cards: CanvasCard[];
  };
}
