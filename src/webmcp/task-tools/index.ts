import { WebMCPToolDefinition } from '../../types/forge';
import { WorkspaceService } from '../../services/workspaceService';
import { validateSchema, validationError } from '../validation';

export function createTaskTools(service: WorkspaceService): WebMCPToolDefinition[] {
  return [
    {
      name: 'create_task',
      description: 'Create a new task in the workspace with title, priority, assignee, estimate, and milestone link.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Clear action-oriented task title' },
          description: { type: 'string', description: 'Detailed specification and context' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Task priority level' },
          assignee: { type: 'string', description: 'Person or role assigned to the task' },
          milestoneId: { type: 'string', description: 'Optional ID of parent milestone' },
          estimateDays: { type: 'number', description: 'Estimated days to complete' },
          dueDate: { type: 'string', description: 'Target completion date (YYYY-MM-DD)' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Categorization tags' },
          projectId: { type: 'string', description: 'Optional project ID' },
        },
        required: ['title'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            assignee: { type: 'string' },
            milestoneId: { type: 'string' },
            estimateDays: { type: 'number' },
            dueDate: { type: 'string' },
            tags: { type: 'array' },
            projectId: { type: 'string' },
          },
          required: ['title'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.createTask(input);
      },
    },
    {
      name: 'bulk_apply_tasks',
      description: 'Create multiple tasks in one atomic transaction, minimizing UI re-renders and guaranteeing consistent rollback.',
      inputSchema: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Action-oriented task title' },
                description: { type: 'string', description: 'Task specification' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Priority level' },
                assignee: { type: 'string', description: 'Assigned teammate' },
                milestoneId: { type: 'string', description: 'Optional milestone ID' },
                estimateDays: { type: 'number', description: 'Days needed' },
                dueDate: { type: 'string', description: 'Target date (YYYY-MM-DD)' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Task tags' },
              },
              required: ['title'],
            },
            description: 'List of task objects to create in a single atomic commit',
          },
          projectId: { type: 'string', description: 'Optional target project ID' },
        },
        required: ['tasks'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            tasks: { type: 'array' },
            projectId: { type: 'string' },
          },
          required: ['tasks'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.bulkApplyTasks(input);
      },
    },
    {
      name: 'update_task',
      description: 'Update fields of an existing task including status, priority, estimate, or description.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the task to update' },
          title: { type: 'string', description: 'Updated title' },
          description: { type: 'string', description: 'Updated description' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done'], description: 'Updated status' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Updated priority' },
          assignee: { type: 'string', description: 'Updated assignee' },
          milestoneId: { type: 'string', description: 'Updated milestone ID' },
          timeSpentSeconds: { type: 'number', description: 'Total time spent in seconds' },
          estimateDays: { type: 'number', description: 'Updated estimate in days' },
          dueDate: { type: 'string', description: 'Updated due date' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Updated tags' },
          archived: { type: 'boolean', description: 'Whether the task is archived from active boards' },
          archivedAt: { type: 'string', description: 'Timestamp when the task was archived' },
        },
        required: ['taskId'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            assignee: { type: 'string' },
            milestoneId: { type: 'string' },
            timeSpentSeconds: { type: 'number' },
            estimateDays: { type: 'number' },
            dueDate: { type: 'string' },
            tags: { type: 'array' },
            archived: { type: 'boolean' },
            archivedAt: { type: 'string' },
          },
          required: ['taskId'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.updateTask(input);
      },
    },
    {
      name: 'log_task_time',
      description: 'Log time spent on a specific task in seconds or adjust total time logged.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the task' },
          secondsToAdd: { type: 'number', description: 'Seconds to add to logged time' },
          totalSeconds: { type: 'number', description: 'Explicit total seconds spent' },
        },
        required: ['taskId'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            secondsToAdd: { type: 'number' },
            totalSeconds: { type: 'number' },
          },
          required: ['taskId'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.logTaskTime(input);
      },
    },
    {
      name: 'move_task',
      description: 'Move a task to a new Kanban column status (todo, in_progress, review, done).',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of task to move' },
          newStatus: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done'], description: 'Target Kanban status' },
        },
        required: ['taskId', 'newStatus'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            newStatus: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done'] },
          },
          required: ['taskId', 'newStatus'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.moveTask(input);
      },
    },
    {
      name: 'reorder_tasks',
      description: 'Reorder a task within its current column or across Kanban columns at a specific target index.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the task to reorder' },
          targetStatus: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done'], description: 'Target column status' },
          targetIndex: { type: 'number', description: 'Zero-based target index within the target column' },
        },
        required: ['taskId', 'targetStatus', 'targetIndex'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            targetStatus: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done'] },
            targetIndex: { type: 'number' },
          },
          required: ['taskId', 'targetStatus', 'targetIndex'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.reorderTasks(input);
      },
    },
    {
      name: 'delete_task',
      description: 'Delete a task from the project workspace.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the task to delete' },
        },
        required: ['taskId'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
          },
          required: ['taskId'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.deleteTask(input);
      },
    },
    {
      name: 'archive_task',
      description: 'Archive or restore a completed task from the active board view into an archive state to keep the workspace tidy.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the task to archive or restore' },
          unarchive: { type: 'boolean', description: 'Set to true to unarchive/restore the task back to the active board' },
        },
        required: ['taskId'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            unarchive: { type: 'boolean' },
          },
          required: ['taskId'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.archiveTask(input);
      },
    },
  ];
}
