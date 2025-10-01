import { EventEmitter } from "events";

export type BoardEvent =
  | { type: "task.created"; workspaceId: string; task: { id: string; columnId: string; title: string; progress?: number; dueDate?: string | null } }
  | { type: "task.updated"; workspaceId: string; task: { id: string; title?: string; progress?: number; dueDate?: string | null } }
  | { type: "task.moved"; workspaceId: string; taskId: string; fromColumnId: string; toColumnId: string; position: string }
  | { type: "comment.created"; workspaceId: string; taskId: string; commentId: string }
  | { type: "task.deleted"; workspaceId: string; taskId: string }
  | { type: "workspace.members.changed"; workspaceId: string }
  // user-scoped events
  | { type: "workspaces.changed"; userId: string }
  | { type: "notification"; userId: string; notification: { id: string; title: string; message?: string; url?: string; createdAt: string } };

// Ensure a single emitter instance across hot reloads in dev
const globalForEvents = globalThis as unknown as { __evtEmitter?: EventEmitter };
export const emitter =
  globalForEvents.__evtEmitter ?? (globalForEvents.__evtEmitter = new EventEmitter());

// Avoid MaxListeners warnings when many SSE clients are connected
try { emitter.setMaxListeners(0); } catch {}

export function publish(evt: BoardEvent) {
  emitter.emit("evt", evt);
}
