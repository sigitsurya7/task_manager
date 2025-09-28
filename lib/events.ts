import { EventEmitter } from "events";

export type BoardEvent =
  | { type: "task.created"; workspaceId: string; task: { id: string; columnId: string; title: string; progress?: number; dueDate?: string | null } }
  | { type: "task.updated"; workspaceId: string; task: { id: string; title?: string; progress?: number; dueDate?: string | null } }
  | { type: "task.moved"; workspaceId: string; taskId: string; fromColumnId: string; toColumnId: string; position: string }
  | { type: "comment.created"; workspaceId: string; taskId: string; commentId: string };

export const emitter = new EventEmitter();

export function publish(evt: BoardEvent) {
  emitter.emit("evt", evt);
}
