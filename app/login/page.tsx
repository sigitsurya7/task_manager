"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Link } from "@heroui/link";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function LoginPage() {
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

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitAttempted(true);
    const eEmpty = email.trim() === "";
    const pEmpty = password.trim() === "";
    if (eEmpty) triggerShake("email");
    if (pEmpty) triggerShake("password");
    if (eEmpty || pEmpty) return;
    // TODO: handle real auth
    console.log("Sign in:", { email, password });
  };

  return (
    <div className="w-full grid place-items-center min-h-[70vh]">
      <form onSubmit={onSubmit} className="w-full max-w-sm">
        <Card shadow="none" className="w-full p-4">
          <CardHeader className="flex-col items-center gap-1 py-6">
            <h1 className="text-2xl font-semibold">Sign In</h1>
            <p className="text-small text-default-500">
              Enter your credentials to access your account
            </p>
          </CardHeader>
          <CardBody className="gap-4">
            <Input
              placeholder="Email Address"
              variant="bordered"
              type="email"
              value={email}
              onValueChange={setEmail}
              isInvalid={emailInvalid}
              errorMessage={emailInvalid ? "Email is required" : undefined}
              classNames={{ inputWrapper: shake.email ? "animate-shake" : undefined }}
            />

            <Input
              placeholder="Password"
              variant="bordered"
              type={showPassword ? "text" : "password"}
              value={password}
              onValueChange={setPassword}
              isInvalid={passwordInvalid}
              errorMessage={passwordInvalid ? "Password is required" : undefined}
              classNames={{ inputWrapper: shake.password ? "animate-shake" : undefined }}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-default-400 hover:text-default-600 outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
              Sign In
            </Button>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
