"use client";

import { useState, type CSSProperties } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Avatar } from "@heroui/avatar";
import { Chip } from "@heroui/chip";
import { Progress } from "@heroui/progress";
import { Input } from "@heroui/input";
import { Modal, ModalContent, ModalHeader } from "@heroui/modal";
import { FiPlus } from "react-icons/fi";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Task = {
  id: string;
  title: string;
  tag: string;
  progress?: number;
  dueDate?: string;
  members?: string[]; // initials for demo
};
type ColumnData = { id: string; title: string; accent: string; tasks: Task[] };

function TaskCard(
  { id, title, tag, progress, onOpen }: Task & { onOpen: () => void },
) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  } as CSSProperties;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        shadow="sm"
        className="border border-default-200 cursor-pointer hover:border-primary w-full"
        onClick={onOpen}
      >
        <CardHeader className="justify-between">
          <Chip size="sm" variant="flat" color="secondary">
            {tag}
          </Chip>
          <div
            className="text-default-400 cursor-grab active:cursor-grabbing touch-none select-none"
            aria-label="Drag card"
            {...listeners}
          >
            ⋮⋮
          </div>
        </CardHeader>
        <CardBody className="gap-3">
          <p className="font-medium text-default-800">{title}</p>
          {typeof progress === "number" && (
            <Progress
              aria-label="progress"
              value={progress}
              color={progress >= 100 ? "success" : "warning"}
              className="max-w-full"
            />
          )}
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              <Avatar size="sm" name="AL" className="ring-2 ring-background" />
              <Avatar size="sm" name="MF" className="ring-2 ring-background" />
              <Avatar size="sm" name="JR" className="ring-2 ring-background" />
            </div>
            <span className="text-tiny text-default-500">2d left</span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Column({ data, onAdd, onOpen }: { data: ColumnData; onAdd: (colId: string, title: string) => void; onOpen: (task: Task) => void }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const { setNodeRef } = useDroppable({ id: data.id });
  return (
    <div className="flex h-full w-72 sm:w-63 flex-col rounded-2xl border border-default-200 bg-content1 p-3">
      <div className="flex items-center gap-3">
        <h3 className="text-small font-semibold text-default-600">
          {data.title}
          <span className="ml-2 rounded-full bg-default-100 px-2 py-0.5 text-tiny text-default-600">
            {data.tasks.length}
          </span>
        </h3>
        <div className={`h-1 flex-1 rounded-full ${data.accent}`} />
      </div>
      <SortableContext items={data.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1 no-scrollbar">
          {data.tasks.map((t) => (
            <TaskCard key={t.id} {...t} onOpen={() => onOpen(t)} />
          ))}
        </div>
      </SortableContext>
      <div className="pt-2">
        {adding ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              size="sm"
              variant="bordered"
              placeholder="Task title"
              value={text}
              onValueChange={setText}
              onBlur={() => {
                setTimeout(() => {
                  setAdding(false)
                  setText("");
                }, 80);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && text.trim()) {
                  onAdd(data.id, text.trim());
                  setText("");
                  setAdding(false);
                }
                if (e.key === "Escape"){
                  setText("");
                  setAdding(false)
                };
              }}
            />
            <Button
              size="sm"
              color="primary"
              isDisabled={!text.trim()}
              onPress={() => {
                if (!text.trim()) return;
                onAdd(data.id, text.trim());
                setText("");
                setAdding(false);
              }}
            >
              Add
            </Button>
          </div>
        ) : (
          <Button fullWidth size="sm" variant="flat" startContent={<FiPlus />} onPress={() => setAdding(true)}>
            New Task
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [columns, setColumns] = useState<ColumnData[]>([
    {
      id: "todo",
      title: "To Do",
      accent: "bg-danger",
      tasks: [
        { id: "t1", title: "Design System", tag: "UI Design", progress: 20, members: ["AL", "MF"], dueDate: "Sep 28, 4:25 PM" },
        { id: "t2", title: "High Fidelity - UI", tag: "UI Design", progress: 50, members: ["JR"], dueDate: "Oct 2, 10:00 AM" },
        { id: "t3", title: "Prototype", tag: "UI Design", progress: 10 },
        { id: "t4", title: "Usability Testing", tag: "Testing" },
      ],
    },
    {
      id: "inprogress",
      title: "In Progress",
      accent: "bg-warning",
      tasks: [
        { id: "t5", title: "Copywriting Guide", tag: "UX Writing", progress: 30, members: ["AL"], dueDate: "Oct 4, 2:00 PM" },
        { id: "t6", title: "Illustrations", tag: "UI Design", progress: 75 },
        { id: "t7", title: "Wireframing", tag: "UX", progress: 55 },
      ],
    },
    {
      id: "review",
      title: "On Review",
      accent: "bg-secondary",
      tasks: [
        { id: "t8", title: "Accessibility Review", tag: "QA", progress: 80, members: ["MF", "JR"] },
        { id: "t9", title: "Content Review", tag: "Review", progress: 65 },
      ],
    },
    {
      id: "revision",
      title: "Revision",
      accent: "bg-warning-300",
      tasks: [
        { id: "t10", title: "Update Icons", tag: "UI", progress: 40 },
        { id: "t11", title: "Refine Copy", tag: "UX Writing", progress: 35 },
      ],
    },
    {
      id: "complete",
      title: "Complete",
      accent: "bg-success",
      tasks: [
        { id: "t12", title: "Moodboard", tag: "Research", progress: 100 },
        { id: "t13", title: "Brainstorming", tag: "Research", progress: 100 },
      ],
    },
    {
      id: "pending",
      title: "Pending",
      accent: "bg-default-400",
      tasks: [{ id: "t14", title: "Awaiting Brief", tag: "Planning" }],
    },
  ]);

  const handleAdd = (colId: string, title: string) => {
    setColumns((prev) =>
      prev.map((c) =>
        c.id === colId
          ? {
              ...c,
              tasks: [
                { id: `${colId}-${Date.now()}`, title, tag: "Task" },
                ...c.tasks,
              ],
            }
          : c,
      ),
    );
  };

  // Drag and drop sensors + handlers
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  const [dragging, setDragging] = useState(false);

  const onDragStart = (_e: DragStartEvent) => setDragging(true);
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(false);
    console.log('drag')
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const fromColIndex = columns.findIndex((c) => c.tasks.some((t) => t.id === activeId));
    if (fromColIndex === -1) return;
    let toColIndex = columns.findIndex((c) => c.tasks.some((t) => t.id === overId));
    if (toColIndex === -1) {
      // allow dropping into empty column by using column id
      toColIndex = columns.findIndex((c) => c.id === overId);
      if (toColIndex === -1) return;
    }

    const fromCol = columns[fromColIndex];
    const toCol = columns[toColIndex];
    const fromIdx = fromCol.tasks.findIndex((t) => t.id === activeId);

    if (fromColIndex === toColIndex) {
      let overIdx = toCol.tasks.findIndex((t) => t.id === overId);
      if (overIdx === -1) overIdx = toCol.tasks.length - 1; // drop to end when over column
      if (fromIdx === -1 || overIdx === -1) return;
      const newTasks = arrayMove(toCol.tasks, fromIdx, overIdx);
      const next = [...columns];
      next[fromColIndex] = { ...toCol, tasks: newTasks };
      setColumns(next);
      return;
    }

    // Move across columns
    const task = fromCol.tasks[fromIdx];
    if (!task) return;
    const fromTasks = [...fromCol.tasks];
    fromTasks.splice(fromIdx, 1);
    const toTasks = [...toCol.tasks];
    const overIdx = toCol.tasks.findIndex((t) => t.id === overId);
    const insertIdx = overIdx >= 0 ? overIdx : toTasks.length;
    toTasks.splice(insertIdx, 0, task);

    const next = [...columns];
    next[fromColIndex] = { ...fromCol, tasks: fromTasks };
    next[toColIndex] = { ...toCol, tasks: toTasks };
    setColumns(next);
  };

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ task: Task; column: string } | null>(
    null,
  );

  const openTask = (task: Task, column: string) => {
    setSelected({ task, column });
    setOpen(true);
  };

  return (
    <div className="flex h-[calc(100dvh-64px-48px)] min-h-0 flex-col overflow-hidden">
      <header className="flex items-center justify-between py-2 px-2 sm:px-0">
        <div>
          <p className="text-tiny text-default-500">Workspaces / Mobile App / Board</p>
          <h1 className="text-2xl font-semibold">Web Design</h1>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="flat">Share</Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden no-scrollbar">
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex h-full min-w-full gap-4 pb-2 pr-2">
            {columns.map((col) => (
              <div key={col.id} className="flex h-full min-h-0 flex-col">
                {/* Wrap each column's list with SortableContext inside Column */}
                <Column
                  data={col}
                  onAdd={handleAdd}
                  onOpen={(t) => {
                    if (!dragging) openTask(t, col.title);
                  }}
                />
              </div>
            ))}
          </div>
          <DragOverlay>
            {(() => {
              // simple visual overlay using selected card when dragging
              return null; // keep lightweight; DnD kit will clone via transform already
            })()}
          </DragOverlay>
        </DndContext>
      </div>

      <div className="sm:hidden flex items-center gap-2 px-2 pb-1 pt-1">
        <Button variant="flat" size="sm">Share</Button>
      </div>

      <Modal isOpen={open} onOpenChange={setOpen} size="5xl">
        <ModalContent>
          {() => (
            <div className="grid w-full grid-cols-1 gap-6 p-8 md:grid-cols-[1fr_360px]">
              <div>
                <ModalHeader className="flex items-center gap-3 p-0">
                  <Chip variant="flat">{selected?.column}</Chip>
                  <h2 className="text-2xl font-semibold">{selected?.task.title}</h2>
                </ModalHeader>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="flat">+ Add</Button>
                  <Button size="sm" variant="flat">Checklist</Button>
                  <Button size="sm" variant="flat">Attachment</Button>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-tiny text-default-500">Members</p>
                    <div className="mt-2 flex items-center gap-2">
                      {selected?.task.members?.map((m) => (
                        <Avatar key={m} name={m} size="sm" className="ring-2 ring-background" />
                      ))}
                      <Button isIconOnly size="sm" variant="light">+</Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-tiny text-default-500">Labels</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Chip color="success" variant="flat">{selected?.task.tag || "Label"}</Chip>
                      <Button isIconOnly size="sm" variant="light">+</Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-tiny text-default-500">Due date</p>
                    <div className="mt-2">
                      <Button variant="bordered" size="sm">{selected?.task.dueDate || "Set due date"}</Button>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-small text-default-500">Description</p>
                  <textarea
                    className="mt-2 min-h-28 w-full resize-y rounded-xl border border-default-200 bg-content2 p-3 outline-none"
                    placeholder="Add a more detailed description..."
                  />
                </div>
              </div>
              <div>
                <ModalHeader className="p-0">Comments and activity</ModalHeader>
                <div className="mt-3 space-y-4">
                  <Input placeholder="Write a comment..." variant="bordered" />
                  <div className="flex items-start gap-3 rounded-xl border border-default-200 p-3">
                    <Avatar name={selected?.task.members?.[0] || "AL"} size="sm" />
                    <div>
                      <p className="text-small"><span className="font-medium">You</span> added this card to {selected?.column}</p>
                      <p className="text-tiny text-default-500">just now</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
