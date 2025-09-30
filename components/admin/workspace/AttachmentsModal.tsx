"use client";

import { useRef, useState } from "react";
import { Modal, ModalContent, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

export function AttachmentsModal({
  isOpen,
  onOpenChange,
  onAddFile,
  onAddLink,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFile: (file: File) => Promise<void> | void;
  onAddLink: (link: string, display?: string) => Promise<void> | void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingLink, setPendingLink] = useState("");
  const [pendingDisplay, setPendingDisplay] = useState("");

  const close = () => {
    onOpenChange(false);
    setPendingFile(null);
    setPendingLink("");
    setPendingDisplay("");
  };

  const save = async () => {
    if (pendingFile) await onAddFile(pendingFile);
    else if (pendingLink.trim()) await onAddLink(pendingLink.trim(), pendingDisplay.trim() || undefined);
    close();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {() => (
          <div className="p-6">
            <ModalHeader className="p-0 mb-3">Lampirkan</ModalHeader>
            <div className="space-y-4">
              <div>
                <p className="text-tiny text-default-500 mb-1">Lampirkan berkas dari komputer Anda</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setPendingFile(f);
                  }}
                />
                <Button onPress={() => fileInputRef.current?.click()}>Pilih berkas</Button>
                {pendingFile && <p className="text-tiny mt-1">Dipilih: {pendingFile.name}</p>}
              </div>
              <div>
                <p className="text-tiny text-default-500 mb-1">Cari atau tempel tautan</p>
                <Input placeholder="Cari tautan terbaru atau tempel tautan baru" value={pendingLink} onValueChange={setPendingLink} />
              </div>
              <div>
                <p className="text-tiny text-default-500 mb-1">Teks tampilan (opsional)</p>
                <Input placeholder="Teks untuk ditampilkan" value={pendingDisplay} onValueChange={setPendingDisplay} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="light" onPress={close}>Batal</Button>
                <Button color="primary" onPress={save}>Simpan</Button>
              </div>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}

