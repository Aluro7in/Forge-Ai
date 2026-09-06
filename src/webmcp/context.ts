import { WebMCPToolDefinition, ModelContextGlobal, WebMCPEvent } from '../types/forge';

// Event listeners for UI telemetry
type WebMCPListener = (event: WebMCPEvent) => void;
const listeners: Set<WebMCPListener> = new Set();

export function subscribeWebMCP(listener: WebMCPListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(event: WebMCPEvent) {
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch (e) {
      console.error('[WebMCP] Listener error:', e);
    }
  });
}

class WebMCPModelContext implements ModelContextGlobal {
  private tools: Map<string, WebMCPToolDefinition> = new Map();

  registerTool(tool: WebMCPToolDefinition): void {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new Error('[WebMCP] Tool name must be a non-empty string.');
    }
    if (!tool.description) {
      console.warn(`[WebMCP] Tool "${tool.name}" registered without a description.`);
    }
    this.tools.set(tool.name, tool);
    notifyListeners({
      type: 'register',
      toolName: tool.name,
      description: tool.description,
    });
  }

  unregisterTool(toolName: string): void {
    if (this.tools.has(toolName)) {
      this.tools.delete(toolName);
      notifyListeners({
        type: 'unregister',
        toolName,
      });
    }
  }

  getRegisteredTools(): WebMCPToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async execute(toolName: string, input: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      const errorMsg = `Tool "${toolName}" is not registered in document.modelContext. Available tools: ${Array.from(this.tools.keys()).join(', ')}`;
      notifyListeners({
        type: 'call_end',
        toolName,
        error: errorMsg,
        durationMs: 0,
      });
      throw new Error(errorMsg);
    }

    const startTime = performance.now();
    notifyListeners({
      type: 'call_start',
      toolName,
      input,
    });

    try {
      // Validate schema basic requirements if specified
      if (tool.inputSchema?.required && Array.isArray(tool.inputSchema.required)) {
        for (const reqField of tool.inputSchema.required) {
          if (input === undefined || input === null || input[reqField] === undefined) {
            throw new Error(`Missing required field "${reqField}" for WebMCP tool "${toolName}"`);
          }
        }
      }

      const result = await tool.execute(input);
      const durationMs = Math.round(performance.now() - startTime);

      notifyListeners({
        type: 'call_end',
        toolName,
        output: result,
        durationMs,
      });

      return result;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      notifyListeners({
        type: 'call_end',
        toolName,
        error: err?.message || String(err),
        durationMs,
      });
      throw err;
    }
  }
}

// Ensure global singleton
declare global {
  interface Document {
    modelContext?: ModelContextGlobal;
  }
  interface Window {
    modelContext?: ModelContextGlobal;
  }
}

let contextInstance: WebMCPModelContext | null = null;

export function initializeWebMCP(): ModelContextGlobal {
  if (typeof document === 'undefined') {
    return new WebMCPModelContext();
  }

  if (!contextInstance) {
    contextInstance = new WebMCPModelContext();

    // If native document.modelContext exists, we keep its native methods or wrap it
    if (document.modelContext) {
      const nativeContext = document.modelContext;
      const originalRegister = nativeContext.registerTool?.bind(nativeContext);
      
      // Wrap registerTool so our registry also tracks it
      document.modelContext.registerTool = (tool: WebMCPToolDefinition) => {
        contextInstance!.registerTool(tool);
        if (originalRegister) {
          try {
            originalRegister(tool);
          } catch (e) {
            console.warn('[WebMCP] Native registerTool warning:', e);
          }
        }
      };

      if (!document.modelContext.getRegisteredTools) {
        document.modelContext.getRegisteredTools = () => contextInstance!.getRegisteredTools();
      }
      if (!document.modelContext.execute) {
        document.modelContext.execute = (name, input) => contextInstance!.execute(name, input);
      }
    } else {
      document.modelContext = contextInstance;
    }

    if (typeof window !== 'undefined') {
      window.modelContext = document.modelContext;
    }
  }

  return document.modelContext!;
}
