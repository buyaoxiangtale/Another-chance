import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 简单的健康检查
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: 'Service unavailable',
    }, { status: 503 });
  }
}
