import { WebMCPToolDefinition } from '../../types/forge';
import { WorkspaceService } from '../../services/workspaceService';
import { validateSchema, validationError } from '../validation';

export function createApprovalTools(service: WorkspaceService): WebMCPToolDefinition[] {
  return [
    {
      name: 'propose_changes',
      description: 'Stage a set of batch changes (create/update/delete tasks, milestones, docs) as a reviewable proposal requiring human approval before mutation.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Concise summary of the proposed scope change' },
          summary: { type: 'string', description: 'Rationale explaining why these changes improve delivery confidence' },
          changes: {
            type: 'array',
            description: 'Array of diff changes to apply if human approves',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                actionType: { type: 'string', enum: ['create', 'update', 'delete', 'move'] },
                entityType: { type: 'string', enum: ['task', 'milestone', 'document', 'card', 'project'] },
                entityId: { type: 'string' },
                entityTitle: { type: 'string' },
                reason: { type: 'string' },
              },
              required: ['actionType', 'entityType', 'entityId', 'entityTitle', 'reason'],
            },
          },
        },
        required: ['title', 'summary', 'changes'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            changes: { type: 'array' },
          },
          required: ['title', 'summary', 'changes'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.proposeChanges(input);
      },
    },
    {
      name: 'apply_approved_changes',
      description: 'Execute staged proposal changes into live project state. Fails with APPROVAL_REQUIRED if proposal is pending human review.',
      inputSchema: {
        type: 'object',
        properties: {
          proposalId: { type: 'string', description: 'ID of the staged proposal to apply' },
          humanConfirmed: {
            type: 'boolean',
            description: 'Human confirmation flag. Must be true to apply proposals in pending state.',
          },
        },
        required: ['proposalId'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            proposalId: { type: 'string' },
            humanConfirmed: { type: 'boolean' },
          },
          required: ['proposalId'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.applyApprovedChanges(input);
      },
    },
    {
      name: 'reject_changes',
      description: 'Reject and discard a staged change proposal without modifying project state.',
      inputSchema: {
        type: 'object',
        properties: {
          proposalId: { type: 'string', description: 'ID of proposal to reject' },
        },
        required: ['proposalId'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            proposalId: { type: 'string' },
          },
          required: ['proposalId'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.rejectChanges(input);
      },
    },
    {
      name: 'undo_changes',
      description: 'Restore project state to the most recent workspace snapshot taken before a mutation or applied proposal.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        return service.undoChanges();
      },
    },
  ];
}
