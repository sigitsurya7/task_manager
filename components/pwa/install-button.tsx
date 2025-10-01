"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import { FiDownload } from "react-icons/fi";

declare global {
  interface WindowEventMap {
    beforeinstallprompt: any;
  }
}

export default function InstallButton() {
  const [deferred, setDeferred] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onBip = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);
    try {
      window.addEventListener('beforeinstallprompt', onBip as any);
      window.addEventListener('appinstalled', onInstalled);
    } catch {}
    return () => {
      try { window.removeEventListener('beforeinstallprompt', onBip as any); } catch {}
      try { window.removeEventListener('appinstalled', onInstalled); } catch {}
    };
  }, []);

  if (!visible || !deferred) return null;

  return (
    <Button
      startContent={<FiDownload />}
      className="fixed bottom-6 left-6 z-50 shadow-lg rounded-full"
      variant="flat"
      onPress={async () => {
        try { await deferred.prompt(); } catch {}
        setDeferred(null);
        setVisible(false);
      }}
    >
      Instal
    </Button>
  );
}

