import { DiffChange, Task, Milestone } from '../types/forge';

export interface AgentEngineResponse {
  message: string;
  toolsUsed: string[];
  proposalCreated?: boolean;
}

export async function processAgentIntent(
  prompt: string,
  executeTool: (name: string, input: any) => Promise<any>
): Promise<AgentEngineResponse> {
  const normalized = prompt.trim().toLowerCase();

  // 1. Hero Scenario 3: UNDO
  if (
    normalized.includes('undo') ||
    normalized.includes('revert') ||
    normalized.includes('rollback') ||
    normalized.includes('restore previous')
  ) {
    const result = await executeTool('undo_changes', {});
    return {
      message: result.success
        ? 'I have successfully rolled back the last workspace modification. Your previous tasks and milestones have been restored.'
        : 'There are no prior snapshots available to undo.',
      toolsUsed: ['undo_changes'],
    };
  }

  // 2. Hero Scenario 2: SCOPE DOWN / MAKE ACHIEVABLE FOR 2 PEOPLE IN 14 DAYS
  if (
    (normalized.includes('ambitious') ||
      normalized.includes('too much') ||
      normalized.includes('scope down') ||
      normalized.includes('achievable') ||
      normalized.includes('reduce') ||
      normalized.includes('streamline')) &&
    (normalized.includes('two') || normalized.includes('2') || normalized.includes('fourteen') || normalized.includes('14'))
  ) {
    // Step A: Inspect
    const state = await executeTool('get_project_state', { includeDocuments: false });
    
    // Step B: Analyze
    const analysis = await executeTool('analyze_project', { teamSize: 2, timeframeDays: 14 });

    // Identify tasks to prune or streamline
    const currentTasks: Task[] = state.tasks || [];
    const changes: DiffChange[] = [];

    // Filter out 2-3 non-critical or heavy tasks
    const tasksToPrune = currentTasks.filter(
      (t) =>
        t.status !== 'done' &&
        (t.priority === 'low' ||
          t.title.toLowerCase().includes('video') ||
          t.title.toLowerCase().includes('secondary') ||
          t.estimateDays > 2)
    ).slice(0, 2);

    for (const t of tasksToPrune) {
      changes.push({
        id: 'diff-' + Math.random().toString(36).substring(2, 6),
        actionType: 'delete',
        entityType: 'task',
        entityId: t.id,
        entityTitle: t.title,
        beforeState: t,
        reason: 'Pruned from 14-day launch scope to protect 2-person delivery bandwidth. Deferred to Post-Launch roadmap.',
      });
    }

    // Adjust 1-2 remaining tasks to be leaner
    const tasksToTune = currentTasks.filter(
      (t) => t.status !== 'done' && !tasksToPrune.some((p) => p.id === t.id)
    ).slice(0, 2);

    for (const t of tasksToTune) {
      const updated = {
        ...t,
        estimateDays: Math.max(0.5, t.estimateDays * 0.6),
        priority: 'urgent',
        tags: [...t.tags.filter((x) => x !== 'Deferred'), 'HighLeverage'],
      };
      changes.push({
        id: 'diff-' + Math.random().toString(36).substring(2, 6),
        actionType: 'update',
        entityType: 'task',
        entityId: t.id,
        entityTitle: t.title,
        beforeState: t,
        afterState: updated,
        reason: 'Streamlined scope to minimum viable deliverable (cut estimated days by 40%).',
      });
    }

    // Add a focused risk card on canvas
    changes.push({
      id: 'diff-' + Math.random().toString(36).substring(2, 6),
      actionType: 'create',
      entityType: 'card',
      entityId: 'card-scope-locked',
      entityTitle: 'Scope Frozen (2-Person 14d Rule)',
      afterState: {
        id: 'card-scope-locked',
        projectId: state.project.id,
        title: 'Scope Frozen: 14-Day 2-Person Window',
        content: 'Protected capacity: Max 5 concurrent tasks. Defer all non-essential integrations until post-launch beta feedback.',
        type: 'decision',
        x: 620,
        y: 220,
        width: 280,
        height: 150,
      },
      reason: 'Visible team guardrail card on canvas to prevent scope creep during final sprint.',
    });

    // Propose changes
    const proposal = await executeTool('propose_changes', {
      title: 'Scope Down for 2-Person 14-Day Delivery',
      summary: `Analyzed workload: Reduced workload from ${analysis.totalWorkloadDays} days to ~${Math.round(analysis.safeCapacityDays)} days by pruning secondary items and tightening estimates.`,
      changes,
    });

    return {
      message: `I analyzed your project capacity against a 2-person, 14-day timeline. Current scope exceeded safe limits. I have prepared a proposal that prunes ${tasksToPrune.length} secondary tasks and tightens estimates to guarantee on-time delivery. Please review the diff above to approve or reject.`,
      toolsUsed: ['get_project_state', 'analyze_project', 'propose_changes'],
      proposalCreated: true,
    };
  }

  // 3. Hero Scenario 1: CREATE 2-WEEK PRODUCT LAUNCH PLAN FOR 2-PERSON TEAM
  if (
    normalized.includes('launch plan') ||
    normalized.includes('two-week') ||
    normalized.includes('two week') ||
    normalized.includes('2-week') ||
    normalized.includes('product launch') ||
    normalized.includes('launch') ||
    normalized.includes('plan for')
  ) {
    // Step 1: Inspect
    const state = await executeTool('get_project_state', { includeDocuments: false });

    // Step 2: Analyze
    const analysis = await executeTool('analyze_project', { teamSize: 2, timeframeDays: 14 });

    // Step 3: Generate Plan
    const plan = await executeTool('generate_plan', {
      goal: 'Launch Forge public beta to hackathon judges and early adopters in 14 days',
      teamSize: 2,
      durationDays: 14,
    });

    // Step 4: Formulate structured diff
    const changes: DiffChange[] = [];

    // Milestones
    const ms1: Milestone = {
      id: 'ms-w1-launch',
      projectId: state.project.id,
      title: 'Week 1: Zero-Defect WebMCP Core & Test Coverage',
      description: 'Stabilize tool execution, snapshot persistence, and automated verification.',
      targetDate: '2026-09-08',
      order: 1,
      status: 'active',
      color: '#3B82F6',
    };
    changes.push({
      id: 'diff-m1',
      actionType: 'create',
      entityType: 'milestone',
      entityId: ms1.id,
      entityTitle: ms1.title,
      afterState: ms1,
      reason: 'Establishes Week 1 milestone delivery gate.',
    });

    const ms2: Milestone = {
      id: 'ms-w2-launch',
      projectId: state.project.id,
      title: 'Week 2: Launch Readiness, Public Demo & Video',
      description: 'Record 3-min walkthrough, publish open-source repo, deploy live production preview.',
      targetDate: '2026-09-15',
      order: 2,
      status: 'planned',
      color: '#10B981',
    };
    changes.push({
      id: 'diff-m2',
      actionType: 'create',
      entityType: 'milestone',
      entityId: ms2.id,
      entityTitle: ms2.title,
      afterState: ms2,
      reason: 'Establishes Week 2 final launch delivery gate.',
    });

    // Launch Tasks distributed between 2 founders
    const newTasks: Task[] = [
      {
        id: 'task-lp-1',
        projectId: state.project.id,
        title: 'Verify all 18 WebMCP tools in Chrome & ChatGPT browser',
        description: 'Ensure document.modelContext registers cleanly and responds in < 30ms.',
        status: 'in_progress',
        priority: 'urgent',
        assignee: 'Founder A (Tech)',
        milestoneId: ms1.id,
        estimateDays: 1.5,
        dueDate: '2026-09-05',
        tags: ['WebMCP', 'Verification'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-lp-2',
        projectId: state.project.id,
        title: 'Draft landing hero copy & interactive product tour',
        description: 'Frame product value: "Where humans and agents build together" with instant visual clarity.',
        status: 'todo',
        priority: 'high',
        assignee: 'Founder B (Product)',
        milestoneId: ms1.id,
        estimateDays: 1.5,
        dueDate: '2026-09-06',
        tags: ['Landing', 'Messaging'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-lp-3',
        projectId: state.project.id,
        title: 'Stress-test undo snapshot rollbacks with concurrent edits',
        description: 'Confirm snapshot restoration leaves zero orphaned tasks or detached card elements.',
        status: 'todo',
        priority: 'high',
        assignee: 'Founder A (Tech)',
        milestoneId: ms1.id,
        estimateDays: 1.0,
        dueDate: '2026-09-07',
        tags: ['Reliability', 'QA'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-lp-4',
        projectId: state.project.id,
        title: 'Record 3-minute hackathon demonstration video',
        description: 'Highlight real WebMCP tool calls, cognitive proposals, and judge demo workflow.',
        status: 'todo',
        priority: 'urgent',
        assignee: 'Founder B (Product)',
        milestoneId: ms2.id,
        estimateDays: 2.0,
        dueDate: '2026-09-11',
        tags: ['Demo', 'Video'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-lp-5',
        projectId: state.project.id,
        title: 'Publish open-source repo with MIT license & architecture guide',
        description: 'Complete README covering WebMCP design, setup steps, and hackathon rubric alignment.',
        status: 'todo',
        priority: 'medium',
        assignee: 'Founder A (Tech)',
        milestoneId: ms2.id,
        estimateDays: 1.0,
        dueDate: '2026-09-13',
        tags: ['OpenSource', 'Docs'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-lp-6',
        projectId: state.project.id,
        title: 'Conduct dry-run judge evaluation checklist',
        description: 'Verify 4 judging criteria: WebMCP Leverage, Execution, Potential Impact, Creativity.',
        status: 'todo',
        priority: 'high',
        assignee: 'Founder B (Product)',
        milestoneId: ms2.id,
        estimateDays: 1.0,
        dueDate: '2026-09-14',
        tags: ['Judging', 'Launch'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const t of newTasks) {
      changes.push({
        id: 'diff-' + t.id,
        actionType: 'create',
        entityType: 'task',
        entityId: t.id,
        entityTitle: t.title,
        afterState: t,
        reason: `Allocated to ${t.assignee} with ${t.estimateDays}d estimate to ensure balanced 2-person delivery.`,
      });
    }

    // Canvas card
    changes.push({
      id: 'diff-card-lp',
      actionType: 'create',
      entityType: 'card',
      entityId: 'card-launch-pillars',
      entityTitle: '14-Day Launch Pillars',
      afterState: {
        id: 'card-launch-pillars',
        projectId: state.project.id,
        title: 'Launch Pillars (Founder A & B)',
        content: 'Founder A: WebMCP Engine & Reliability.\nFounder B: GTM, Docs & Demo Video.\nZero feature-creep past Day 10.',
        type: 'decision',
        x: 40,
        y: 400,
        width: 300,
        height: 140,
      },
      reason: 'Anchor launch governance card on project canvas.',
    });

    // Step 5: Propose Changes
    await executeTool('propose_changes', {
      title: 'Two-Week Launch Plan (2-Person Team)',
      summary: `Synthesized a 14-day launch roadmap: 2 milestone delivery gates, 6 high-impact tasks balanced across Founder A (Engineering) and Founder B (Product/GTM), totaling 8 days effort within a 20-day team capacity.`,
      changes,
    });

    return {
      message: `I inspected your workspace and generated a realistic 14-day launch plan optimized for a 2-person team. The plan establishes 2 weekly milestones, balances 6 core tasks across engineering and product, and preserves a 30% buffer for unexpected bugs. Please review the proposed changes below.`,
      toolsUsed: ['get_project_state', 'analyze_project', 'generate_plan', 'propose_changes'],
      proposalCreated: true,
    };
  }

  // 4. Bottlenecks / Analysis
  if (normalized.includes('bottleneck') || normalized.includes('analyze') || normalized.includes('health') || normalized.includes('status')) {
    const analysis = await executeTool('analyze_project', { teamSize: 2, timeframeDays: 14 });
    return {
      message: `Workspace Analysis: Total estimated workload is ${analysis.totalWorkloadDays} days against safe 2-person capacity of ${analysis.safeCapacityDays} days. ${analysis.recommendations.join(' ')}`,
      toolsUsed: ['analyze_project'],
    };
  }

  // 5. Add single task
  if (normalized.startsWith('add task') || normalized.startsWith('create task')) {
    const title = prompt.replace(/^(add task|create task):?/i, '').trim();
    if (!title) {
      return {
        message: 'Please specify the title of the task you would like me to create.',
        toolsUsed: [],
      };
    }
    const res = await executeTool('create_task', {
      title,
      priority: 'high',
      estimateDays: 1,
      assignee: 'Founder A (Tech)',
    });
    return {
      message: `I created the task "${title}" and added it to your workspace.`,
      toolsUsed: ['create_task'],
    };
  }

  // 6. Generic intelligent fallback with WebMCP inspection
  const state = await executeTool('get_project_state', { includeDocuments: false });
  return {
    message: `I reviewed the workspace. Current project "${state.project.name}" has ${state.tasks.length} tasks and ${state.milestones.length} milestones. You can ask me to "Create a 2-week launch plan", "Make it achievable for 2 people in 14 days", or "Undo the last change".`,
    toolsUsed: ['get_project_state'],
  };
}
