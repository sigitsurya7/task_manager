"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { toast } from "react-hot-toast";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Link } from "@heroui/link";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [shake, setShake] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  const emailInvalid = submitAttempted && email.trim() === "";
  const passwordInvalid = submitAttempted && password.trim() === "";

  const triggerShake = (key: "email" | "password") => {
    setShake((s) => ({ ...s, [key]: true }));
    setTimeout(() => setShake((s) => ({ ...s, [key]: false })), 350);
  };

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitAttempted(true);
    const eEmpty = email.trim() === "";
    const pEmpty = password.trim() === "";
    if (eEmpty) triggerShake("email");
    if (pEmpty) triggerShake("password");
    if (eEmpty || pEmpty) return;
    const payload = email.includes("@") ? { email, password } : { username: email, password };
    await toast.promise(
      api.post("/api/auth/login", payload),
      {
        loading: "Signing in...",
        success: "Berhasil masuk",
        error: (e) => e?.response?.data?.message ?? "Login gagal",
      },
    );
    router.push("/admin/dashboard");
  };

  return (
    <div className="w-full grid place-items-center min-h-[70vh]">
      <form onSubmit={onSubmit} className="w-full max-w-sm">
        <Card shadow="none" className="w-full p-4">
          <CardHeader className="flex-col items-center gap-1 py-6">
            <h1 className="text-2xl font-semibold">Masuk</h1>
            <p className="text-small text-default-500">
              Masukkan kredensial Anda untuk mengakses akun
            </p>
          </CardHeader>
          <CardBody className="gap-4">
            <Input
              placeholder="Email atau Username"
              variant="bordered"
              type="text"
              value={email}
              onValueChange={setEmail}
              isInvalid={emailInvalid}
              errorMessage={emailInvalid ? "Email atau username wajib diisi" : undefined}
              classNames={{ inputWrapper: shake.email ? "animate-shake" : undefined }}
            />

            <Input
              placeholder="Kata sandi"
              variant="bordered"
              type={showPassword ? "text" : "password"}
              value={password}
              onValueChange={setPassword}
              isInvalid={passwordInvalid}
              errorMessage={passwordInvalid ? "Kata sandi wajib diisi" : undefined}
              classNames={{ inputWrapper: shake.password ? "animate-shake" : undefined }}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-default-400 hover:text-default-600 outline-none"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5" />
                  ) : (
                    <FiEye className="h-5 w-5" />
                  )}
                </button>
              }
            />

            <Button color="primary" type="submit" className="mt-1" fullWidth>
              Masuk
            </Button>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
