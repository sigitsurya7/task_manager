"use client";

import { Modal, ModalContent, ModalHeader } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { FiSave } from "react-icons/fi";
import api from "@/lib/api";

type Label = { id: string; name: string; color: string; selected?: boolean };

export function LabelsModal({
  isOpen,
  onOpenChange,
  isViewer,
  allLabels,
  setAllLabels,
  labelQuery,
  setLabelQuery,
  showCreateLabel,
  setShowCreateLabel,
  newLabelName,
  setNewLabelName,
  taskId,
  onChanged,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isViewer: boolean;
  allLabels: Label[];
  setAllLabels: (updater: (prev: Label[]) => Label[]) => void;
  labelQuery: string;
  setLabelQuery: (v: string) => void;
  showCreateLabel: boolean;
  setShowCreateLabel: (v: boolean) => void;
  newLabelName: string;
  setNewLabelName: (v: string) => void;
  taskId: string;
  onChanged: () => void;
}) {
  const detach = async (id: string) => {
    try {
      await api.del(`/api/tasks/${taskId}/labels`, { labelId: id });
      setAllLabels((arr) => arr.map((x) => (x.id === id ? { ...x, selected: false } : x)));
      onChanged();
    } catch {}
  };
  const attach = async (id: string) => {
    try {
      await api.post(`/api/tasks/${taskId}/labels`, { labelId: id });
      setAllLabels((arr) => arr.map((x) => (x.id === id ? { ...x, selected: true } : x)));
      onChanged();
    } catch {}
  };
  const createLabel = async () => {
    const name = newLabelName.trim();
    if (!name) return;
    try {
      await api.post(`/api/tasks/${taskId}/labels`, { name });
      setNewLabelName("");
      // Rely on SSE to refresh labels; close create UI if there are existing labels
      onChanged();
      if (allLabels.length > 0) setShowCreateLabel(false);
    } catch {}
  };
  const refreshAndClose = async () => { onChanged(); onOpenChange(false); };
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {() => (
          <div className="p-6">
            <ModalHeader className="p-0 mb-3">Label</ModalHeader>
            <Input placeholder="Cari label..." value={labelQuery} onValueChange={setLabelQuery} className="mb-3" />
            <div className="space-y-2 mb-4">
              {allLabels
                .filter((l) => l.name.toLowerCase().includes(labelQuery.toLowerCase()))
                .map((l) => (
                  <div key={l.id} className="flex items-center justify-between px-2 py-1 rounded-md border border-default-200">
                    <span className="text-sm">{l.name}</span>
                    {!isViewer && (
                      l.selected ? (
                        <Button size="sm" variant="light" color="danger" onPress={() => detach(l.id)}>
                          Lepas
                        </Button>
                      ) : (
                        <Button size="sm" variant="light" onPress={() => attach(l.id)}>
                          Tambah
                        </Button>
                      )
                    )}
                  </div>
                ))}
            </div>

            {!isViewer && (
              <div className="mt-2">
                {!showCreateLabel && allLabels.length > 0 ? (
                  <Button size="sm" variant="bordered" onPress={() => setShowCreateLabel(true)}>
                    Tambah label baru
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input aria-label="Nama label baru" placeholder="Nama label baru" value={newLabelName} onValueChange={setNewLabelName} variant="bordered" className="flex-1" />
                    <Button isIconOnly color="primary" aria-label="Simpan label" onPress={createLabel}>
                      <FiSave />
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="light" onPress={() => onOpenChange(false)}>
                Tutup
              </Button>
              <Button color="primary" onPress={refreshAndClose}>
                Simpan
              </Button>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
