"use client";

import { Modal, ModalContent, ModalHeader } from "@heroui/modal";
import { Checkbox } from "@heroui/checkbox";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import api from "@/lib/api";

export function DatesModal({
  isOpen,
  onOpenChange,
  isViewer,
  taskId,
  startEnabled,
  setStartEnabled,
  startDate,
  setStartDate,
  due,
  setDue,
  onChanged,
  saveDue,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isViewer: boolean;
  taskId: string;
  startEnabled: boolean;
  setStartEnabled: (v: boolean) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  due: string;
  setDue: (v: string) => void;
  onChanged: () => void;
  saveDue: (val: string) => Promise<void> | void;
}) {
  const saveAll = async () => {
    if (!isViewer) {
      await saveDue(due);
      try { await api.patch(`/api/tasks/${taskId}`, { startDate: startEnabled ? new Date(startDate).toISOString() : null }); } catch {}
      // Rely on SSE to propagate changes
    }
    onOpenChange(false);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {() => (
          <div className="p-6">
            <ModalHeader className="p-0 mb-3">Dates</ModalHeader>
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox isSelected={startEnabled} onValueChange={setStartEnabled} />
                  Start date
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    type="date"
                    value={startDate.split("T")[0] || ""}
                    onChange={(e) =>
                      setStartDate(
                        e.target.value + (startDate.includes("T") ? "T" + startDate.split("T")[1] : "T00:00"),
                      )
                    }
                    disabled={!startEnabled}
                  />
                  <Input
                    type="time"
                    value={startDate.split("T")[1]?.slice(0, 5) || ""}
                    onChange={(e) =>
                      setStartDate((startDate.split("T")[0] || new Date().toISOString().slice(0, 10)) + "T" + e.target.value)
                    }
                    disabled={!startEnabled}
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox defaultSelected isReadOnly />
                  Due date
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    type="date"
                    value={due.split("T")[0] || ""}
                    onChange={(e) => setDue(e.target.value + (due.includes("T") ? "T" + due.split("T")[1] : "T12:00"))}
                  />
                  <Input
                    type="time"
                    value={due.split("T")[1]?.slice(0, 5) || ""}
                    onChange={(e) =>
                      setDue((due.split("T")[0] || new Date().toISOString().slice(0, 10)) + "T" + e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="light" onPress={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button color="primary" onPress={saveAll}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
