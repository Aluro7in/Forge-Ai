import {
  Project,
  Task,
  Milestone,
  Document,
  CanvasCard,
  ChangeProposal,
  WorkspaceSnapshot,
  DiffChange,
  ToolResult,
  AffectedObject,
  TaskStatus,
  TaskPriority,
  CanvasCardType,
} from '../types/forge';
import {
  INITIAL_PROJECT,
  INITIAL_TASKS,
  INITIAL_MILESTONES,
  INITIAL_DOCUMENTS,
  INITIAL_CARDS,
} from '../data/seed';

export interface WorkspaceStateAccessor {
  getProject: () => Project;
  setProject: (p: Project | ((prev: Project) => Project)) => void;
  getTasks: () => Task[];
  setTasks: (t: Task[] | ((prev: Task[]) => Task[])) => void;
  getMilestones: () => Milestone[];
  setMilestones: (m: Milestone[] | ((prev: Milestone[]) => Milestone[])) => void;
  getDocuments: () => Document[];
  setDocuments: (d: Document[] | ((prev: Document[]) => Document[])) => void;
  getCards: () => CanvasCard[];
  setCards: (c: CanvasCard[] | ((prev: CanvasCard[]) => CanvasCard[])) => void;
  getProposals: () => ChangeProposal[];
  setProposals: (p: ChangeProposal[] | ((prev: ChangeProposal[]) => ChangeProposal[])) => void;
  getActiveProposal: () => ChangeProposal | null;
  setActiveProposal: (p: ChangeProposal | null) => void;
  getSnapshots: () => WorkspaceSnapshot[];
  setSnapshots: (s: WorkspaceSnapshot[] | ((prev: WorkspaceSnapshot[]) => WorkspaceSnapshot[])) => void;
}

export class WorkspaceService {
  private accessor: WorkspaceStateAccessor;

  constructor(accessor: WorkspaceStateAccessor) {
    this.accessor = accessor;
  }

  // --- Snapshot Management ---

  public takeSnapshot(label: string): WorkspaceSnapshot {
    const project = this.accessor.getProject();
    const tasks = this.accessor.getTasks();
    const milestones = this.accessor.getMilestones();
    const documents = this.accessor.getDocuments();
    const cards = this.accessor.getCards();

    const snapshot: WorkspaceSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId: project.id,
      timestamp: new Date().toISOString(),
      label,
      state: {
        project: JSON.parse(JSON.stringify(project)),
        tasks: JSON.parse(JSON.stringify(tasks)),
        milestones: JSON.parse(JSON.stringify(milestones)),
        documents: JSON.parse(JSON.stringify(documents)),
        cards: JSON.parse(JSON.stringify(cards)),
      },
    };

    this.accessor.setSnapshots((prev) => [snapshot, ...prev.slice(0, 19)]);
    return snapshot;
  }

  public undoChanges(): ToolResult & { affectedObjects?: AffectedObject[] } {
    const snapshots = this.accessor.getSnapshots();
    if (snapshots.length === 0) {
      return {
        success: false,
        error: 'No prior workspace snapshots available to undo.',
        code: 'NOT_FOUND',
      };
    }

    const targetSnapshot = snapshots[0];
    const remaining = snapshots.slice(1);

    this.accessor.setProject(targetSnapshot.state.project);
    this.accessor.setTasks(targetSnapshot.state.tasks);
    this.accessor.setMilestones(targetSnapshot.state.milestones);
    this.accessor.setDocuments(targetSnapshot.state.documents);
    this.accessor.setCards(targetSnapshot.state.cards);
    this.accessor.setSnapshots(remaining);

    // Update last proposal to undone if relevant
    this.accessor.setProposals((prev) =>
      prev.map((p, idx) => (idx === 0 && p.status === 'applied' ? { ...p, status: 'undone' } : p))
    );

    return {
      success: true,
      restoredSnapshotId: targetSnapshot.id,
      label: targetSnapshot.label,
      message: `Workspace successfully restored to snapshot: "${targetSnapshot.label}"`,
      affectedObjects: [
        { type: 'snapshot', id: targetSnapshot.id, title: targetSnapshot.label },
      ],
    };
  }

  // --- Project Domain Operations ---

  public getProjectState(input?: { projectId?: string; includeDocuments?: boolean }): ToolResult {
    const project = this.accessor.getProject();
    if (input?.projectId && input.projectId !== project.id) {
      return {
        success: false,
        error: `Project with ID "${input.projectId}" not found. Active project is "${project.id}".`,
        code: 'NOT_FOUND',
      };
    }

    const tasks = this.accessor.getTasks();
    const milestones = this.accessor.getMilestones();
    const documents = this.accessor.getDocuments();
    const cards = this.accessor.getCards();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
    const todoTasks = tasks.filter((t) => t.status === 'todo').length;
    const reviewTasks = tasks.filter((t) => t.status === 'review').length;
    const totalDaysEstimate = tasks.reduce((sum, t) => sum + (t.estimateDays || 0), 0);

    return {
      success: true,
      projectId: project.id,
      project,
      taskSummary: {
        total: totalTasks,
        done: completedTasks,
        inProgress: inProgressTasks,
        review: reviewTasks,
        todo: todoTasks,
        totalDaysEstimate,
        teamSize: 2,
        capacityDaysPerPerson14d: 10,
        totalTeamCapacityDays: 20,
      },
      milestones,
      tasks,
      cards,
      documents: input?.includeDocuments
        ? documents
        : documents.map((d) => ({ id: d.id, title: d.title, version: d.version, updatedAt: d.updatedAt })),
    };
  }

  public analyzeProject(input?: { teamSize?: number; timeframeDays?: number; projectId?: string }): ToolResult {
    const project = this.accessor.getProject();
    if (input?.projectId && input.projectId !== project.id) {
      return {
        success: false,
        error: `Project "${input.projectId}" not found.`,
        code: 'NOT_FOUND',
      };
    }

    const team = input?.teamSize !== undefined ? Number(input.teamSize) : 2;
    const days = input?.timeframeDays !== undefined ? Number(input.timeframeDays) : 14;

    if (team <= 0 || isNaN(team)) {
      return {
        success: false,
        error: 'teamSize must be a positive number greater than zero.',
        code: 'INVALID_ARGUMENT',
      };
    }
    if (days <= 0 || isNaN(days)) {
      return {
        success: false,
        error: 'timeframeDays must be a positive number greater than zero.',
        code: 'INVALID_ARGUMENT',
      };
    }

    const tasks = this.accessor.getTasks();
    const maxCapacityDays = team * (days * 0.7); // 70% direct engineering focus
    const currentEffort = tasks.reduce((sum, t) => sum + (t.estimateDays || 0), 0);
    const isOverCapacity = currentEffort > maxCapacityDays;

    const recommendations: string[] = [];
    if (isOverCapacity) {
      recommendations.push(
        `Current scope requires ${currentEffort} days, but ${team} people over ${days} days have ~${maxCapacityDays} safe engineering capacity.`
      );
      recommendations.push('Recommend pruning non-essential features and deferring post-launch items.');
    } else {
      recommendations.push(`Scope is well within team capacity (${currentEffort} / ${maxCapacityDays} days).`);
    }

    const urgentTodos = tasks
      .filter((t) => t.priority === 'urgent' && t.status === 'todo')
      .map((t) => t.title);

    return {
      success: true,
      teamSize: team,
      timeframeDays: days,
      totalWorkloadDays: currentEffort,
      safeCapacityDays: maxCapacityDays,
      isFeasible: !isOverCapacity,
      bottlenecks: urgentTodos,
      recommendations,
    };
  }

  // --- Workspace State Serialization & Search ---

  public exportWorkspaceState(input?: { pretty?: boolean }): ToolResult & {
    json?: string;
    state?: {
      version: string;
      exportedAt: string;
      project: Project;
      tasks: Task[];
      milestones: Milestone[];
      documents: Document[];
      cards: CanvasCard[];
    };
    summary?: {
      projectTitle: string;
      tasksCount: number;
      milestonesCount: number;
      documentsCount: number;
      cardsCount: number;
    };
    byteSize?: number;
    affectedObjects?: AffectedObject[];
  } {
    const project = this.accessor.getProject();
    const tasks = this.accessor.getTasks();
    const milestones = this.accessor.getMilestones();
    const documents = this.accessor.getDocuments();
    const cards = this.accessor.getCards();

    const statePayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project,
      tasks,
      milestones,
      documents,
      cards,
    };

    const indent = input?.pretty === false ? 0 : 2;
    const jsonString = JSON.stringify(statePayload, null, indent);

    return {
      success: true,
      json: jsonString,
      state: statePayload,
      summary: {
        projectTitle: project.name,
        tasksCount: tasks.length,
        milestonesCount: milestones.length,
        documentsCount: documents.length,
        cardsCount: cards.length,
      },
      byteSize: typeof Blob !== 'undefined' ? new Blob([jsonString]).size : jsonString.length,
      affectedObjects: [{ type: 'project', id: project.id, title: project.name }],
    };
  }

  public importWorkspaceState(input: {
    stateJson?: string;
    state?: any;
  }): ToolResult & {
    importedCounts?: {
      tasks: number;
      milestones: number;
      documents: number;
      cards: number;
    };
    affectedObjects?: AffectedObject[];
  } {
    if (!input || (!input.stateJson && !input.state)) {
      return {
        success: false,
        error: 'Either "stateJson" string or "state" object must be provided to import_workspace_state.',
        code: 'VALIDATION_ERROR',
      };
    }

    let parsedState: any = input.state;
    if (input.stateJson) {
      try {
        parsedState = JSON.parse(input.stateJson);
      } catch (err: any) {
        return {
          success: false,
          error: `Malformed JSON provided in "stateJson": ${err?.message || String(err)}`,
          code: 'VALIDATION_ERROR',
        };
      }
    }

    if (!parsedState || typeof parsedState !== 'object') {
      return {
        success: false,
        error: 'Parsed state must be a valid JSON object.',
        code: 'VALIDATION_ERROR',
      };
    }

    if (!parsedState.project && !Array.isArray(parsedState.tasks)) {
      return {
        success: false,
        error: 'Imported state must contain at least a "project" definition or a "tasks" array.',
        code: 'VALIDATION_ERROR',
      };
    }

    // Take snapshot before importing for one-click undo safety
    this.takeSnapshot('Before importing workspace state');

    if (parsedState.project && typeof parsedState.project === 'object') {
      this.accessor.setProject(parsedState.project);
    }
    if (Array.isArray(parsedState.tasks)) {
      this.accessor.setTasks(parsedState.tasks);
    }
    if (Array.isArray(parsedState.milestones)) {
      this.accessor.setMilestones(parsedState.milestones);
    }
    if (Array.isArray(parsedState.documents)) {
      this.accessor.setDocuments(parsedState.documents);
    }
    if (Array.isArray(parsedState.cards)) {
      this.accessor.setCards(parsedState.cards);
    }

    const tasksCount = Array.isArray(parsedState.tasks) ? parsedState.tasks.length : 0;
    const milestonesCount = Array.isArray(parsedState.milestones) ? parsedState.milestones.length : 0;
    const documentsCount = Array.isArray(parsedState.documents) ? parsedState.documents.length : 0;
    const cardsCount = Array.isArray(parsedState.cards) ? parsedState.cards.length : 0;

    return {
      success: true,
      message: 'Workspace state successfully restored.',
      importedCounts: {
        tasks: tasksCount,
        milestones: milestonesCount,
        documents: documentsCount,
        cards: cardsCount,
      },
      affectedObjects: [
        {
          type: 'project',
          id: parsedState.project?.id || 'restored-project',
          title: parsedState.project?.name || 'Restored Project',
        },
      ],
    };
  }

  public searchWorkspace(input: {
    query: string;
    filterType?: 'all' | 'task' | 'milestone' | 'document';
    limit?: number;
  }): ToolResult & {
    query?: string;
    totalMatches?: number;
    results?: Array<{
      id: string;
      type: 'task' | 'milestone' | 'document';
      title: string;
      subtitle?: string;
      snippet: string;
      matchedFields: string[];
      metadata?: Record<string, any>;
    }>;
    affectedObjects?: AffectedObject[];
  } {
    if (!input || typeof input.query !== 'string' || !input.query.trim()) {
      return {
        success: false,
        error: 'Search "query" parameter is required and cannot be empty.',
        code: 'VALIDATION_ERROR',
        query: input?.query || '',
        totalMatches: 0,
        results: [],
      };
    }

    const query = input.query.trim().toLowerCase();
    const filter = input.filterType || 'all';
    const limit = Math.max(1, Math.min(input.limit || 20, 100));

    const tasks = this.accessor.getTasks();
    const milestones = this.accessor.getMilestones();
    const documents = this.accessor.getDocuments();

    interface SearchMatch {
      id: string;
      type: 'task' | 'milestone' | 'document';
      title: string;
      subtitle?: string;
      snippet: string;
      score: number;
      matchedFields: string[];
      metadata?: Record<string, any>;
    }

    const matches: SearchMatch[] = [];

    // Search tasks
    if (filter === 'all' || filter === 'task') {
      for (const t of tasks) {
        let score = 0;
        const matchedFields: string[] = [];
        const titleLower = t.title.toLowerCase();
        const descLower = (t.description || '').toLowerCase();
        const tagsJoined = (t.tags || []).join(' ').toLowerCase();
        const assigneeLower = (t.assignee || '').toLowerCase();

        if (titleLower.includes(query)) {
          score += 10;
          matchedFields.push('title');
        }
        if (descLower.includes(query)) {
          score += 5;
          matchedFields.push('description');
        }
        if (tagsJoined.includes(query)) {
          score += 4;
          matchedFields.push('tags');
        }
        if (assigneeLower.includes(query)) {
          score += 3;
          matchedFields.push('assignee');
        }
        if (t.priority.toLowerCase().includes(query) || t.status.toLowerCase().includes(query)) {
          score += 2;
          matchedFields.push('status_or_priority');
        }

        if (score > 0) {
          matches.push({
            id: t.id,
            type: 'task',
            title: t.title,
            subtitle: `${t.status.replace('_', ' ')} • ${t.priority} • ${t.assignee || 'Unassigned'}`,
            snippet:
              t.description ||
              `Task estimated at ${t.estimateDays || 0} days with tags [${(t.tags || []).join(', ')}]`,
            score,
            matchedFields,
            metadata: {
              status: t.status,
              priority: t.priority,
              assignee: t.assignee,
              estimateDays: t.estimateDays,
            },
          });
        }
      }
    }

    // Search milestones
    if (filter === 'all' || filter === 'milestone') {
      for (const m of milestones) {
        let score = 0;
        const matchedFields: string[] = [];
        const titleLower = m.title.toLowerCase();
        const descLower = (m.description || '').toLowerCase();
        const statusLower = (m.status || '').toLowerCase();

        if (titleLower.includes(query)) {
          score += 10;
          matchedFields.push('title');
        }
        if (descLower.includes(query)) {
          score += 5;
          matchedFields.push('description');
        }
        if (statusLower.includes(query)) {
          score += 3;
          matchedFields.push('status');
        }

        if (score > 0) {
          matches.push({
            id: m.id,
            type: 'milestone',
            title: m.title,
            subtitle: `Target: ${m.targetDate} • ${m.status}`,
            snippet: m.description || `Milestone #${m.order} targeting ${m.targetDate}`,
            score,
            matchedFields,
            metadata: { targetDate: m.targetDate, status: m.status, order: m.order },
          });
        }
      }
    }

    // Search documents
    if (filter === 'all' || filter === 'document') {
      for (const d of documents) {
        let score = 0;
        const matchedFields: string[] = [];
        const titleLower = d.title.toLowerCase();
        const contentLower = (d.content || '').toLowerCase();
        const authorLower = (d.lastUpdatedBy || '').toLowerCase();

        if (titleLower.includes(query)) {
          score += 10;
          matchedFields.push('title');
        }
        if (contentLower.includes(query)) {
          score += 6;
          matchedFields.push('content');
        }
        if (authorLower.includes(query)) {
          score += 3;
          matchedFields.push('lastUpdatedBy');
        }

        if (score > 0) {
          let snippet = d.content;
          const matchIdx = contentLower.indexOf(query);
          if (matchIdx >= 0) {
            const start = Math.max(0, matchIdx - 40);
            const end = Math.min(d.content.length, matchIdx + query.length + 60);
            snippet =
              (start > 0 ? '...' : '') +
              d.content.substring(start, end).replace(/\n/g, ' ') +
              (end < d.content.length ? '...' : '');
          } else {
            snippet = d.content.substring(0, 100) + '...';
          }

          matches.push({
            id: d.id,
            type: 'document',
            title: d.title,
            subtitle: `v${d.version} • updated by ${d.lastUpdatedBy} on ${d.updatedAt}`,
            snippet,
            score,
            matchedFields,
            metadata: { version: d.version, lastUpdatedBy: d.lastUpdatedBy },
          });
        }
      }
    }

    matches.sort((a, b) => b.score - a.score);
    const paginated = matches.slice(0, limit);

    return {
      success: true,
      query: input.query,
      totalMatches: matches.length,
      results: paginated.map(({ score, ...rest }) => rest),
      affectedObjects: paginated.map((r) => ({ type: r.type, id: r.id, title: r.title })),
    };
  }

  // --- Task Domain Operations ---

  public createTask(input: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    assignee?: string;
    milestoneId?: string;
    estimateDays?: number;
    tags?: string[];
    dueDate?: string;
    projectId?: string;
  }): ToolResult & { affectedObjects?: AffectedObject[] } {
    if (!input || typeof input.title !== 'string' || !input.title.trim()) {
      return {
        success: false,
        error: 'Task "title" is required and cannot be empty.',
        code: 'VALIDATION_ERROR',
      };
    }

    const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
    if (input.priority && !validPriorities.includes(input.priority)) {
      return {
        success: false,
        error: `Invalid priority "${input.priority}". Must be one of: ${validPriorities.join(', ')}`,
        code: 'INVALID_ARGUMENT',
      };
    }

    if (input.estimateDays !== undefined && (isNaN(Number(input.estimateDays)) || Number(input.estimateDays) < 0)) {
      return {
        success: false,
        error: 'estimateDays must be a non-negative number.',
        code: 'INVALID_ARGUMENT',
      };
    }

    const currentProject = this.accessor.getProject();
    if (input.projectId && input.projectId !== currentProject.id) {
      return {
        success: false,
        error: `Project "${input.projectId}" not found.`,
        code: 'NOT_FOUND',
      };
    }

    // Auto-snapshot before mutation for reliable undo
    this.takeSnapshot(`Create task: ${input.title.trim()}`);

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      projectId: currentProject.id,
      title: input.title.trim(),
      description: input.description || '',
      status: 'todo',
      priority: input.priority || 'medium',
      assignee: input.assignee || 'Founder A (Tech)',
      milestoneId: input.milestoneId || this.accessor.getMilestones()[0]?.id,
      estimateDays: input.estimateDays !== undefined ? Number(input.estimateDays) : 1,
      dueDate: input.dueDate,
      tags: input.tags || ['WebMCPCreated'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.accessor.setTasks((prev) => [...prev, newTask]);

    return {
      success: true,
      taskId: newTask.id,
      task: newTask,
      affectedObjects: [{ type: 'task', id: newTask.id, title: newTask.title }],
    };
  }

  public bulkApplyTasks(input: {
    tasks: Array<{
      title: string;
      description?: string;
      priority?: TaskPriority;
      assignee?: string;
      milestoneId?: string;
      estimateDays?: number;
      tags?: string[];
      dueDate?: string;
    }>;
    projectId?: string;
  }): ToolResult & { affectedObjects?: AffectedObject[]; tasks?: Task[]; count?: number } {
    if (!input || !Array.isArray(input.tasks)) {
      return {
        success: false,
        error: 'Required field "tasks" must be an array.',
        code: 'VALIDATION_ERROR',
      };
    }

    if (input.tasks.length === 0) {
      return {
        success: false,
        error: 'Tasks array cannot be empty.',
        code: 'VALIDATION_ERROR',
      };
    }

    const currentProject = this.accessor.getProject();
    if (input.projectId && input.projectId !== currentProject.id) {
      return {
        success: false,
        error: `Project "${input.projectId}" not found. Active project is "${currentProject.id}".`,
        code: 'NOT_FOUND',
      };
    }

    const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
    const validatedNewTasks: Task[] = [];
    const defaultMilestoneId = this.accessor.getMilestones()[0]?.id;

    for (let i = 0; i < input.tasks.length; i++) {
      const item = input.tasks[i];
      if (!item || typeof item.title !== 'string' || !item.title.trim()) {
        return {
          success: false,
          error: `Task at index ${i} is missing a valid "title".`,
          code: 'VALIDATION_ERROR',
        };
      }

      if (item.priority && !validPriorities.includes(item.priority)) {
        return {
          success: false,
          error: `Task at index ${i} has invalid priority "${item.priority}". Must be one of: ${validPriorities.join(', ')}`,
          code: 'INVALID_ARGUMENT',
        };
      }

      if (item.estimateDays !== undefined && (isNaN(Number(item.estimateDays)) || Number(item.estimateDays) < 0)) {
        return {
          success: false,
          error: `Task at index ${i} has invalid estimateDays "${item.estimateDays}". Must be non-negative.`,
          code: 'INVALID_ARGUMENT',
        };
      }

      const now = new Date().toISOString();
      const task: Task = {
        id: `task-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: currentProject.id,
        title: item.title.trim(),
        description: item.description || '',
        status: 'todo',
        priority: item.priority || 'medium',
        assignee: item.assignee || 'Founder A (Tech)',
        milestoneId: item.milestoneId || defaultMilestoneId,
        estimateDays: item.estimateDays !== undefined ? Number(item.estimateDays) : 1,
        dueDate: item.dueDate,
        tags: item.tags || ['WebMCPCreated', 'BulkCreated'],
        createdAt: now,
        updatedAt: now,
      };
      validatedNewTasks.push(task);
    }

    // Atomic snapshot before mutation for reliable rollback of entire batch
    this.takeSnapshot(`Bulk apply ${validatedNewTasks.length} tasks`);

    // Single atomic state update to minimize UI re-renders
    this.accessor.setTasks((prev) => [...prev, ...validatedNewTasks]);

    return {
      success: true,
      count: validatedNewTasks.length,
      tasks: validatedNewTasks,
      taskIds: validatedNewTasks.map((t) => t.id),
      affectedObjects: validatedNewTasks.map((t) => ({ type: 'task', id: t.id, title: t.title })),
    };
  }

  public updateTask(input: {
    taskId: string;
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee?: string;
    milestoneId?: string;
    timeSpentSeconds?: number;
    estimateDays?: number;
    tags?: string[];
    dueDate?: string;
  }): ToolResult & { affectedObjects?: AffectedObject[]; task?: Task } {
    if (!input || !input.taskId || typeof input.taskId !== 'string') {
      return {
        success: false,
        error: 'Required field "taskId" is missing.',
        code: 'VALIDATION_ERROR',
      };
    }

    const tasks = this.accessor.getTasks();
    const existing = tasks.find((t) => t.id === input.taskId);
    if (!existing) {
      return {
        success: false,
        error: `Task with id "${input.taskId}" not found in current project.`,
        code: 'NOT_FOUND',
      };
    }

    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
    if (input.status && !validStatuses.includes(input.status)) {
      return {
        success: false,
        error: `Invalid status "${input.status}". Allowed values: ${validStatuses.join(', ')}`,
        code: 'INVALID_ARGUMENT',
      };
    }

    const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
    if (input.priority && !validPriorities.includes(input.priority)) {
      return {
        success: false,
        error: `Invalid priority "${input.priority}". Allowed values: ${validPriorities.join(', ')}`,
        code: 'INVALID_ARGUMENT',
      };
    }

    this.takeSnapshot(`Update task: ${existing.title}`);

    let updatedTask: Task = { ...existing };

    this.accessor.setTasks((prev) =>
      prev.map((t) => {
        if (t.id === input.taskId) {
          updatedTask = {
            ...t,
            ...(input.title !== undefined ? { title: input.title.trim() } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.priority !== undefined ? { priority: input.priority } : {}),
            ...(input.assignee !== undefined ? { assignee: input.assignee } : {}),
            ...(input.milestoneId !== undefined ? { milestoneId: input.milestoneId } : {}),
            ...(input.timeSpentSeconds !== undefined ? { timeSpentSeconds: Math.max(0, Number(input.timeSpentSeconds)) } : {}),
            ...(input.estimateDays !== undefined ? { estimateDays: Number(input.estimateDays) } : {}),
            ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
            ...(input.tags !== undefined ? { tags: input.tags } : {}),
            updatedAt: new Date().toISOString(),
          };
          return updatedTask;
        }
        return t;
      })
    );

    return {
      success: true,
      taskId: input.taskId,
      task: updatedTask,
      affectedObjects: [{ type: 'task', id: input.taskId, title: updatedTask.title }],
    };
  }

  public logTaskTime(input: {
    taskId: string;
    secondsToAdd?: number;
    totalSeconds?: number;
  }): ToolResult & { affectedObjects?: AffectedObject[]; task?: Task; timeSpentSeconds?: number } {
    if (!input || !input.taskId) {
      return {
        success: false,
        error: 'Required field "taskId" is missing.',
        code: 'VALIDATION_ERROR',
      };
    }

    const tasks = this.accessor.getTasks();
    const existing = tasks.find((t) => t.id === input.taskId);
    if (!existing) {
      return {
        success: false,
        error: `Task with id "${input.taskId}" not found.`,
        code: 'NOT_FOUND',
      };
    }

    const currentSeconds = existing.timeSpentSeconds || 0;
    const newSeconds =
      input.totalSeconds !== undefined
        ? Math.max(0, Math.round(Number(input.totalSeconds)))
        : Math.max(0, Math.round(currentSeconds + Number(input.secondsToAdd || 0)));

    let updatedTask: Task = {
      ...existing,
      timeSpentSeconds: newSeconds,
      updatedAt: new Date().toISOString(),
    };

    this.accessor.setTasks((prev) =>
      prev.map((t) => (t.id === input.taskId ? updatedTask : t))
    );

    return {
      success: true,
      taskId: input.taskId,
      timeSpentSeconds: newSeconds,
      task: updatedTask,
      affectedObjects: [{ type: 'task', id: input.taskId, title: updatedTask.title }],
    };
  }

  public moveTask(input: {
    taskId: string;
    newStatus: TaskStatus;
  }): ToolResult & { affectedObjects?: AffectedObject[] } {
    if (!input || !input.taskId) {
      return {
        success: false,
        error: 'Required argument "taskId" is missing.',
        code: 'VALIDATION_ERROR',
      };
    }

    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
    if (!input.newStatus || !validStatuses.includes(input.newStatus)) {
      return {
        success: false,
        error: `Invalid or missing "newStatus". Allowed values: ${validStatuses.join(', ')}`,
        code: 'INVALID_ARGUMENT',
      };
    }

    const tasks = this.accessor.getTasks();
    const existing = tasks.find((t) => t.id === input.taskId);
    if (!existing) {
      return {
        success: false,
        error: `Task with id "${input.taskId}" not found.`,
        code: 'NOT_FOUND',
      };
    }

    this.takeSnapshot(`Move task "${existing.title}" to ${input.newStatus}`);

    let updatedTask: Task = { ...existing, status: input.newStatus, updatedAt: new Date().toISOString() };

    this.accessor.setTasks((prev) =>
      prev.map((t) => (t.id === input.taskId ? updatedTask : t))
    );

    return {
      success: true,
      taskId: input.taskId,
      status: input.newStatus,
      task: updatedTask,
      affectedObjects: [{ type: 'task', id: input.taskId, title: updatedTask.title }],
    };
  }

  public reorderTasks(input: {
    taskId: string;
    targetStatus: TaskStatus;
    targetIndex: number;
  }): ToolResult & { affectedObjects?: AffectedObject[]; task?: Task; tasks?: Task[] } {
    if (!input || !input.taskId) {
      return {
        success: false,
        error: 'Required argument "taskId" is missing.',
        code: 'VALIDATION_ERROR',
      };
    }

    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
    if (!input.targetStatus || !validStatuses.includes(input.targetStatus)) {
      return {
        success: false,
        error: `Invalid or missing "targetStatus". Allowed values: ${validStatuses.join(', ')}`,
        code: 'INVALID_ARGUMENT',
      };
    }

    const allTasks = this.accessor.getTasks();
    const movingTask = allTasks.find((t) => t.id === input.taskId);
    if (!movingTask) {
      return {
        success: false,
        error: `Task with id "${input.taskId}" not found.`,
        code: 'NOT_FOUND',
      };
    }

    this.takeSnapshot(`Reorder task "${movingTask.title}" in ${input.targetStatus}`);

    const updatedMovingTask: Task = {
      ...movingTask,
      status: input.targetStatus,
      updatedAt: new Date().toISOString(),
    };

    // Remove the moving task first
    const withoutMoving = allTasks.filter((t) => t.id !== input.taskId);
    const targetColTasks = withoutMoving.filter((t) => t.status === input.targetStatus);

    const safeTargetIndex = Math.max(0, Math.min(Number(input.targetIndex) || 0, targetColTasks.length));

    let finalTasks: Task[];
    if (targetColTasks.length === 0) {
      finalTasks = [...withoutMoving, updatedMovingTask];
    } else if (safeTargetIndex === 0) {
      const firstColTask = targetColTasks[0];
      const insertPos = withoutMoving.findIndex((t) => t.id === firstColTask.id);
      finalTasks = [
        ...withoutMoving.slice(0, insertPos),
        updatedMovingTask,
        ...withoutMoving.slice(insertPos),
      ];
    } else if (safeTargetIndex >= targetColTasks.length) {
      const lastColTask = targetColTasks[targetColTasks.length - 1];
      const insertPos = withoutMoving.findIndex((t) => t.id === lastColTask.id);
      finalTasks = [
        ...withoutMoving.slice(0, insertPos + 1),
        updatedMovingTask,
        ...withoutMoving.slice(insertPos + 1),
      ];
    } else {
      const refTask = targetColTasks[safeTargetIndex];
      const insertPos = withoutMoving.findIndex((t) => t.id === refTask.id);
      finalTasks = [
        ...withoutMoving.slice(0, insertPos),
        updatedMovingTask,
        ...withoutMoving.slice(insertPos),
      ];
    }

    this.accessor.setTasks(finalTasks);

    return {
      success: true,
      taskId: input.taskId,
      targetStatus: input.targetStatus,
      targetIndex: safeTargetIndex,
      task: updatedMovingTask,
      tasks: finalTasks,
      affectedObjects: [{ type: 'task', id: input.taskId, title: updatedMovingTask.title }],
    };
  }

  public deleteTask(input: { taskId: string }): ToolResult & { affectedObjects?: AffectedObject[] } {
    if (!input || !input.taskId) {
      return {
        success: false,
        error: 'Required argument "taskId" is missing.',
        code: 'VALIDATION_ERROR',
      };
    }

    const tasks = this.accessor.getTasks();
    const existing = tasks.find((t) => t.id === input.taskId);
    if (!existing) {
      return {
        success: false,
        error: `Task with id "${input.taskId}" does not exist in workspace.`,
        code: 'NOT_FOUND',
      };
    }

    this.takeSnapshot(`Delete task: ${existing.title}`);
    this.accessor.setTasks((prev) => prev.filter((t) => t.id !== input.taskId));

    return {
      success: true,
      deletedTaskId: input.taskId,
      affectedObjects: [{ type: 'task', id: input.taskId, title: existing.title }],
    };
  }

  // --- Planning & Milestone Operations ---

  public generatePlan(input: {
    goal: string;
    teamSize?: number;
    durationDays?: number;
  }): ToolResult {
    if (!input || typeof input.goal !== 'string' || !input.goal.trim()) {
      return {
        success: false,
        error: 'Planning "goal" is required and cannot be empty.',
        code: 'VALIDATION_ERROR',
      };
    }

    const team = input.teamSize || 2;
    const days = input.durationDays || 14;
    const maxCapacity = team * days * 0.7;

    return {
      success: true,
      planTitle: `Execution Plan: ${input.goal.trim()}`,
      teamSize: team,
      durationDays: days,
      strategy: 'Partition into 2 sequential milestones with strict scope gates and 70% capacity limits.',
      proposedMilestoneCount: 2,
      recommendedCapacityLimitDays: maxCapacity,
      suggestedMilestones: [
        { title: 'Phase 1: Core Foundation & Stability', days: Math.floor(days / 2), focus: 'Hard requirements & tool interfaces' },
        { title: 'Phase 2: Launch Readiness & Polish', days: Math.ceil(days / 2), focus: 'Auditing, docs, and human approvals' },
      ],
    };
  }

  public createMilestone(input: {
    title: string;
    targetDate: string;
    description?: string;
    order?: number;
    color?: string;
  }): ToolResult & { affectedObjects?: AffectedObject[] } {
    if (!input || !input.title || !input.title.trim()) {
      return {
        success: false,
        error: 'Milestone "title" is required.',
        code: 'VALIDATION_ERROR',
      };
    }
    if (!input.targetDate) {
      return {
        success: false,
        error: 'Milestone "targetDate" is required.',
        code: 'VALIDATION_ERROR',
      };
    }

    this.takeSnapshot(`Create milestone: ${input.title}`);

    const newMilestone: Milestone = {
      id: `ms-${Date.now()}`,
      projectId: this.accessor.getProject().id,
      title: input.title.trim(),
      description: input.description || '',
      targetDate: input.targetDate,
      order: input.order || this.accessor.getMilestones().length + 1,
      status: 'planned',
      color: input.color || '#4F46E5',
    };

    this.accessor.setMilestones((prev) => [...prev, newMilestone]);

    return {
      success: true,
      milestoneId: newMilestone.id,
      milestone: newMilestone,
      affectedObjects: [{ type: 'milestone', id: newMilestone.id, title: newMilestone.title }],
    };
  }

  public updateMilestone(input: {
    milestoneId: string;
    title?: string;
    targetDate?: string;
    status?: 'planned' | 'active' | 'completed';
    description?: string;
  }): ToolResult & { affectedObjects?: AffectedObject[] } {
    if (!input || !input.milestoneId) {
      return {
        success: false,
        error: 'Required argument "milestoneId" is missing.',
        code: 'VALIDATION_ERROR',
      };
    }

    const milestones = this.accessor.getMilestones();
    const existing = milestones.find((m) => m.id === input.milestoneId);
    if (!existing) {
      return {
        success: false,
        error: `Milestone with id "${input.milestoneId}" not found.`,
        code: 'NOT_FOUND',
      };
    }

    this.takeSnapshot(`Update milestone: ${existing.title}`);

    let updated = { ...existing };
    this.accessor.setMilestones((prev) =>
      prev.map((m) => {
        if (m.id === input.milestoneId) {
          updated = { ...m, ...input };
          return updated;
        }
        return m;
      })
    );

    return {
      success: true,
      milestoneId: input.milestoneId,
      milestone: updated,
      affectedObjects: [{ type: 'milestone', id: input.milestoneId, title: updated.title }],
    };
  }

  public deleteMilestone(input: { milestoneId: string }): ToolResult & { affectedObjects?: AffectedObject[] } {
    if (!input || !input.milestoneId) {
      return {
        success: false,
        error: 'Required argument "milestoneId" is missing.',
        code: 'VALIDATION_ERROR',
      };
    }

    const milestones = this.accessor.getMilestones();
    const existing = milestones.find((m) => m.id === input.milestoneId);
    if (!existing) {
      return {
        success: false,
        error: `Milestone "${input.milestoneId}" does not exist.`,
        code: 'NOT_FOUND',
      };
    }

    this.takeSnapshot(`Delete milestone: ${existing.title}`);
    this.accessor.setMilestones((prev) => prev.filter((m) => m.id !== input.milestoneId));

    return {
      success: true,
      deletedMilestoneId: input.milestoneId,
      affectedObjects: [{ type: 'milestone', id: input.milestoneId, title: existing.title }],
    };
  }

  // --- Canvas 2D Board Operations ---

  public createCanvasCard(input: {
    title: string;
    content: string;
    type: CanvasCardType;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }): ToolResult & { affectedObjects?: AffectedObject[] } {
    if (!input || !input.title?.trim() || !input.content?.trim() || !input.type) {
      return {
        success: false,
        error: 'Canvas card requires "title", "content", and "type".',
        code: 'VALIDATION_ERROR',
      };
    }

    const validTypes: CanvasCardType[] = ['note', 'architecture', 'decision', 'risk', 'metric'];
    if (!validTypes.includes(input.type)) {
      return {
        success: false,
        error: `Invalid card type "${input.type}". Must be one of: ${validTypes.join(', ')}`,
        code: 'INVALID_ARGUMENT',
      };
    }

    this.takeSnapshot(`Add canvas card: ${input.title}`);

    const newCard: CanvasCard = {
      id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      projectId: this.accessor.getProject().id,
      title: input.title.trim(),
      content: input.content.trim(),
      type: input.type,
      x: input.x !== undefined ? Number(input.x) : Math.floor(Math.random() * 260) + 40,
      y: input.y !== undefined ? Number(input.y) : Math.floor(Math.random() * 180) + 40,
      width: input.width || 260,
      height: input.height || 140,
    };

    this.accessor.setCards((prev) => [...prev, newCard]);

    return {
      success: true,
      cardId: newCard.id,
      card: newCard,
      affectedObjects: [{ type: 'card', id: newCard.id, title: newCard.title }],
    };
  }

  public updateCanvasCard(input: {
    cardId: string;
    title?: string;
    content?: string;
    x?: number;
    y?: number;
  }): ToolResult & { affectedObjects?: AffectedObject[] } {
    if (!input || !input.cardId) {
      return {
        success: false,
        error: 'Required field "cardId" is missing.',
        code: 'VALIDATION_ERROR',
      };
    }

    const cards = this.accessor.getCards();
    const existing = cards.find((c) => c.id === input.cardId);
    if (!existing) {
      return {
        success: false,
        error: `Canvas card "${input.cardId}" not found.`,
        code: 'NOT_FOUND',
      };
    }

    this.takeSnapshot(`Update card: ${existing.title}`);

    let updated = { ...existing };
    this.accessor.setCards((prev) =>
      prev.map((c) => {
        if (c.id === input.cardId) {
          updated = { ...c, ...input };
          return updated;
        }
        return c;
      })
    );

    return {
      success: true,
      cardId: input.cardId,
      card: updated,
      affectedObjects: [{ type: 'card', id: input.cardId, title: updated.title }],
    };
  }

  public deleteCanvasCard(input: { cardId: string }): ToolResult & { affectedObjects?: AffectedObject[] } {
    if (!input || !input.cardId) {
      return {
        success: false,
        error: 'Required argument "cardId" is missing.',
        code: 'VALIDATION_ERROR',
      };
    }

    const cards = this.accessor.getCards();
    const existing = cards.find((c) => c.id === input.cardId);
    if (!existing) {
      return {
        success: false,
        error: `Canvas card "${input.cardId}" not found.`,
        code: 'NOT_FOUND',
      };
    }

    this.takeSnapshot(`Delete card: ${existing.title}`);
    this.accessor.setCards((prev) => prev.filter((c) => c.id !== input.cardId));

    return {
      success: true,
      deletedCardId: input.cardId,
      affectedObjects: [{ type: 'card', id: input.cardId, title: existing.title }],
    };
  }

  // --- Document Specification Operations ---

  public createDocument(input: {
    title: string;
    content: string;
  }): ToolResult & { affectedObjects?: AffectedObject[] } {
    if (!input || !input.title?.trim() || !input.content?.trim()) {
      return {
        success: false,
        error: 'Document requires both "title" and "content".',
        code: 'VALIDATION_ERROR',
      };
    }

    this.takeSnapshot(`Create document: ${input.title}`);

    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      projectId: this.accessor.getProject().id,
      title: input.title.trim(),
      content: input.content.trim(),
      version: 1,
      lastUpdatedBy: 'WebMCP Agent',
      updatedAt: new Date().toISOString(),
    };

    this.accessor.setDocuments((prev) => [...prev, newDoc]);

    return {
      success: true,
      documentId: newDoc.id,
      document: newDoc,
      affectedObjects: [{ type: 'document', id: newDoc.id, title: newDoc.title }],
    };
  }

  public updateDocument(input: {
    documentId: string;
    content: string;
  }): ToolResult & { affectedObjects?: AffectedObject[] } {
    if (!input || !input.documentId || input.content === undefined) {
      return {
        success: false,
        error: 'Both "documentId" and "content" are required.',
        code: 'VALIDATION_ERROR',
      };
    }

    const docs = this.accessor.getDocuments();
    const existing = docs.find((d) => d.id === input.documentId);
    if (!existing) {
      return {
        success: false,
        error: `Document "${input.documentId}" not found.`,
        code: 'NOT_FOUND',
      };
    }

    this.takeSnapshot(`Update document: ${existing.title}`);

    let updatedDoc = { ...existing };
    this.accessor.setDocuments((prev) =>
      prev.map((d) => {
        if (d.id === input.documentId) {
          updatedDoc = {
            ...d,
            content: input.content,
            version: d.version + 1,
            lastUpdatedBy: 'WebMCP Agent',
            updatedAt: new Date().toISOString(),
          };
          return updatedDoc;
        }
        return d;
      })
    );

    return {
      success: true,
      documentId: input.documentId,
      document: updatedDoc,
      affectedObjects: [{ type: 'document', id: input.documentId, title: updatedDoc.title }],
    };
  }

  // --- Human-in-the-Loop Approval & Governance Operations ---

  public proposeChanges(input: {
    title: string;
    summary: string;
    changes: DiffChange[];
  }): ToolResult & { affectedObjects?: AffectedObject[] } {
    if (!input || !input.title?.trim() || !input.summary?.trim()) {
      return {
        success: false,
        error: 'Proposal requires "title" and "summary".',
        code: 'VALIDATION_ERROR',
      };
    }

    if (!Array.isArray(input.changes) || input.changes.length === 0) {
      return {
        success: false,
        error: 'Proposal "changes" must be a non-empty array of DiffChange objects.',
        code: 'VALIDATION_ERROR',
      };
    }

    // Validate each change
    for (let i = 0; i < input.changes.length; i++) {
      const ch = input.changes[i];
      if (!ch.actionType || !ch.entityType || !ch.entityId || !ch.entityTitle || !ch.reason) {
        return {
          success: false,
          error: `Change item at index ${i} is missing required fields (actionType, entityType, entityId, entityTitle, reason).`,
          code: 'VALIDATION_ERROR',
        };
      }
    }

    const newProposal: ChangeProposal = {
      id: `prop-${Date.now()}`,
      projectId: this.accessor.getProject().id,
      title: input.title.trim(),
      summary: input.summary.trim(),
      proposedBy: 'agent',
      status: 'pending',
      changes: input.changes,
      createdAt: new Date().toISOString(),
    };

    this.accessor.setProposals((prev) => [newProposal, ...prev]);
    this.accessor.setActiveProposal(newProposal);

    const affectedObjects: AffectedObject[] = input.changes.map((c) => ({
      type: c.entityType,
      id: c.entityId,
      title: c.entityTitle,
    }));
    affectedObjects.unshift({ type: 'proposal', id: newProposal.id, title: newProposal.title });

    return {
      success: true,
      proposalId: newProposal.id,
      status: 'pending_human_review',
      changeCount: newProposal.changes.length,
      message: `Proposal "${newProposal.title}" has been staged with ${newProposal.changes.length} changes. Waiting for human approval.`,
      affectedObjects,
    };
  }

  public applyApprovedChanges(input: {
    proposalId: string;
    humanConfirmed?: boolean;
  }): ToolResult & { affectedObjects?: AffectedObject[] } {
    if (!input || !input.proposalId) {
      return {
        success: false,
        error: 'Required parameter "proposalId" is missing.',
        code: 'VALIDATION_ERROR',
      };
    }

    const proposals = this.accessor.getProposals();
    const proposal = proposals.find((p) => p.id === input.proposalId) || this.accessor.getActiveProposal();
    if (!proposal) {
      return {
        success: false,
        error: `Proposal with ID "${input.proposalId}" not found.`,
        code: 'NOT_FOUND',
      };
    }

    // SAFETY CHECK: Ensure agent cannot bypass human approval
    if (proposal.status === 'pending' && !input.humanConfirmed) {
      return {
        success: false,
        error: `Proposal "${proposal.title}" is in pending state and requires human approval before applying changes to live state.`,
        code: 'APPROVAL_REQUIRED',
        proposalId: proposal.id,
      };
    }

    // 1. Take snapshot before applying
    this.takeSnapshot(`Before applying proposal: ${proposal.title}`);

    // 2. Clone current entities
    let updatedTasks = [...this.accessor.getTasks()];
    let updatedMilestones = [...this.accessor.getMilestones()];
    let updatedDocs = [...this.accessor.getDocuments()];
    let updatedCards = [...this.accessor.getCards()];

    for (const change of proposal.changes) {
      if (change.entityType === 'task') {
        if (change.actionType === 'create' && change.afterState) {
          updatedTasks.push(change.afterState);
        } else if (change.actionType === 'delete') {
          updatedTasks = updatedTasks.filter((t) => t.id !== change.entityId);
        } else if (change.actionType === 'update' || change.actionType === 'move') {
          const idx = updatedTasks.findIndex((t) => t.id === change.entityId);
          if (idx >= 0 && change.afterState) {
            updatedTasks[idx] = { ...updatedTasks[idx], ...change.afterState, updatedAt: new Date().toISOString() };
          }
        }
      } else if (change.entityType === 'milestone') {
        if (change.actionType === 'create' && change.afterState) {
          updatedMilestones.push(change.afterState);
        } else if (change.actionType === 'delete') {
          updatedMilestones = updatedMilestones.filter((m) => m.id !== change.entityId);
        } else if (change.actionType === 'update') {
          const idx = updatedMilestones.findIndex((m) => m.id === change.entityId);
          if (idx >= 0 && change.afterState) {
            updatedMilestones[idx] = { ...updatedMilestones[idx], ...change.afterState };
          }
        }
      } else if (change.entityType === 'document') {
        if (change.actionType === 'create' && change.afterState) {
          updatedDocs.push(change.afterState);
        } else if (change.actionType === 'update') {
          const idx = updatedDocs.findIndex((d) => d.id === change.entityId);
          if (idx >= 0 && change.afterState) {
            updatedDocs[idx] = { ...updatedDocs[idx], ...change.afterState, updatedAt: new Date().toISOString() };
          }
        }
      } else if (change.entityType === 'card') {
        if (change.actionType === 'create' && change.afterState) {
          updatedCards.push(change.afterState);
        } else if (change.actionType === 'delete') {
          updatedCards = updatedCards.filter((c) => c.id !== change.entityId);
        } else if (change.actionType === 'update') {
          const idx = updatedCards.findIndex((c) => c.id === change.entityId);
          if (idx >= 0 && change.afterState) {
            updatedCards[idx] = { ...updatedCards[idx], ...change.afterState };
          }
        }
      }
    }

    this.accessor.setTasks(updatedTasks);
    this.accessor.setMilestones(updatedMilestones);
    this.accessor.setDocuments(updatedDocs);
    this.accessor.setCards(updatedCards);

    const appliedProposal: ChangeProposal = {
      ...proposal,
      status: 'applied',
      appliedAt: new Date().toISOString(),
    };

    this.accessor.setProposals((prev) => prev.map((p) => (p.id === proposal.id ? appliedProposal : p)));
    if (this.accessor.getActiveProposal()?.id === proposal.id) {
      this.accessor.setActiveProposal(null);
    }

    const affectedObjects: AffectedObject[] = proposal.changes.map((c) => ({
      type: c.entityType,
      id: c.entityId,
      title: c.entityTitle,
    }));
    affectedObjects.unshift({ type: 'proposal', id: proposal.id, title: proposal.title });

    return {
      success: true,
      proposalId: proposal.id,
      status: 'applied',
      appliedChangesCount: proposal.changes.length,
      affectedObjects,
    };
  }

  public rejectChanges(input: { proposalId: string }): ToolResult & { affectedObjects?: AffectedObject[] } {
    if (!input || !input.proposalId) {
      return {
        success: false,
        error: 'Required parameter "proposalId" is missing.',
        code: 'VALIDATION_ERROR',
      };
    }

    const proposals = this.accessor.getProposals();
    const proposal = proposals.find((p) => p.id === input.proposalId) || this.accessor.getActiveProposal();
    if (!proposal) {
      return {
        success: false,
        error: `Proposal "${input.proposalId}" not found.`,
        code: 'NOT_FOUND',
      };
    }

    this.accessor.setProposals((prev) =>
      prev.map((p) => (p.id === input.proposalId ? { ...p, status: 'rejected' } : p))
    );
    if (this.accessor.getActiveProposal()?.id === input.proposalId) {
      this.accessor.setActiveProposal(null);
    }

    return {
      success: true,
      rejectedProposalId: input.proposalId,
      status: 'rejected',
      affectedObjects: [{ type: 'proposal', id: input.proposalId, title: proposal.title }],
    };
  }
}

/**
 * Creates an in-memory WorkspaceService with standard mock/seed data.
 * Useful for standalone tests, CLI runners, and isolated verification.
 */
export function createInMemoryWorkspaceService(): {
  service: WorkspaceService;
  getState: () => {
    project: Project;
    tasks: Task[];
    milestones: Milestone[];
    documents: Document[];
    cards: CanvasCard[];
    proposals: ChangeProposal[];
    snapshots: WorkspaceSnapshot[];
  };
} {
  let project = JSON.parse(JSON.stringify(INITIAL_PROJECT));
  let tasks = JSON.parse(JSON.stringify(INITIAL_TASKS));
  let milestones = JSON.parse(JSON.stringify(INITIAL_MILESTONES));
  let documents = JSON.parse(JSON.stringify(INITIAL_DOCUMENTS));
  let cards = JSON.parse(JSON.stringify(INITIAL_CARDS));
  let proposals: ChangeProposal[] = [];
  let activeProposal: ChangeProposal | null = null;
  let snapshots: WorkspaceSnapshot[] = [];

  const accessor: WorkspaceStateAccessor = {
    getProject: () => project,
    setProject: (p) => {
      project = typeof p === 'function' ? p(project) : p;
    },
    getTasks: () => tasks,
    setTasks: (t) => {
      tasks = typeof t === 'function' ? t(tasks) : t;
    },
    getMilestones: () => milestones,
    setMilestones: (m) => {
      milestones = typeof m === 'function' ? m(milestones) : m;
    },
    getDocuments: () => documents,
    setDocuments: (d) => {
      documents = typeof d === 'function' ? d(documents) : d;
    },
    getCards: () => cards,
    setCards: (c) => {
      cards = typeof c === 'function' ? c(cards) : c;
    },
    getProposals: () => proposals,
    setProposals: (p) => {
      proposals = typeof p === 'function' ? p(proposals) : p;
    },
    getActiveProposal: () => activeProposal,
    setActiveProposal: (p) => {
      activeProposal = p;
    },
    getSnapshots: () => snapshots,
    setSnapshots: (s) => {
      snapshots = typeof s === 'function' ? s(snapshots) : s;
    },
  };

  const service = new WorkspaceService(accessor);

  return {
    service,
    getState: () => ({
      project,
      tasks,
      milestones,
      documents,
      cards,
      proposals,
      snapshots,
    }),
  };
}
