"use client";

import { Modal, ModalContent, ModalHeader } from "@heroui/modal";

export function AttachmentPreviewModal({
  open,
  onOpenChange,
  att,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  att: { id: string; name: string; url: string; type: string } | null;
}) {
  const isImage = att?.type?.startsWith("image/");
  const isPdf = att?.type === "application/pdf" || (att?.url || "").toLowerCase().endsWith(".pdf");
  return (
    <Modal isOpen={open} onOpenChange={onOpenChange} size="3xl">
      <ModalContent>
        {() => (
          <div className="p-4">
            <ModalHeader className="p-0 mb-3">{att?.name}</ModalHeader>
            {att ? (
              isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={att.url} alt={att.name} className="max-h-[75vh] w-full object-contain" />
              ) : isPdf ? (
                <iframe src={att.url} className="w-full h-[75vh]" title="Attachment preview" />
              ) : (
                <p className="text-sm text-default-500">
                  Preview tidak tersedia untuk tipe ini.{" "}
                  <a className="text-primary" href={att.url} target="_blank" rel="noreferrer">
                    Buka di tab baru
                  </a>
                  .
                </p>
              )
            ) : null}
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}

