import { WebMCPToolDefinition } from '../../types/forge';
import { WorkspaceService } from '../../services/workspaceService';
import { validateSchema, validationError } from '../validation';

export function createCanvasTools(service: WorkspaceService): WebMCPToolDefinition[] {
  return [
    {
      name: 'create_canvas_card',
      description: 'Add a card, sticky note, architecture block, decision, or risk flag to the 2D project canvas.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Card title' },
          content: { type: 'string', description: 'Card markdown or text body' },
          type: {
            type: 'string',
            enum: ['note', 'architecture', 'decision', 'risk', 'metric'],
            description: 'Semantic type of canvas card',
          },
          x: { type: 'number', description: 'Horizontal canvas coordinate' },
          y: { type: 'number', description: 'Vertical canvas coordinate' },
          width: { type: 'number', description: 'Card width in pixels' },
          height: { type: 'number', description: 'Card height in pixels' },
        },
        required: ['title', 'content', 'type'],
      },
      execute: async (input) => {
        const schema = { 
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            type: { type: 'string', enum: ['note', 'architecture', 'decision', 'risk', 'metric'] },
            x: { type: 'number' },
            y: { type: 'number' },
            width: { type: 'number' },
            height: { type: 'number' },
          },
          required: ['title', 'content', 'type'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.createCanvasCard(input);
      },
    },
    {
      name: 'update_canvas_card',
      description: 'Update canvas card position, title, or content.',
      inputSchema: {
        type: 'object',
        properties: {
          cardId: { type: 'string', description: 'ID of canvas card to update' },
          title: { type: 'string', description: 'Updated card title' },
          content: { type: 'string', description: 'Updated card content' },
          x: { type: 'number', description: 'Updated horizontal position' },
          y: { type: 'number', description: 'Updated vertical position' },
        },
        required: ['cardId'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            cardId: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            x: { type: 'number' },
            y: { type: 'number' },
          },
          required: ['cardId'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.updateCanvasCard(input);
      },
    },
    {
      name: 'delete_canvas_card',
      description: 'Delete a card from the 2D canvas board.',
      inputSchema: {
        type: 'object',
        properties: {
          cardId: { type: 'string', description: 'ID of card to delete' },
        },
        required: ['cardId'],
      },
      execute: async (input) => {
        const schema = {
          type: 'object',
          properties: {
            cardId: { type: 'string' },
          },
          required: ['cardId'],
        };
        const validation = validateSchema(schema, input);
        if (!validation.valid) {
          return validationError(validation.error!);
        }
        return service.deleteCanvasCard(input);
      },
    },
  ];
}
