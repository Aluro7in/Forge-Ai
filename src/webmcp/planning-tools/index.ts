import { WebMCPToolDefinition } from '../../types/forge';
import { WorkspaceService } from '../../services/workspaceService';
import { validateSchema, validationError } from '../validation';

export function createPlanningTools(service: WorkspaceService): WebMCPToolDefinition[] {
  return [
    {
      name: 'generate_plan',
      description: 'Synthesize a cohesive launch or feature delivery plan tailored to specific team size and deadline.',
      inputSchema: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'Core user objective or product launch scope' },
          teamSize: { type: 'number', description: 'Number of active team members (default: 2)' },
          durationDays: { type: 'number', description: 'Duration in days (e.g. 14)' },
        },
        required: ['goal'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            goal: { type: 'string' },
            teamSize: { type: 'number' },
            durationDays: { type: 'number' },
          },
          required: ['goal'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.generatePlan(input);
      },
    },
    {
      name: 'create_milestone',
      description: 'Create a milestone delivery gate on the project timeline.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Milestone name' },
          targetDate: { type: 'string', description: 'Target delivery date (YYYY-MM-DD)' },
          description: { type: 'string', description: 'Milestone scope and success criteria' },
          order: { type: 'number', description: 'Sequential phase order' },
          color: { type: 'string', description: 'Hex or CSS color identifier' },
        },
        required: ['title', 'targetDate'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            title: { type: 'string' },
            targetDate: { type: 'string' },
            description: { type: 'string' },
            order: { type: 'number' },
            color: { type: 'string' },
          },
          required: ['title', 'targetDate'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.createMilestone(input);
      },
    },
    {
      name: 'update_milestone',
      description: 'Update a milestone title, target date, or execution status.',
      inputSchema: {
        type: 'object',
        properties: {
          milestoneId: { type: 'string', description: 'Milestone ID to update' },
          title: { type: 'string', description: 'Updated milestone title' },
          targetDate: { type: 'string', description: 'Updated target date' },
          status: { type: 'string', enum: ['planned', 'active', 'completed'], description: 'Updated status' },
          description: { type: 'string', description: 'Updated description' },
        },
        required: ['milestoneId'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            milestoneId: { type: 'string' },
            title: { type: 'string' },
            targetDate: { type: 'string' },
            status: { type: 'string', enum: ['planned', 'active', 'completed'] },
            description: { type: 'string' },
          },
          required: ['milestoneId'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.updateMilestone(input);
      },
    },
    {
      name: 'delete_milestone',
      description: 'Delete a milestone by ID.',
      inputSchema: {
        type: 'object',
        properties: {
          milestoneId: { type: 'string', description: 'ID of milestone to delete' },
        },
        required: ['milestoneId'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            milestoneId: { type: 'string' },
          },
          required: ['milestoneId'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.deleteMilestone(input);
      },
    },
  ];
}
