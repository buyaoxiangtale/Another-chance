import { execFile } from 'child_process';
import { mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DEBOUNCE_MS = 30_000; // 写入后 30 秒触发备份
const MAX_BACKUPS = 50;     // 最多保留 50 个备份

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function runPgDump(): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `gushi_auto_${timestamp}.sql.gz`;
  const filepath = path.join(BACKUP_DIR, filename);

  // 从 DATABASE_URL 解析连接信息
  const dbUrl = process.env.DATABASE_URL || '';
  const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    console.warn('[auto-backup] 无法解析 DATABASE_URL，跳过备份');
    return Promise.resolve();
  }
  const [, user, password, host, port, db] = match;

  return new Promise((resolve) => {
    const env = { ...process.env, PGPASSWORD: password };

    // 检测容器名
    const containerCmd = 'docker';
    const containerArgs = ['ps', '--format', '{{.Names}}'];

    execFile(containerCmd, containerArgs, (err, stdout) => {
      let container = '';
      if (!err && stdout) {
        const containers = stdout.trim().split('\n');
        container = containers.find(c => c === 'gushi-postgres' || c === 'medical-postgres') || '';
      }

      if (container) {
        // 通过 docker exec 执行 pg_dump
        const dumpArgs = [
          'exec', container,
          'pg_dump', '-U', user, '-d', db, '--clean', '--if-exists',
        ];
        const gzipArgs = ['gzip'];

        const { spawn } = require('child_process');
        const dump = spawn('docker', dumpArgs, { env });
        const gzip = spawn('gzip');
        const writeStream = require('fs').createWriteStream(filepath);

        dump.stdout.pipe(gzip.stdin);
        gzip.stdout.pipe(writeStream);

        writeStream.on('finish', () => {
          const size = statSync(filepath).size;
          console.log(`[auto-backup] 备份完成: ${filename} (${(size / 1024).toFixed(0)}KB)`);
          cleanupOldBackups();
          resolve();
        });

        writeStream.on('error', (e: Error) => {
          console.warn('[auto-backup] 备份失败:', e.message);
          resolve();
        });
      } else {
        // 直接本地 pg_dump（开发环境或 Docker 内）
        const { spawn } = require('child_process');
        const dump = spawn('pg_dump', ['-U', user, '-h', host, '-p', port, '-d', db, '--clean', '--if-exists'], { env });
        const gzip = spawn('gzip');
        const writeStream = require('fs').createWriteStream(filepath);

        dump.stdout.pipe(gzip.stdin);
        gzip.stdout.pipe(writeStream);

        writeStream.on('finish', () => {
          const size = statSync(filepath).size;
          console.log(`[auto-backup] 备份完成: ${filename} (${(size / 1024).toFixed(0)}KB)`);
          cleanupOldBackups();
          resolve();
        });

        writeStream.on('error', (e: Error) => {
          console.warn('[auto-backup] 备份失败:', e.message);
          resolve();
        });
      }
    });
  });
}

function cleanupOldBackups() {
  try {
    ensureBackupDir();
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('gushi_auto_') && f.endsWith('.sql.gz'))
      .map(f => ({ name: f, time: statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    // 删除超出数量限制的旧备份
    for (let i = MAX_BACKUPS; i < files.length; i++) {
      unlinkSync(path.join(BACKUP_DIR, files[i].name));
    }
  } catch {
    // ignore
  }
}

/**
 * 数据写入后调用，触发防抖备份
 */
export function triggerBackup() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    try {
      await runPgDump();
    } catch (e) {
      console.warn('[auto-backup] 备份异常:', (e as Error).message);
    }
  }, DEBOUNCE_MS);
}
