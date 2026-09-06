import { WebMCPToolDefinition } from '../../types/forge';
import { WorkspaceService } from '../../services/workspaceService';
import { validateSchema, validationError } from '../validation';

export function createDocumentTools(service: WorkspaceService): WebMCPToolDefinition[] {
  return [
    {
      name: 'create_document',
      description: 'Create a new project specification or documentation file in markdown format.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Document title' },
          content: { type: 'string', description: 'Markdown content of the document' },
        },
        required: ['title', 'content'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['title', 'content'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.createDocument(input);
      },
    },
    {
      name: 'update_document',
      description: 'Update content of an existing project specification, incrementing version.',
      inputSchema: {
        type: 'object',
        properties: {
          documentId: { type: 'string', description: 'ID of the document to update' },
          content: { type: 'string', description: 'New markdown content' },
        },
        required: ['documentId', 'content'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            documentId: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['documentId', 'content'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.updateDocument(input);
      },
    },
  ];
}
