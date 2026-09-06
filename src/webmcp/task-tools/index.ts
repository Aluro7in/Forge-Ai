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
          estimateDays: { type: 'number', description: 'Updated estimate in days' },
          dueDate: { type: 'string', description: 'Updated due date' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Updated tags' },
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
            estimateDays: { type: 'number' },
            dueDate: { type: 'string' },
            tags: { type: 'array' },
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
  ];
}
