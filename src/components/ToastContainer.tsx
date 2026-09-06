import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useToast, ToastItem } from '../context/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm sm:max-w-md w-full pointer-events-none px-4"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />;
    }
  };

  const getBorderAndBg = () => {
    switch (toast.type) {
      case 'error':
        return 'border-rose-600 bg-white shadow-[4px_4px_0px_0px_rgba(225,29,72,0.25)]';
      case 'success':
        return 'border-emerald-600 bg-white shadow-[4px_4px_0px_0px_rgba(5,150,105,0.25)]';
      case 'warning':
        return 'border-amber-600 bg-white shadow-[4px_4px_0px_0px_rgba(217,119,6,0.25)]';
      case 'info':
      default:
        return 'border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]';
    }
  };

  const getBadgeColor = () => {
    switch (toast.type) {
      case 'error':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'success':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'warning':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'info':
      default:
        return 'bg-stone-100 text-stone-900 border-stone-300';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`pointer-events-auto border-2 p-3 sm:p-4 text-black relative flex items-start space-x-3 ${getBorderAndBg()}`}
      role="alert"
    >
      {getIcon()}

      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center space-x-2 mb-1">
          <span
            className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 border ${getBadgeColor()}`}
          >
            {toast.type}
          </span>
          <h4 className="text-xs font-bold text-black font-mono truncate">{toast.title}</h4>
        </div>

        {toast.message && (
          <p className="text-xs text-stone-700 font-sans leading-relaxed break-words">{toast.message}</p>
        )}
      </div>

      <button
        onClick={onDismiss}
        className="p-1 text-stone-400 hover:text-black hover:bg-stone-100 transition rounded-none shrink-0"
        title="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};
