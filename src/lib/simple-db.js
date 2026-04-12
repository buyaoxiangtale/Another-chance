const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// 简单的 JSON 文件存储
class SimpleStore {
  constructor(filename) {
    this.filename = filename;
    this.dataPath = path.join(DATA_DIR, filename);
  }

  async load() {
    await ensureDataDir();
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async save(data) {
    await ensureDataDir();
    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
  }
}

const storiesStore = new SimpleStore('stories.json');
const segmentsStore = new SimpleStore('segments.json');
const branchesStore = new SimpleStore('branches.json');

module.exports = {
  storiesStore,
  segmentsStore,
  branchesStore
};