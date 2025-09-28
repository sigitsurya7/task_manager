import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const TOKEN_NAME = "token";
const ALG = "HS256";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

// Returns signed JWT; caller sets cookie on NextResponse
export async function createSession(payload: { sub: string; email: string }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
  return token;
}

// Deprecated: Use NextResponse().cookies.set to clear cookie in the route
export function clearSession() {
  /* no-op */
}

export async function getAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { sub: string; email: string };
  } catch {
    return null;
  }
}
