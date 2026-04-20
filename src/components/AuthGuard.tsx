'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

/**
 * AuthGuard — wraps page content that requires authentication.
 * Shows loading spinner while session loads, login prompt if unauthenticated.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <p className="text-[var(--muted)]">加载中...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div className="text-center">
          <p className="text-[var(--muted)] mb-4">请先登录后再继续</p>
          <Link href="/login" className="text-[var(--gold)] hover:underline">前往登录 →</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
