import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface ToastItem {
  id: string;
  type: 'error' | 'success' | 'info' | 'warning';
  title: string;
  message?: string;
  durationMs?: number;
  timestamp: number;
}

export interface ChangesSavedOptions {
  entity?: 'task' | 'document' | 'milestone' | 'workspace' | string;
  name?: string;
  message?: string;
  durationMs?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id' | 'timestamp'>) => string;
  showChangesSaved: (options?: ChangesSavedOptions) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global subscription emitter for non-React callers (like WebMCP tool execution wrapper)
type ToastListener = (toast: Omit<ToastItem, 'id' | 'timestamp'>) => void;
const globalToastListeners = new Set<ToastListener>();

export function notifyToast(toast: Omit<ToastItem, 'id' | 'timestamp'>): void {
  globalToastListeners.forEach((listener) => {
    try {
      listener(toast);
    } catch {
      // ignore
    }
  });
}

/**
 * Automatically triggers a standardized 'Changes saved' notification
 * to reassure users of persistent state synchronization.
 */
export function notifyChangesSaved(options?: ChangesSavedOptions): void {
  const entityLabel = options?.entity
    ? options.entity.charAt(0).toUpperCase() + options.entity.slice(1)
    : 'Item';
  const message =
    options?.message ||
    (options?.name
      ? `${entityLabel} "${options.name}" persisted to workspace.`
      : 'All modifications have been safely persisted.');

  notifyToast({
    type: 'success',
    title: 'Changes saved',
    message,
    durationMs: options?.durationMs ?? 3000,
  });
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id' | 'timestamp'>): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const durationMs = toast.durationMs ?? (toast.type === 'error' ? 6000 : 4000);
      const newToast: ToastItem = {
        ...toast,
        id,
        durationMs,
        timestamp: Date.now(),
      };

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // maximum 5 toasts

      if (durationMs > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, durationMs);
      }

      return id;
    },
    [dismissToast]
  );

  const showChangesSaved = useCallback(
    (options?: ChangesSavedOptions): string => {
      const entityLabel = options?.entity
        ? options.entity.charAt(0).toUpperCase() + options.entity.slice(1)
        : 'Item';
      const message =
        options?.message ||
        (options?.name
          ? `${entityLabel} "${options.name}" persisted to workspace.`
          : 'All modifications have been safely persisted.');

      return showToast({
        type: 'success',
        title: 'Changes saved',
        message,
        durationMs: options?.durationMs ?? 3000,
      });
    },
    [showToast]
  );

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Connect global emitter to the React state
  useEffect(() => {
    const handleGlobal = (toast: Omit<ToastItem, 'id' | 'timestamp'>) => {
      showToast(toast);
    };
    globalToastListeners.add(handleGlobal);
    return () => {
      globalToastListeners.delete(handleGlobal);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, showChangesSaved, dismissToast, clearToasts }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
