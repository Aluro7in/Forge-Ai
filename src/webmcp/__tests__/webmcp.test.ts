import { createInMemoryWorkspaceService } from '../../services/workspaceService';
import { buildAllWebMCPTools } from '../registry';

interface TestCaseResult {
  suiteNumber: number;
  name: string;
  passed: boolean;
  durationMs: number;
  details: string;
  payload?: any;
}

export async function runWebMcpTestSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestCaseResult[];
}> {
  const results: TestCaseResult[] = [];
  const { service, getState } = createInMemoryWorkspaceService();
  const tools = buildAllWebMCPTools(service);
  const toolMap = new Map(tools.map((t) => [t.name, t]));

  const runTest = async (
    suiteNumber: number,
    name: string,
    fn: () => Promise<{ passed: boolean; details: string; payload?: any }>
  ) => {
    const start = performance.now();
    try {
      const res = await fn();
      results.push({
        suiteNumber,
        name,
        passed: res.passed,
        durationMs: Math.round(performance.now() - start),
        details: res.details,
        payload: res.payload,
      });
    } catch (err: any) {
      results.push({
        suiteNumber,
        name,
        passed: false,
        durationMs: Math.round(performance.now() - start),
        details: `Exception thrown: ${err?.message || String(err)}`,
      });
    }
  };

  // Test 1: Valid tool invocation
  await runTest(1, 'Valid Tool Invocation (get_project_state)', async () => {
    const tool = toolMap.get('get_project_state');
    if (!tool) return { passed: false, details: 'Tool get_project_state not registered' };
    const res = await tool.execute({ includeDocuments: false });
    const passed = res && res.success === true && res.project && Array.isArray(res.tasks);
    return {
      passed,
      details: passed
        ? `Successfully fetched project state: ${res.tasks.length} tasks, ${res.milestones.length} milestones.`
        : 'Result did not match expected structure',
      payload: res,
    };
  });

  // Test 2: Invalid arguments
  await runTest(2, 'Invalid Arguments (analyze_project with negative teamSize)', async () => {
    const tool = toolMap.get('analyze_project');
    if (!tool) return { passed: false, details: 'Tool analyze_project not registered' };
    const res = await tool.execute({ teamSize: -5, timeframeDays: 14 });
    const passed = res && res.success === false && res.code === 'INVALID_ARGUMENT';
    return {
      passed,
      details: passed
        ? `Rejected invalid arguments with code "${res.code}": ${res.error}`
        : 'Failed to reject invalid teamSize',
      payload: res,
    };
  });

  // Test 3: Missing required arguments
  await runTest(3, 'Missing Required Arguments (create_task missing title)', async () => {
    const tool = toolMap.get('create_task');
    if (!tool) return { passed: false, details: 'Tool create_task not registered' };
    const res = await tool.execute({});
    const passed = res && res.success === false && res.code === 'VALIDATION_ERROR';
    return {
      passed,
      details: passed
        ? `Rejected missing required field with "${res.code}": ${res.error}`
        : 'Failed to catch missing required argument',
      payload: res,
    };
  });

  // Test 4: Unknown project
  await runTest(4, 'Unknown Project Handling (get_project_state with non-existent id)', async () => {
    const tool = toolMap.get('get_project_state');
    if (!tool) return { passed: false, details: 'Tool get_project_state not registered' };
    const res = await tool.execute({ projectId: 'non-existent-proj-999' });
    const passed = res && res.success === false && res.code === 'NOT_FOUND';
    return {
      passed,
      details: passed
        ? `Handled unknown project safely with "${res.code}": ${res.error}`
        : 'Did not return NOT_FOUND for invalid project ID',
      payload: res,
    };
  });

  // Test 5: Unknown task
  await runTest(5, 'Unknown Task Handling (update_task with invalid taskId)', async () => {
    const tool = toolMap.get('update_task');
    if (!tool) return { passed: false, details: 'Tool update_task not registered' };
    const res = await tool.execute({ taskId: 'invalid-task-xyz', title: 'New Title' });
    const passed = res && res.success === false && res.code === 'NOT_FOUND';
    return {
      passed,
      details: passed
        ? `Safely caught non-existent task with "${res.code}": ${res.error}`
        : 'Did not return NOT_FOUND for unknown task',
      payload: res,
    };
  });

  // Test 6: State mutation
  await runTest(6, 'State Mutation (create_task modifying real application state)', async () => {
    const tool = toolMap.get('create_task');
    if (!tool) return { passed: false, details: 'Tool create_task not registered' };
    const countBefore = getState().tasks.length;
    const res = await tool.execute({
      title: 'Automated Test Task for WebMCP Validation',
      priority: 'high',
      estimateDays: 2,
    });
    const countAfter = getState().tasks.length;
    const createdInState = getState().tasks.find((t) => t.id === res?.taskId);
    const passed = res && res.success === true && countAfter === countBefore + 1 && !!createdInState;
    return {
      passed,
      details: passed
        ? `Real state modified: task count increased from ${countBefore} to ${countAfter}. Task ID "${res.taskId}" exists in memory.`
        : 'Task was not added to state',
      payload: { taskId: res?.taskId, countBefore, countAfter },
    };
  });

  // Test 7: Tool result structure
  await runTest(7, 'Tool Result Standard Structure ({ success: true, ... })', async () => {
    const tool = toolMap.get('generate_plan');
    if (!tool) return { passed: false, details: 'Tool generate_plan not registered' };
    const res = await tool.execute({ goal: 'Launch WebMCP product in 14 days' });
    const passed =
      res &&
      typeof res.success === 'boolean' &&
      res.success === true &&
      typeof res.planTitle === 'string' &&
      Array.isArray(res.suggestedMilestones);
    return {
      passed,
      details: passed
        ? `Clean contract returned with success: ${res.success}, plan: "${res.planTitle}".`
        : 'Result does not follow standard ToolResult shape',
      payload: res,
    };
  });

  // Test 8: Approval workflow
  await runTest(8, 'Approval Workflow (Safety gate prevents applying pending proposal without approval)', async () => {
    const proposeTool = toolMap.get('propose_changes');
    const applyTool = toolMap.get('apply_approved_changes');
    if (!proposeTool || !applyTool) return { passed: false, details: 'Approval tools not registered' };

    // Stage proposal
    const propRes = await proposeTool.execute({
      title: 'Critical Scope Pruning',
      summary: 'Remove non-essential video walkthrough',
      changes: [
        {
          id: 'diff-test-1',
          actionType: 'delete',
          entityType: 'task',
          entityId: getState().tasks[0]?.id || 'task-1',
          entityTitle: 'Sample Task',
          reason: 'Test safety gate',
        },
      ],
    });

    const proposalId = propRes?.proposalId;

    // Try applying without human confirmation
    const unauthorizedAttempt = await applyTool.execute({ proposalId, humanConfirmed: false });
    const blockedProperly = unauthorizedAttempt?.code === 'APPROVAL_REQUIRED';

    // Now apply with human confirmation
    const authorizedAttempt = await applyTool.execute({ proposalId, humanConfirmed: true });
    const appliedProperly = authorizedAttempt?.success === true && authorizedAttempt?.status === 'applied';

    const passed = blockedProperly && appliedProperly;
    return {
      passed,
      details: passed
        ? `Gating passed: Unauthorized attempt was blocked with APPROVAL_REQUIRED, and human-confirmed attempt succeeded.`
        : 'Approval gate failed to enforce policy',
      payload: { blockedResult: unauthorizedAttempt, authorizedResult: authorizedAttempt },
    };
  });

  // Test 9: Undo workflow
  await runTest(9, 'Undo Workflow (undo_changes restoring workspace snapshot)', async () => {
    const undoTool = toolMap.get('undo_changes');
    if (!undoTool) return { passed: false, details: 'Tool undo_changes not registered' };

    const taskCountBefore = getState().tasks.length;
    const undoRes = await undoTool.execute({});
    const taskCountAfter = getState().tasks.length;

    const passed = undoRes && undoRes.success === true && typeof undoRes.restoredSnapshotId === 'string';
    return {
      passed,
      details: passed
        ? `Snapshot restored: "${undoRes.label}" (ID: ${undoRes.restoredSnapshotId}). Task count shifted ${taskCountBefore} -> ${taskCountAfter}.`
        : 'Undo failed to restore snapshot',
      payload: undoRes,
    };
  });

  // Test 10: Atomic bulk task creation (bulk_apply_tasks)
  await runTest(10, 'Atomic Bulk Mutation (bulk_apply_tasks batch creation)', async () => {
    const bulkTool = toolMap.get('bulk_apply_tasks');
    if (!bulkTool) return { passed: false, details: 'Tool bulk_apply_tasks not registered' };

    const tasksBefore = getState().tasks.length;
    const batchInput = {
      tasks: [
        { title: 'Setup Redis cluster cache', priority: 'high' as const, estimateDays: 1 },
        { title: 'Configure Cloudflare edge rules', priority: 'medium' as const, estimateDays: 1 },
        { title: 'Implement rate limiting middleware', priority: 'urgent' as const, estimateDays: 2 },
      ],
    };

    const res = await bulkTool.execute(batchInput);
    const tasksAfter = getState().tasks.length;
    const passed =
      res &&
      res.success === true &&
      res.count === 3 &&
      Array.isArray(res.tasks) &&
      tasksAfter === tasksBefore + 3 &&
      res.affectedObjects?.length === 3;

    return {
      passed,
      details: passed
        ? `Atomic batch succeeded: Created 3 tasks in 1 transaction (task count: ${tasksBefore} -> ${tasksAfter}).`
        : 'bulk_apply_tasks failed to commit atomic batch',
      payload: res,
    };
  });

  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;

  return {
    total,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}
