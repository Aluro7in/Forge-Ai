import { Project, Task, Milestone, Document, CanvasCard } from '../types/forge';

export const INITIAL_PROJECT: Project = {
  id: 'proj-launch',
  name: 'Product Launch',
  description: 'Launch Forge to public beta in 14 days with high reliability, clear human-agent loop, and zero critical defects.',
  vision: 'Demonstrate the world’s first genuine agent-native workspace powered by WebMCP.',
  status: 'active',
  tags: ['WebMCP', 'Public Beta', 'OpenAI Hackathon', 'SaaS'],
  createdAt: '2026-09-01T09:00:00.000Z',
  updatedAt: '2026-09-03T10:30:00.000Z',
};

export const INITIAL_MILESTONES: Milestone[] = [
  {
    id: 'ms-w1',
    projectId: 'proj-launch',
    title: 'Milestone 1: Core Foundation & Stability',
    description: 'Stabilize WebMCP tool surface, finish baseline security checks, and finalize test cases.',
    targetDate: '2026-09-08',
    order: 1,
    status: 'active',
    color: '#3B82F6',
  },
  {
    id: 'ms-w2',
    projectId: 'proj-launch',
    title: 'Milestone 2: Launch Readiness & GTM',
    description: 'Complete user docs, run load tests, record demo video, and deploy to production.',
    targetDate: '2026-09-15',
    order: 2,
    status: 'planned',
    color: '#10B981',
  },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    projectId: 'proj-launch',
    title: 'Audit WebMCP registered tool schemas',
    description: 'Verify all 18 tools adhere strictly to JSON Schema draft-07 and handle invalid input gracefully.',
    status: 'done',
    priority: 'urgent',
    assignee: 'Founder A (Tech)',
    milestoneId: 'ms-w1',
    estimateDays: 1,
    dueDate: '2026-09-04',
    tags: ['WebMCP', 'Quality'],
    subtasks: [
      { id: 'sub-1-1', title: 'Verify parameter type checking for bulk tools', completed: true },
      { id: 'sub-1-2', title: 'Add regression tests for empty string validations', completed: true },
      { id: 'sub-1-3', title: 'Confirm JSON Schema draft-07 compatibility', completed: true },
    ],
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-02T14:00:00.000Z',
  },
  {
    id: 'task-2',
    projectId: 'proj-launch',
    title: 'Configure human-in-the-loop diff proposal UX',
    description: 'Ensure destructive or mass modifications require explicit review and approval from the user.',
    status: 'in_progress',
    priority: 'high',
    assignee: 'Founder B (Product)',
    milestoneId: 'ms-w1',
    estimateDays: 2,
    dueDate: '2026-09-06',
    tags: ['UX', 'HumanControl'],
    subtasks: [
      { id: 'sub-2-1', title: 'Build side-by-side diff preview modal', completed: true },
      { id: 'sub-2-2', title: 'Implement keyboard shortcuts (Enter to accept, Esc to reject)', completed: true },
      { id: 'sub-2-3', title: 'Connect snapshot state rollback upon rejection', completed: false },
      { id: 'sub-2-4', title: 'Add tactile sound feedback on proposal approval', completed: false },
    ],
    createdAt: '2026-09-01T11:30:00.000Z',
    updatedAt: '2026-09-03T09:15:00.000Z',
  },
  {
    id: 'task-3',
    projectId: 'proj-launch',
    title: 'Finalize 3-minute hackathon video script',
    description: 'Write crisp narration covering WebMCP leverage, product loop, and hero use case demonstration.',
    status: 'todo',
    priority: 'medium',
    assignee: 'Founder B (Product)',
    milestoneId: 'ms-w2',
    estimateDays: 1.5,
    dueDate: '2026-09-10',
    tags: ['Marketing', 'Video'],
    subtasks: [
      { id: 'sub-3-1', title: 'Draft opening 30-second problem hook', completed: true },
      { id: 'sub-3-2', title: 'Record live WebMCP browser interaction walkthrough', completed: false },
      { id: 'sub-3-3', title: 'Review script pacing with team', completed: false },
    ],
    createdAt: '2026-09-02T08:00:00.000Z',
    updatedAt: '2026-09-02T08:00:00.000Z',
  },
  {
    id: 'task-4',
    projectId: 'proj-launch',
    title: 'Conduct end-to-end smoke testing on mobile & Chrome WebMCP',
    description: 'Test WebMCP tool execution in ChatGPT browser and Chrome with flag enabled.',
    status: 'todo',
    priority: 'urgent',
    assignee: 'Founder A (Tech)',
    milestoneId: 'ms-w2',
    estimateDays: 2,
    dueDate: '2026-09-11',
    tags: ['QA', 'Deployment'],
    subtasks: [
      { id: 'sub-4-1', title: 'Validate touch drag-and-drop on mobile layout', completed: false },
      { id: 'sub-4-2', title: 'Inspect WebMCP protocol logs in Chrome console', completed: false },
      { id: 'sub-4-3', title: 'Stress test 100-card reorder latency', completed: false },
    ],
    createdAt: '2026-09-02T12:00:00.000Z',
    updatedAt: '2026-09-02T12:00:00.000Z',
  },
  {
    id: 'task-5',
    projectId: 'proj-launch',
    title: 'Polish design system documentation and color tokens',
    description: 'Document priority indicators, typography pairings, and tactile animation standards.',
    status: 'todo',
    priority: 'low',
    assignee: 'Founder B (Product)',
    milestoneId: 'ms-w2',
    estimateDays: 0.5,
    dueDate: '2026-09-15',
    tags: ['DesignSystem', 'Docs'],
    subtasks: [
      { id: 'sub-5-1', title: 'Export WCAG AA contrast ratio compliance checklist', completed: true },
      { id: 'sub-5-2', title: 'Document drag physics and hover scale curves', completed: false },
    ],
    createdAt: '2026-09-03T10:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z',
  },
];

export const INITIAL_DOCUMENTS: Document[] = [
  {
    id: 'doc-prd',
    projectId: 'proj-launch',
    title: 'Launch PRD & Go-to-Market Spec',
    content: `# Product Launch PRD: Forge Beta

## Executive Summary
Forge is an agent-native workspace where humans and AI agents build together through structured WebMCP tools.

### Core Objectives
1. **Zero-Friction Tool Calling:** Agents operate directly on workspace objects using browser-native \`document.modelContext\`.
2. **Human in the Loop:** Agents propose changes; humans review diffs, approve, reject, or undo.
3. **High Fidelity:** Every operation modifies real state, updates live metrics, and records traceable audit logs.

### Team Allocation (2 Persons)
- **Founder A (Engineering):** WebMCP tool surface, state engine, undo/redo snapshots, deployment.
- **Founder B (Design & GTM):** UX/UI polish, launch messaging, video demo, user docs.

### Launch Criteria
- All 18 WebMCP tools respond in < 50ms.
- 100% test coverage on proposal diff generator.
- Working offline and online in modern browsers.`,
    version: 3,
    lastUpdatedBy: 'Founder B (Product)',
    updatedAt: '2026-09-03T10:15:00.000Z',
  },
  {
    id: 'doc-arch',
    projectId: 'proj-launch',
    title: 'WebMCP Architecture Standard',
    content: `# WebMCP Architecture Standard in Forge

## The \`document.modelContext\` Pattern

\`\`\`javascript
document.modelContext.registerTool({
  name: "create_task",
  description: "Create a new prioritized task in the current project",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      estimateDays: { type: "number" }
    },
    required: ["title"]
  },
  execute: async (input) => { ... }
});
\`\`\`

## Safety Guarantees
- Multi-step operations must be bundled into a \`ChangeProposal\`.
- Snapshots are captured before applying any proposal to enable instant 1-click Undo.`,
    version: 2,
    lastUpdatedBy: 'Founder A (Tech)',
    updatedAt: '2026-09-02T16:40:00.000Z',
  },
];

export const INITIAL_CARDS: CanvasCard[] = [
  {
    id: 'card-1',
    projectId: 'proj-launch',
    title: 'Target Audience',
    content: 'Hackathon Judges, AI Engineers, Product Teams building with browser-native LLM agents.',
    type: 'note',
    x: 40,
    y: 40,
    width: 240,
    height: 140,
    color: '#FEF3C7',
  },
  {
    id: 'card-2',
    projectId: 'proj-launch',
    title: 'Launch Day Metric',
    content: 'Target: >500 active agent tool invocations, 0 unhandled exceptions, <100ms average tool execution.',
    type: 'metric',
    x: 320,
    y: 40,
    width: 260,
    height: 140,
    color: '#D1FAE5',
  },
  {
    id: 'card-3',
    projectId: 'proj-launch',
    title: 'Key Operational Risk',
    content: 'Risk: Overly ambitious scope for a 2-person team. Mitigation: Dynamic agent scope-down to strictly high-leverage tasks.',
    type: 'risk',
    x: 620,
    y: 40,
    width: 280,
    height: 140,
    color: '#FEE2E2',
  },
  {
    id: 'card-4',
    projectId: 'proj-launch',
    title: 'Core System Loop',
    content: 'Human Intent → Agent Inspection → WebMCP Tool Execution → State Diff → Human Review → Apply / Undo.',
    type: 'architecture',
    x: 40,
    y: 220,
    width: 380,
    height: 160,
    color: '#E0E7FF',
  },
];
