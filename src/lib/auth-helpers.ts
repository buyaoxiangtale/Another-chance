import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { User } from "@/lib/prisma";
import type { NextRequest } from "next/server";

/**
 * Get user ID from request session.
 * In Next.js 13.4, auth() may not pick up cookies from route handler context,
 * so we fall back to internally fetching /api/auth/session with the cookie header.
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // Try auth() first (works in most Next.js versions)
  try {
    const session = await auth();
    if (session?.user?.id) return session.user.id;
  } catch {}

  // Fallback: fetch session endpoint with request cookies
  try {
    const baseUrl = request.nextUrl.origin;
    const cookieHeader = request.headers.get("cookie") || "";
    const res = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { cookie: cookieHeader },
    });
    const data = await res.json();
    if (data?.user?.id) return data.user.id;
  } catch {}

  return null;
}

export async function getCurrentUser(request: NextRequest): Promise<User | null> {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireAuth(request: NextRequest): Promise<User> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new AuthError("请先登录", 401);
  }
  return user;
}

export async function requireUserId(request: NextRequest): Promise<string> {
  const id = await getUserIdFromRequest(request);
  if (!id) {
    throw new AuthError("请先登录", 401);
  }
  return id;
}

/** For pages/components where request is not available */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.status = status;
  }
}
