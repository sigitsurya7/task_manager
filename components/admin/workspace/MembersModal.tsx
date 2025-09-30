"use client";

import { Modal, ModalContent, ModalHeader } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Avatar } from "@heroui/avatar";
import { Checkbox } from "@heroui/checkbox";
import { Button } from "@heroui/button";
import api from "@/lib/api";

type Member = { id: string; username: string; name: string | null; role: string };

export function MembersModal({
  isOpen,
  onOpenChange,
  isViewer,
  members,
  memberQuery,
  setMemberQuery,
  selectedMemberIds,
  setSelectedMemberIds,
  taskId,
  onApplied,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isViewer: boolean;
  members: Member[];
  memberQuery: string;
  setMemberQuery: (v: string) => void;
  selectedMemberIds: Set<string>;
  setSelectedMemberIds: (updater: (prev: Set<string>) => Set<string>) => void;
  taskId: string;
  onApplied: (nextAssignees: { id: string; name: string | null; username: string }[]) => void;
}) {
  const applyChanges = async () => {
    if (isViewer) { onOpenChange(false); return; }
    const currentIds = new Set<string>();
    // build from currently selected in UI to compute add/remove
    // Consumers should pass initial state to selectedMemberIds when opening
    // Add newly selected
    for (const id of Array.from(selectedMemberIds)) {
      if (!currentIds.has(id)) {
        try {
          await api.post(`/api/tasks/${taskId}/assignees`, { userId: id });
        } catch {}
      }
    }
    // Remove unchecked: compute ids that are not in selectedMemberIds by reading assignees from server
    try {
      const d = await api.get<{ assignees?: { id: string }[] }>(`/api/tasks/${taskId}`);
      const prevIds: string[] = (d.assignees || []).map((a: any) => a.id);
        for (const id of prevIds) {
          if (!selectedMemberIds.has(id)) {
            try {
              await api.del(`/api/tasks/${taskId}/assignees`, { userId: id });
            } catch {}
          }
        }
    } catch {}

    const nextIds = Array.from(selectedMemberIds);
    const nextAssignees = nextIds
      .map((id) => members.find((m) => m.id === id))
      .filter(Boolean)
      .map((m) => ({ id: (m as Member).id, name: (m as Member).name, username: (m as Member).username }));
    onApplied(nextAssignees);
    onOpenChange(false);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {() => (
          <div className="p-6">
            <ModalHeader className="p-0 mb-3">Anggota</ModalHeader>
            <Input placeholder="Cari anggota" value={memberQuery} onValueChange={setMemberQuery} className="mb-3" />
            <div className="overflow-y-auto overflow-x-hidden pb-20 max-h-80 no-scrollbar space-y-2">
              {members
                .filter((u) => u.role !== "VIEWER")
                .filter(
                  (u) =>
                    u.username.toLowerCase().includes(memberQuery.toLowerCase()) ||
                    (u.name ?? "").toLowerCase().includes(memberQuery.toLowerCase()),
                )
                .map((u) => (
                  <div key={u.id} className="flex items-center justify-between shadow rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.name ?? u.username} size="sm" />
                      <span>{u.name ? `${u.name}` : u.username}</span>
                    </div>
                    <Checkbox
                      isSelected={selectedMemberIds.has(u.id)}
                      onValueChange={(val) => {
                        setSelectedMemberIds((prev) => {
                          const s = new Set(prev);
                          if (val) s.add(u.id);
                          else s.delete(u.id);
                          return s;
                        });
                      }}
                    />
                  </div>
                ))}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="light" onPress={() => onOpenChange(false)}>
                Tutup
              </Button>
              <Button color="primary" onPress={applyChanges}>
                Terapkan
              </Button>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
