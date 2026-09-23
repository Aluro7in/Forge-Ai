import { WebMCPToolDefinition } from '../../types/forge';
import { WorkspaceService } from '../../services/workspaceService';
import { validateSchema, validationError } from '../validation';

export function createProjectTools(service: WorkspaceService): WebMCPToolDefinition[] {
  return [
    {
      name: 'get_project_state',
      description: 'Inspect the current project state including tasks, milestones, canvas cards, documents, and team metrics.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Optional project ID to inspect' },
          includeDocuments: { type: 'boolean', description: 'Whether to include full document contents' },
        },
      },
      execute: async (input) => {
        const schemaValidation = validateSchema(
          {
            type: 'object',
            properties: {
              projectId: { type: 'string' },
              includeDocuments: { type: 'boolean' },
            },
          },
          input
        );
        if (!schemaValidation.valid) {
          return validationError(schemaValidation.error!);
        }
        return service.getProjectState(input);
      },
    },
    {
      name: 'analyze_project',
      description: 'Perform cognitive capacity analysis on project balance, capacity constraints, risk factors, and feasibility for team size.',
      inputSchema: {
        type: 'object',
        properties: {
          teamSize: { type: 'number', description: 'Number of team members (default: 2)' },
          timeframeDays: { type: 'number', description: 'Duration in days (e.g. 14)' },
          projectId: { type: 'string', description: 'Optional target project ID' },
        },
      },
      execute: async (input) => {
        const schemaValidation = validateSchema(
          {
            type: 'object',
            properties: {
              teamSize: { type: 'number' },
              timeframeDays: { type: 'number' },
              projectId: { type: 'string' },
            },
          },
          input
        );
        if (!schemaValidation.valid) {
          return validationError(schemaValidation.error!);
        }
        return service.analyzeProject(input);
      },
    },
    {
      name: 'export_workspace_state',
      description: 'Serialize and export the current workspace state (project, tasks, milestones, documents, canvas cards) to JSON.',
      inputSchema: {
        type: 'object',
        properties: {
          pretty: { type: 'boolean', description: 'Whether to format the serialized JSON with indentation (default: true)' },
        },
      },
      execute: async (input) => {
        const schemaValidation = validateSchema(
          {
            type: 'object',
            properties: {
              pretty: { type: 'boolean' },
            },
          },
          input
        );
        if (!schemaValidation.valid) {
          return validationError(schemaValidation.error!);
        }
        return service.exportWorkspaceState(input);
      },
    },
    {
      name: 'import_workspace_state',
      description: 'Restore the workspace state from a serialized JSON string or structured state object with automatic rollback snapshot.',
      inputSchema: {
        type: 'object',
        properties: {
          stateJson: { type: 'string', description: 'Serialized JSON string containing project, tasks, milestones, etc.' },
          state: { type: 'object', description: 'Parsed state object containing project, tasks, milestones, etc.' },
        },
      },
      execute: async (input) => {
        const schemaValidation = validateSchema(
          {
            type: 'object',
            properties: {
              stateJson: { type: 'string' },
              state: { type: 'object' },
            },
          },
          input
        );
        if (!schemaValidation.valid) {
          return validationError(schemaValidation.error!);
        }
        return service.importWorkspaceState(input);
      },
    },
    {
      name: 'search_workspace',
      description: 'Perform full-text search across all tasks, milestones, and documents with relevance ranking and field highlights.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term or keywords to query' },
          filterType: {
            type: 'string',
            enum: ['all', 'task', 'milestone', 'document'],
            description: 'Optional filter to restrict search to a specific resource type (default: all)',
          },
          limit: { type: 'number', description: 'Maximum number of results to return (default: 20)' },
        },
        required: ['query'],
      },
      execute: async (input) => {
        const schemaValidation = validateSchema(
          {
            type: 'object',
            properties: {
              query: { type: 'string' },
              filterType: { type: 'string', enum: ['all', 'task', 'milestone', 'document'] },
              limit: { type: 'number' },
            },
            required: ['query'],
          },
          input
        );
        if (!schemaValidation.valid) {
          return validationError(schemaValidation.error!);
        }
        return service.searchWorkspace(input);
      },
    },
    {
      name: 'save_workspace_snapshot',
      description: 'Persist the entire workspace configuration (tasks, milestones, documents, cards) into a named JSON snapshot stored in LocalStorage.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Descriptive title for this saved project snapshot' },
          description: { type: 'string', description: 'Optional explanation of why this configuration was saved' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional tags to categorize this snapshot (e.g. ["sprint-1", "pre-audit"])',
          },
        },
        required: ['name'],
      },
      execute: async (input) => {
        const schemaValidation = validateSchema(
          {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
            },
            required: ['name'],
          },
          input
        );
        if (!schemaValidation.valid) {
          return validationError(schemaValidation.error!);
        }
        return service.saveSnapshotToStorage(input);
      },
    },
    {
      name: 'list_workspace_snapshots',
      description: 'List all saved workspace snapshots stored in LocalStorage with metadata and resource counts.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        return service.listSnapshotsFromStorage();
      },
    },
    {
      name: 'restore_workspace_snapshot',
      description: 'Restore the entire project configuration and views from a previously saved LocalStorage snapshot ID.',
      inputSchema: {
        type: 'object',
        properties: {
          snapshotId: { type: 'string', description: 'ID of the snapshot to restore' },
          createBackupFirst: {
            type: 'boolean',
            description: 'Whether to create an automatic safety backup of current workspace state before restoring (default: true)',
          },
        },
        required: ['snapshotId'],
      },
      execute: async (input) => {
        const schemaValidation = validateSchema(
          {
            type: 'object',
            properties: {
              snapshotId: { type: 'string' },
              createBackupFirst: { type: 'boolean' },
            },
            required: ['snapshotId'],
          },
          input
        );
        if (!schemaValidation.valid) {
          return validationError(schemaValidation.error!);
        }
        return service.restoreSnapshotFromStorage(input);
      },
    },
  ];
}
