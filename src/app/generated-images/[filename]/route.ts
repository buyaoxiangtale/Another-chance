import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 支持的图片扩展名
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];
const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;

    // 安全检查：只允许字母、数字、点、下划线、横线
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return NextResponse.json(
        { error: '无效的文件名' },
        { status: 400 }
      );
    }

    // 检查文件扩展名
    const ext = path.extname(filename).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: '不支持的图片格式' },
        { status: 400 }
      );
    }

    // 构建文件路径
    const filePath = path.join(process.cwd(), 'public', 'generated-images', filename);

    // 读取文件
    const fileBuffer = await fs.readFile(filePath);

    // 设置正确的 Content-Type
    const contentType = MIME_TYPES[ext] || 'image/png';

    // 返回图片
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
      );
    }

    console.error('[generated-images] 读取图片失败:', error);
    return NextResponse.json(
      { error: '读取图片失败' },
      { status: 500 }
    );
  }
}
