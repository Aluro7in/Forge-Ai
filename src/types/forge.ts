export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  milestoneId?: string;
  estimateDays: number;
  dueDate?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type MilestoneStatus = 'planned' | 'active' | 'completed';

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  targetDate: string;
  order: number;
  status: MilestoneStatus;
  color?: string;
}

export interface DocumentBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'bullet' | 'code' | 'callout';
  content: string;
}

export interface Document {
  id: string;
  projectId: string;
  title: string;
  content: string;
  version: number;
  lastUpdatedBy: string;
  updatedAt: string;
}

export type CanvasCardType = 'note' | 'architecture' | 'decision' | 'risk' | 'metric';

export interface CanvasCard {
  id: string;
  projectId: string;
  title: string;
  content: string;
  type: CanvasCardType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  vision: string;
  status: 'active' | 'archived' | 'planning';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type ActionStatus = 'pending' | 'executing' | 'success' | 'failed' | 'waiting_approval';

export interface AffectedObject {
  type: EntityType | 'snapshot' | 'proposal' | string;
  id: string;
  title?: string;
}

export interface AgentAction {
  id: string;
  timestamp: string;
  toolName: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  result?: Record<string, any>;
  status: ActionStatus;
  durationMs?: number;
  source?: 'webmcp_browser' | 'internal_agent' | 'human_review' | 'test_runner' | string;
  affectedObjects?: AffectedObject[];
  rationale?: string;
  error?: string;
}

export interface ToolSuccessResult<T = any> {
  success: true;
  [key: string]: any;
}

export interface ToolErrorResult {
  success: false;
  error: string;
  code: 'VALIDATION_ERROR' | 'INVALID_ARGUMENT' | 'NOT_FOUND' | 'APPROVAL_REQUIRED' | 'INTERNAL_ERROR';
  [key: string]: any;
}

export type ToolResult<T = any> = ToolSuccessResult<T> | ToolErrorResult;

export type DiffActionType = 'create' | 'update' | 'delete' | 'move';
export type EntityType = 'task' | 'milestone' | 'document' | 'card' | 'project';

export interface DiffChange {
  id: string;
  actionType: DiffActionType;
  entityType: EntityType;
  entityId: string;
  entityTitle: string;
  beforeState?: any;
  afterState?: any;
  reason: string;
}

export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'undone';

export interface ChangeProposal {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  proposedBy: 'agent' | 'human';
  status: ProposalStatus;
  changes: DiffChange[];
  createdAt: string;
  appliedAt?: string;
}

export interface WorkspaceSnapshot {
  id: string;
  projectId: string;
  timestamp: string;
  label: string;
  state: {
    project: Project;
    tasks: Task[];
    milestones: Milestone[];
    documents: Document[];
    cards: CanvasCard[];
  };
}

export interface WebMCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (input: any) => Promise<any>;
}

export interface ModelContextGlobal {
  registerTool: (tool: WebMCPToolDefinition) => void;
  unregisterTool: (toolName: string) => void;
  getRegisteredTools: () => WebMCPToolDefinition[];
  execute: (toolName: string, input: any) => Promise<any>;
  onEvent?: (event: WebMCPEvent) => void;
}

export type WebMCPEvent =
  | { type: 'register'; toolName: string; description: string }
  | { type: 'unregister'; toolName: string }
  | { type: 'call_start'; toolName: string; input: any }
  | { type: 'call_end'; toolName: string; output?: any; error?: string; durationMs: number };
