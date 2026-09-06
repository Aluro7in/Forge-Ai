# Forge — Built for Two Users: Humans & AI Agents

> **"Forge is a workspace built for two users: humans and AI agents. Humans set intent; agents use WebMCP to plan, create, modify, and organize real workspace data under human control. Humans and AI agents build together—agents use WebMCP to operate real app capabilities, while people direct, review, approve, and undo changes."**

---

## The Dual-User Operating Model

Traditional software is built exclusively for human point-and-click interaction, while chat interfaces isolate AI into passive text boxes. **Forge** redesigns the workspace from the ground up for two first-class citizens:

| User | Role in Forge | Core Mechanics |
| :--- | :--- | :--- |
| **Human** | **Intent & Governance** | Directs high-level goals via natural language or voice, reviews structured diff proposals, approves/rejects mutations, and reverts changes with 1-click snapshot undo. |
| **AI Agent** | **WebMCP Execution** | Inspects real workspace data, invokes registered browser tools on `document.modelContext`, coordinates milestones, breaks down tasks, updates canvas nodes, and authors project specs. |

---

## Key Capabilities

1. **Dual-User Co-Creation**:
   - People direct, agents execute.
   - High-impact operations produce **Diff Proposals** with before/after visual inspection before committing.
   - Every applied proposal captures a cryptographic workspace snapshot for instant, deterministic **Undo**.

2. **18 Genuine WebMCP Tools on `document.modelContext`**:
   - Browser-native WebMCP registration following the OpenAI WebMCP specification with strict JSON Schemas.
   - External browser agents in ChatGPT, Chrome, or autonomous runtimes can directly discover and execute tools via:
     ```javascript
     await document.modelContext.execute("create_task", {
       title: "Launch marketing campaign",
       priority: "urgent",
       estimateDays: 3
     });
     ```

3. **Multi-View Workspace**:
   - **Kanban Board**: Drag-and-drop task workflow with inline quick-edit and instant WebMCP synchronization.
   - **Task List**: Dense tabular view with multi-faceted filtering, priority badges, and status grouping.
   - **Milestones**: Gantt-style timeline tracking phase progress, dependencies, and target dates.
   - **2D Canvas**: Visual ideation space with interconnected nodes, sticky notes, and system diagrams.
   - **Documents**: Markdown-powered project wiki and engineering specifications.
   - **WebMCP Inspector**: Live runtime debugger displaying registered schemas, parameters, and invocation logs.

4. **Voice-First Accessibility**:
   - Hands-free voice interaction via native Web Speech API (`SpeechRecognition` and `SpeechSynthesis`).
   - Listen, transcribe, execute WebMCP tools, and speak concise confirmation summaries.

5. **Judge Demonstration Walkthrough**:
   - 3-step hero workflow built into the header demonstrating:
     1. Planning Loop (*"Create a realistic two-week product launch plan for a two-person team"*)
     2. Dynamic Scope-Down (*"This is too ambitious. Make it achievable for two people in fourteen days"*)
     3. 1-Click Snapshot Undo (*Revert back to clean initial state with zero data loss*)

---

## WebMCP Tool Catalog

- **Workspace & Inspection**: `get_project_state`, `analyze_project`
- **Tasks**: `create_task`, `update_task`, `delete_task`, `batch_create_tasks`
- **Milestones**: `create_milestone`, `update_milestone`
- **Canvas Nodes**: `create_canvas_node`, `update_canvas_node`, `delete_canvas_node`
- **Documents**: `create_document`, `update_document`
- **AI Planning & Governance**: `generate_plan`, `propose_changes`, `apply_proposal`, `reject_proposal`, `undo_changes`

---

## Technical Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (Editorial aesthetic, high-contrast typography, mathematical spacing)
- **Animation**: `motion/react`
- **Icons**: `lucide-react`
- **Protocol**: WebMCP (`window.document.modelContext`)
