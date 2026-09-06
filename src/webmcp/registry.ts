import { WebMCPToolDefinition, AgentAction, AffectedObject } from '../types/forge';
import { WorkspaceService } from '../services/workspaceService';
import { notifyToast } from '../context/ToastContext';
import { createProjectTools } from './project-tools';
import { createTaskTools } from './task-tools';
import { createPlanningTools } from './planning-tools';
import { createCanvasTools } from './canvas-tools';
import { createDocumentTools } from './document-tools';
import { createApprovalTools } from './approval-tools';

export interface ToolCategory {
  id: 'project-tools' | 'task-tools' | 'planning-tools' | 'canvas-tools' | 'document-tools' | 'approval-tools';
  name: string;
  description: string;
  toolNames: string[];
}

export const WEBMCP_TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'project-tools',
    name: 'Project & Workspace Tools',
    description: 'State inspection, cognitive feasibility, full-text search, and state serialization import/export.',
    toolNames: [
      'get_project_state',
      'analyze_project',
      'export_workspace_state',
      'import_workspace_state',
      'search_workspace',
    ],
  },
  {
    id: 'task-tools',
    name: 'Task Tools',
    description: 'Creation, bulk batch creation, attribute updates, Kanban column movements, and deletion of project tasks.',
    toolNames: ['create_task', 'bulk_apply_tasks', 'update_task', 'move_task', 'delete_task'],
  },
  {
    id: 'planning-tools',
    name: 'Planning Tools',
    description: 'Autonomous launch plan generation and milestone timeline delivery gates.',
    toolNames: ['generate_plan', 'create_milestone', 'update_milestone', 'delete_milestone'],
  },
  {
    id: 'canvas-tools',
    name: 'Canvas Tools',
    description: 'Interactive 2D visual board management for architecture, decisions, and risks.',
    toolNames: ['create_canvas_card', 'update_canvas_card', 'delete_canvas_card'],
  },
  {
    id: 'document-tools',
    name: 'Document Tools',
    description: 'System specifications, PRDs, and markdown document versioning.',
    toolNames: ['create_document', 'update_document'],
  },
  {
    id: 'approval-tools',
    name: 'Approval & Governance Tools',
    description: 'Staged change proposals, human-in-the-loop gates, and one-click workspace undo.',
    toolNames: ['propose_changes', 'apply_approved_changes', 'reject_changes', 'undo_changes'],
  },
];

export function buildAllWebMCPTools(
  service: WorkspaceService,
  onActionLogged?: (action: AgentAction) => void
): WebMCPToolDefinition[] {
  const rawTools: WebMCPToolDefinition[] = [
    ...createProjectTools(service),
    ...createTaskTools(service),
    ...createPlanningTools(service),
    ...createCanvasTools(service),
    ...createDocumentTools(service),
    ...createApprovalTools(service),
  ];

  // Wrap each tool with execution telemetry, error-catching toast notifications, and action record generation
  return rawTools.map((tool) => {
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      execute: async (input: any) => {
        const actionId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const startTime = performance.now();

        // 1. Log pending action
        const initialAction: AgentAction = {
          id: actionId,
          timestamp: new Date().toISOString(),
          toolName: tool.name,
          input: input || {},
          status: 'executing',
          source: (input && input.__source) || 'webmcp_browser',
        };
        onActionLogged?.(initialAction);

        try {
          const result = await tool.execute(input);
          const durationMs = Math.round(performance.now() - startTime);

          const isSuccess = result && result.success !== false;
          const affectedObjects: AffectedObject[] = result?.affectedObjects || [];

          const completedAction: AgentAction = {
            id: actionId,
            timestamp: new Date().toISOString(),
            toolName: tool.name,
            input: input || {},
            output: result,
            result: result,
            status: isSuccess ? 'success' : 'failed',
            durationMs,
            source: (input && input.__source) || 'webmcp_browser',
            affectedObjects,
            error: isSuccess ? undefined : result?.error || 'Tool execution returned failure',
          };

          onActionLogged?.(completedAction);

          // Automatically present a helpful toast notification to user if agent action failed
          if (!isSuccess) {
            const errorMsg = result?.error || 'Tool execution failed or returned validation error.';
            notifyToast({
              type: 'error',
              title: `Action Failed: ${tool.name}`,
              message: errorMsg,
            });
          }

          return result;
        } catch (err: any) {
          const durationMs = Math.round(performance.now() - startTime);
          const errorMsg = err?.message || String(err);
          const failureAction: AgentAction = {
            id: actionId,
            timestamp: new Date().toISOString(),
            toolName: tool.name,
            input: input || {},
            status: 'failed',
            durationMs,
            source: (input && input.__source) || 'webmcp_browser',
            error: errorMsg,
          };
          onActionLogged?.(failureAction);

          // Automatically present a helpful toast notification to user for caught exceptions
          notifyToast({
            type: 'error',
            title: `WebMCP Error in ${tool.name}`,
            message: errorMsg || 'An unexpected execution error occurred while running this tool.',
          });

          return {
            success: false,
            error: errorMsg || 'Unexpected execution error occurred',
            code: 'INTERNAL_ERROR',
          };
        }
      },
    };
  });
}
