import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionInfo } from './interfaces/session.interface';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  async listSessions(projectPath: string): Promise<SessionInfo[]> {
    try {
      const projectHash = this.getProjectHash(projectPath);
      const projectDir = path.join(
        os.homedir(),
        '.claude',
        'projects',
        projectHash,
      );

      if (!fs.existsSync(projectDir)) return [];

      const files = fs
        .readdirSync(projectDir)
        .filter((f) => f.endsWith('.jsonl'));
      const sessions: SessionInfo[] = [];

      for (const file of files) {
        try {
          const filePath = path.join(projectDir, file);
          const stat = fs.statSync(filePath);
          const name =
            this.extractFirstUserMessage(filePath) ||
            file.replace('.jsonl', '');

          sessions.push({
            id: file.replace('.jsonl', ''),
            name: name.substring(0, 50),
            lastUsed: this.formatTimeAgo(stat.mtime),
            lastUsedTimestamp: stat.mtimeMs,
          });
        } catch {
          // Skip invalid session files
        }
      }

      sessions.sort((a, b) => b.lastUsedTimestamp - a.lastUsedTimestamp);
      return sessions.slice(0, 10);
    } catch (error: any) {
      this.logger.error(`Failed to list sessions: ${error.message}`);
      return [];
    }
  }

  getRecentMessages(
    projectPath: string,
    sessionId: string,
    count = 5,
  ): string[] {
    try {
      const projectHash = this.getProjectHash(projectPath);
      const filePath = path.join(
        os.homedir(),
        '.claude',
        'projects',
        projectHash,
        `${sessionId}.jsonl`,
      );

      if (!fs.existsSync(filePath)) return [];

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const messages: { role: string; text: string }[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'user' && entry.message?.content) {
            const text = this.extractText(entry.message.content);
            if (text) messages.push({ role: 'user', text });
          } else if (entry.type === 'assistant' && entry.message?.content) {
            const text = this.extractText(entry.message.content);
            if (text) messages.push({ role: 'assistant', text });
          }
        } catch {
          // skip invalid lines
        }
      }

      return messages.slice(-count).map((m) => {
        const icon = m.role === 'user' ? '👤' : '🤖';
        const preview =
          m.text.length > 200 ? m.text.substring(0, 200) + '...' : m.text;
        return `${icon} ${preview}`;
      });
    } catch {
      return [];
    }
  }

  private extractText(content: any): string | null {
    if (Array.isArray(content)) {
      const texts = content
        .filter((p: any) => p.type === 'text' && !p.text.startsWith('<'))
        .map((p: any) => p.text.trim())
        .filter(Boolean);
      return texts.length > 0 ? texts.join('\n') : null;
    }
    if (typeof content === 'string') return content;
    return null;
  }

  private extractFirstUserMessage(filePath: string): string | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const entry = JSON.parse(line);
        if (entry.type === 'user' && entry.message?.content) {
          const parts = entry.message.content;
          if (Array.isArray(parts)) {
            const textPart = parts.find(
              (p: any) => p.type === 'text' && !p.text.startsWith('<'),
            );
            if (textPart) return textPart.text.substring(0, 50);
          } else if (typeof parts === 'string') {
            return parts.substring(0, 50);
          }
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  private getProjectHash(projectPath: string): string {
    return projectPath.replace(/\//g, '-');
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    return `${diffDay}일 전`;
  }
}
