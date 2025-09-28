import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, TOKEN_NAME } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();
    if ((!email && !username) || !password) {
      return NextResponse.json({ message: "Missing credentials" }, { status: 400 });
    }
    const user = await prisma.user.findFirst({
      where: email ? { email } : { username },
    });
    if (!user) return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });

    const token = await createSession({ sub: user.id, email: user.email });
    const res = NextResponse.json({ id: user.id, email: user.email, username: user.username, name: user.name });
    res.cookies.set(TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
