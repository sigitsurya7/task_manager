"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { ThemeSwitch } from "@/components/theme-switch";
import { toast } from "react-hot-toast";

export default function AccountSettingsPage() {
  const [id, setId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (data.user) {
          setId(data.user.id);
          setUsername(data.user.username || "");
          setEmail(data.user.email || "");
          setName(data.user.name || "");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSave = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, name, password: password || undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Account updated");
      setPassword("");
    } catch (e: any) {
      toast.error("Failed to update account");
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Account Settings</h1>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input label="Username" value={username} onValueChange={setUsername} isDisabled={loading} />
          <Input label="Email" value={email} onValueChange={setEmail} isDisabled={loading} />
          <Input label="Name" value={name} onValueChange={setName} isDisabled={loading} />
          <Input label="Password" type="password" value={password} onValueChange={setPassword} description="Leave blank to keep current password" isDisabled={loading} />
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <span className="text-sm">Theme</span>
              <ThemeSwitch />
            </div>
            <Button color="primary" onPress={onSave} isDisabled={loading}>Save</Button>
          </div>
          <div className="pt-2">
            <Button color="danger" variant="flat" onPress={async ()=>{ try{ await fetch('/api/auth/logout', { method:'POST', credentials:'include' }); } finally { window.location.href='/login'; } }}>Logout</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
