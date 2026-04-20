'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function NavHeader() {
  const { data: session, status } = useSession();

  return (
    <nav className="sticky top-0 z-20 backdrop-blur-sm border-b border-[var(--border)]" style={{ background: 'rgba(250,246,240,0.9)' }}>
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-[var(--ink)] tracking-widest hover:opacity-80 transition-opacity">
          古事
        </Link>
        <div className="flex items-center gap-4">
          {status === 'loading' ? (
            <span className="text-sm text-[var(--muted)]">...</span>
          ) : session?.user ? (
            <>
              <Link href="/create" className="text-sm text-[var(--gold)] hover:underline">
                创建故事
              </Link>
              <span className="text-sm text-[var(--muted)]">{session.user.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[var(--gold)] hover:underline">
                登录
              </Link>
              <Link href="/register" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
