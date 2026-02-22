import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileChange } from '../claude-code/interfaces/session.interface';

interface DirEntry {
  name: string;
  isDirectory: boolean;
  size: number;
}

interface FileSnapshot {
  [filePath: string]: number; // mtime timestamp
}

const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  '.next',
  '.claude',
  '.nuxt',
  '.output',
  'coverage',
  '.turbo',
  '__pycache__',
  '.venv',
]);

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  async listDirectory(dirPath: string): Promise<DirEntry[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result: DirEntry[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env') continue;

      const fullPath = path.join(dirPath, entry.name);
      let size = 0;
      if (!entry.isDirectory()) {
        const stat = await fs.stat(fullPath);
        size = stat.size;
      }

      result.push({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        size,
      });
    }

    // Directories first, then files
    result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }

  async isDirectory(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  async getTree(
    dirPath: string,
    maxEntries = 200,
    prefix = '',
    counter = { count: 0 },
  ): Promise<string> {
    if (counter.count >= maxEntries) return '';

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const filtered = entries.filter((e) => !e.name.startsWith('.') && !IGNORE_DIRS.has(e.name));

    filtered.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    let tree = '';
    for (let i = 0; i < filtered.length; i++) {
      if (counter.count >= maxEntries) {
        tree += `${prefix}... (${maxEntries}개 항목 제한)\n`;
        break;
      }

      const entry = filtered[i];
      const isLast = i === filtered.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';

      counter.count++;
      if (entry.isDirectory()) {
        tree += `${prefix}${connector}${entry.name}/\n`;
        tree += await this.getTree(
          path.join(dirPath, entry.name),
          maxEntries,
          prefix + childPrefix,
          counter,
        );
      } else {
        tree += `${prefix}${connector}${entry.name}\n`;
      }
    }

    return tree;
  }

  async findFilesByName(
    projectPath: string,
    query: string,
  ): Promise<string[]> {
    const results: string[] = [];
    await this.walkForSearch(projectPath, query.toLowerCase(), results);
    // Exact basename matches first, then substring matches
    results.sort((a, b) => {
      const aExact = path.basename(a).toLowerCase() === query.toLowerCase();
      const bExact = path.basename(b).toLowerCase() === query.toLowerCase();
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.localeCompare(b);
    });
    return results.slice(0, 10);
  }

  async readFileContent(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  private async walkForSearch(
    dirPath: string,
    query: string,
    results: string[],
  ): Promise<void> {
    if (results.length >= 10) return;
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await this.walkForSearch(fullPath, query, results);
        } else if (entry.name.toLowerCase().includes(query)) {
          results.push(fullPath);
        }
      }
    } catch {
      // ignore
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    await fs.mkdir(folderPath, { recursive: true });
  }

  async copyFile(src: string, dest: string): Promise<string> {
    let finalDest = dest;

    const destStat = await fs.stat(dest).catch(() => null);
    if (destStat?.isDirectory()) {
      finalDest = path.join(dest, path.basename(src));
    }

    await fs.copyFile(src, finalDest);
    return finalDest;
  }

  async remove(targetPath: string): Promise<void> {
    await fs.rm(targetPath, { recursive: true, force: true });
  }

  async takeSnapshot(projectPath: string): Promise<FileSnapshot> {
    const snapshot: FileSnapshot = {};
    await this.walkForSnapshot(projectPath, snapshot);
    return snapshot;
  }

  async detectChanges(projectPath: string, before: FileSnapshot): Promise<FileChange[]> {
    const after: FileSnapshot = {};
    await this.walkForSnapshot(projectPath, after);

    const changes: FileChange[] = [];

    // Created or modified
    for (const [filePath, mtime] of Object.entries(after)) {
      if (!(filePath in before)) {
        changes.push({ path: filePath, type: 'created' });
      } else if (before[filePath] !== mtime) {
        changes.push({ path: filePath, type: 'modified' });
      }
    }

    // Deleted
    for (const filePath of Object.keys(before)) {
      if (!(filePath in after)) {
        changes.push({ path: filePath, type: 'deleted' });
      }
    }

    return changes;
  }

  private async walkForSnapshot(dirPath: string, snapshot: FileSnapshot): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.walkForSnapshot(fullPath, snapshot);
        } else {
          const stat = await fs.stat(fullPath);
          snapshot[fullPath] = stat.mtimeMs;
        }
      }
    } catch {
      // Ignore unreadable directories
    }
  }
}
