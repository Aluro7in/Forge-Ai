import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Plus, Check } from 'lucide-react';
import { Task } from '../types/forge';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';

interface TaskTimerTrackerProps {
  task: Task;
  activeTimerTaskId: string | null;
  onTimerStart: (taskId: string) => void;
  onTimerStop: () => void;
}

export const TaskTimerTracker: React.FC<TaskTimerTrackerProps> = ({
  task,
  activeTimerTaskId,
  onTimerStart,
  onTimerStop,
}) => {
  const { executeToolByName } = useWorkspace();
  const { showChangesSaved } = useToast();

  const isRunning = activeTimerTaskId === task.id;
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const timerIntervalRef = useRef<number | null>(null);

  // When active timer switches away from this task, reset session seconds
  useEffect(() => {
    if (!isRunning) {
      setSessionSeconds(0);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [isRunning]);

  // Interval for active stopwatch
  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = window.setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds > 0 && totalSec < 36000 ? `${seconds}s` : ''}`.trim();
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const formatStopwatch = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const totalLoggedSeconds = (task.timeSpentSeconds || 0) + (isRunning ? sessionSeconds : 0);
  const estimatedHours = (task.estimateDays || 1) * 8;
  const estimatedSeconds = estimatedHours * 3600;
  const progressPercent = Math.min(100, Math.round((totalLoggedSeconds / estimatedSeconds) * 100));

  const handleToggleTimer = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isRunning) {
      // Pause & commit elapsed time
      onTimerStop();
      if (sessionSeconds > 0) {
        setIsSaving(true);
        try {
          await executeToolByName('log_task_time', {
            taskId: task.id,
            secondsToAdd: sessionSeconds,
          });
          showChangesSaved({
            entity: 'task',
            name: task.title,
            message: `Logged +${formatTime(sessionSeconds)} on "${task.title}".`,
          });
        } finally {
          setIsSaving(false);
          setSessionSeconds(0);
        }
      }
    } else {
      // Start timer
      onTimerStart(task.id);
      setSessionSeconds(0);
    }
  };

  const handleQuickAdd = async (e: React.MouseEvent, minutes: number) => {
    e.stopPropagation();
    setShowQuickMenu(false);
    setIsSaving(true);
    try {
      const addedSeconds = minutes * 60;
      await executeToolByName('log_task_time', {
        taskId: task.id,
        secondsToAdd: addedSeconds,
      });
      showChangesSaved({
        entity: 'task',
        name: task.title,
        message: `Added +${minutes}m to "${task.title}". Total: ${formatTime((task.timeSpentSeconds || 0) + addedSeconds)}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetTime = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) {
      onTimerStop();
    }
    setSessionSeconds(0);
    setShowQuickMenu(false);
    setIsSaving(true);
    try {
      await executeToolByName('log_task_time', {
        taskId: task.id,
        totalSeconds: 0,
      });
      showChangesSaved({
        entity: 'task',
        name: task.title,
        message: `Reset logged time on "${task.title}".`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`pt-2 border-t text-[10px] transition-colors ${
        isRunning
          ? 'bg-amber-50/70 -mx-4 -mb-4 px-4 pb-3 border-amber-300'
          : 'border-stone-100 hover:border-stone-200'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-1.5">
        {/* Left: Timer status and digits */}
        <div className="flex items-center space-x-1.5 min-w-0">
          <button
            type="button"
            onClick={handleToggleTimer}
            disabled={isSaving}
            className={`flex items-center justify-center w-5 h-5 rounded-none border transition shrink-0 ${
              isRunning
                ? 'bg-black text-white border-black hover:bg-stone-800 animate-pulse'
                : 'bg-white text-stone-700 border-stone-300 hover:border-black hover:text-black'
            }`}
            title={isRunning ? 'Pause timer and save logged time' : 'Start tracking time for this task'}
          >
            {isRunning ? <Pause className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current ml-0.5" />}
          </button>

          <div className="flex items-center space-x-1 truncate font-mono">
            {isRunning ? (
              <span className="flex items-center space-x-1 font-bold text-amber-900">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping shrink-0" />
                <span>{formatStopwatch(sessionSeconds)}</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-stone-600">
                <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="font-medium text-stone-800">
                  {task.timeSpentSeconds && task.timeSpentSeconds > 0
                    ? formatTime(task.timeSpentSeconds)
                    : '0m'}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Ratio & Quick actions */}
        <div className="flex items-center space-x-1 shrink-0">
          <span className="text-[9px] font-mono text-stone-400" title={`Estimated: ${estimatedHours}h (${task.estimateDays}d)`}>
            {progressPercent}%
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickMenu(!showQuickMenu);
              }}
              className="px-1 py-0.5 text-stone-400 hover:text-black text-[9px] font-mono hover:bg-white border border-transparent hover:border-stone-200 transition"
              title="Quick log time (+15m, +30m, +1h) or reset"
            >
              +log
            </button>

            {showQuickMenu && (
              <div
                className="absolute right-0 bottom-full mb-1 z-30 bg-white border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] p-1.5 min-w-[110px] space-y-1 font-mono text-[10px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[9px] uppercase tracking-wider text-stone-400 px-1 pb-1 border-b border-stone-100 font-bold">
                  Quick Log
                </div>
                <button
                  type="button"
                  onClick={(e) => handleQuickAdd(e, 15)}
                  className="w-full text-left px-1.5 py-0.5 hover:bg-stone-100 text-stone-700 hover:text-black flex items-center justify-between"
                >
                  <span>+15 min</span>
                  <span className="text-stone-400 text-[8px]">0.25h</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleQuickAdd(e, 30)}
                  className="w-full text-left px-1.5 py-0.5 hover:bg-stone-100 text-stone-700 hover:text-black flex items-center justify-between"
                >
                  <span>+30 min</span>
                  <span className="text-stone-400 text-[8px]">0.5h</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleQuickAdd(e, 60)}
                  className="w-full text-left px-1.5 py-0.5 hover:bg-stone-100 text-stone-700 hover:text-black flex items-center justify-between"
                >
                  <span>+1 hour</span>
                  <span className="text-stone-400 text-[8px]">1.0h</span>
                </button>
                {((task.timeSpentSeconds || 0) > 0 || sessionSeconds > 0) && (
                  <button
                    type="button"
                    onClick={handleResetTime}
                    className="w-full text-left px-1.5 py-0.5 hover:bg-red-50 text-red-600 border-t border-stone-100 pt-1 flex items-center space-x-1"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress micro-bar against estimate */}
      <div
        className="w-full bg-stone-200/80 h-1 mt-1.5 rounded-none overflow-hidden"
        title={`Logged: ${formatTime(totalLoggedSeconds)} of ${estimatedHours}h estimate (${progressPercent}%)`}
      >
        <div
          className={`h-full transition-all duration-300 ${
            progressPercent > 100
              ? 'bg-red-500'
              : progressPercent >= 80
              ? 'bg-amber-500'
              : isRunning
              ? 'bg-amber-600'
              : 'bg-stone-800'
          }`}
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        />
      </div>
    </div>
  );
};
