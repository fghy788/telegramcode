import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard, InputFile } from 'grammy';

@Injectable()
export class TelegramFormat {
  chatId(ctx: Context): string {
    return String(ctx.chat!.id);
  }

  getArgs(ctx: Context): string {
    const text = ctx.message?.text ?? '';
    const match = text.match(/^\/\S+\s*(.*)/);
    return match ? match[1].trim() : '';
  }

  // ─────────────────────────────────────────────
  // 기본 응답 메서드 (HTML 모드 기본)
  // ─────────────────────────────────────────────

  async reply(ctx: Context, text: string) {
    const chunks = this.splitMessage(text);
    for (const chunk of chunks) {
      await ctx.reply(chunk, { parse_mode: 'HTML' });
    }
  }

  async replyPlain(ctx: Context, text: string) {
    const chunks = this.splitMessage(text);
    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  }

  async replyWithButtons(ctx: Context, text: string, keyboard: InlineKeyboard) {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  async sendDocument(ctx: Context, filePath: string, filename: string) {
    await ctx.replyWithDocument(new InputFile(filePath, filename));
  }

  async sendDocumentWithCaption(
    ctx: Context,
    filePath: string,
    filename: string,
    caption: string,
  ) {
    await ctx.replyWithDocument(new InputFile(filePath, filename), {
      caption,
      parse_mode: 'HTML',
    });
  }

  // ─────────────────────────────────────────────
  // HTML 전용 메서드
  // ─────────────────────────────────────────────

  async replyHTML(ctx: Context, html: string) {
    const chunks = this.splitMessage(html);
    for (const chunk of chunks) {
      await ctx.reply(chunk, { parse_mode: 'HTML' });
    }
  }

  async replyHTMLWithButtons(ctx: Context, html: string, keyboard: InlineKeyboard) {
    await ctx.reply(html, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  // ─────────────────────────────────────────────
  // 메시지 분할
  // ─────────────────────────────────────────────

  splitMessage(text: string, maxLength = 4096): string[] {
    if (text.length <= maxLength) return [text];
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }
      let splitIndex = remaining.lastIndexOf('\n', maxLength);
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        splitIndex = maxLength;
      }
      chunks.push(remaining.substring(0, splitIndex));
      remaining = remaining.substring(splitIndex);
    }
    return chunks;
  }

  // ─────────────────────────────────────────────
  // 이스케이프 유틸리티
  // ─────────────────────────────────────────────

  escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  escapeMarkdown(text: string): string {
    return text.replace(/([_*`\[\]()])/g, '\\$1');
  }

  // ─────────────────────────────────────────────
  // 포맷팅 빌더
  // ─────────────────────────────────────────────

  bold(text: string): string {
    return `<b>${this.escapeHTML(text)}</b>`;
  }

  italic(text: string): string {
    return `<i>${this.escapeHTML(text)}</i>`;
  }

  code(text: string): string {
    return `<code>${this.escapeHTML(text)}</code>`;
  }

  pre(text: string, lang = ''): string {
    const langAttr = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${langAttr}>${this.escapeHTML(text)}</code></pre>`;
  }

  link(text: string, url: string): string {
    return `<a href="${url}">${this.escapeHTML(text)}</a>`;
  }

  // ─────────────────────────────────────────────
  // 구조화된 메시지 포맷터
  // ─────────────────────────────────────────────

  /** 제목 + 본문 형태의 메시지 */
  formatTitle(icon: string, title: string): string {
    return `${icon} <b>${this.escapeHTML(title)}</b>`;
  }

  /** 섹션 구분선 */
  divider(): string {
    return '─────────────────────';
  }

  /** 키-값 쌍 포맷 */
  formatField(label: string, value: string, icon = ''): string {
    const prefix = icon ? `${icon} ` : '';
    return `${prefix}<b>${this.escapeHTML(label)}:</b> ${this.escapeHTML(value)}`;
  }

  /** 리스트 아이템 */
  listItem(text: string, icon = '•'): string {
    return `  ${icon} ${this.escapeHTML(text)}`;
  }

  /** 성공 메시지 */
  success(message: string): string {
    return `✅ ${this.escapeHTML(message)}`;
  }

  /** 에러 메시지 */
  error(message: string): string {
    return `❌ ${this.escapeHTML(message)}`;
  }

  /** 경고 메시지 */
  warning(message: string): string {
    return `⚠️ ${this.escapeHTML(message)}`;
  }

  /** 정보 메시지 */
  info(message: string): string {
    return `ℹ️ ${this.escapeHTML(message)}`;
  }

  /** 진행 중 메시지 */
  loading(message: string): string {
    return `⏳ ${this.escapeHTML(message)}`;
  }

  // ─────────────────────────────────────────────
  // 파일 관련 포맷터
  // ─────────────────────────────────────────────

  getLanguageFromExt(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      rb: 'ruby',
      sh: 'bash',
      yml: 'yaml',
      yaml: 'yaml',
      json: 'json',
      md: 'markdown',
      css: 'css',
      html: 'html',
      sql: 'sql',
    };
    return map[ext] || '';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  /** 파일 변경 목록 포맷 */
  formatFileChanges(
    changes: Array<{ path: string; type: 'created' | 'modified' | 'deleted' }>,
    projectPath: string,
  ): string {
    if (changes.length === 0) return '';

    const lines = ['\n📁 <b>변경된 파일</b>'];
    for (const change of changes) {
      const icon = change.type === 'created' ? '🆕' : change.type === 'modified' ? '✏️' : '🗑️';
      const relativePath = change.path.replace(projectPath, '').replace(/^\//, '');
      lines.push(`  ${icon} <code>${this.escapeHTML(relativePath)}</code>`);
    }
    return lines.join('\n');
  }

  /** 디렉토리 리스팅 포맷 */
  formatDirectoryListing(
    dirPath: string,
    items: Array<{ name: string; isDirectory: boolean; size: number }>,
  ): string {
    const lines = [`📂 <b>${this.escapeHTML(dirPath)}</b>\n`];

    for (const item of items) {
      if (item.isDirectory) {
        lines.push(`  📁 <code>${this.escapeHTML(item.name)}/</code>`);
      } else {
        lines.push(
          `  📄 <code>${this.escapeHTML(item.name)}</code> <i>${this.formatSize(item.size)}</i>`,
        );
      }
    }

    return lines.join('\n');
  }

  // ─────────────────────────────────────────────
  // Claude Code 관련 포맷터
  // ─────────────────────────────────────────────

  formatToolProgress(toolName: string, input: Record<string, any>): string {
    const toolIcons: Record<string, string> = {
      Read: '📖',
      Write: '📝',
      Edit: '✏️',
      Bash: '🔧',
      Glob: '🔍',
      Grep: '🔎',
      TodoWrite: '📋',
      WebFetch: '🌐',
      Task: '🤖',
    };

    const icon = toolIcons[toolName] || '⚙️';

    switch (toolName) {
      case 'Read':
        return `${icon} <code>${this.escapeHTML(this.shortenPath(input.file_path || ''))}</code>`;
      case 'Write':
        return `${icon} <code>${this.escapeHTML(this.shortenPath(input.file_path || ''))}</code>`;
      case 'Edit':
        return `${icon} <code>${this.escapeHTML(this.shortenPath(input.file_path || ''))}</code>`;
      case 'Bash':
        return `${icon} <code>${this.escapeHTML((input.command || '').substring(0, 60))}</code>`;
      case 'Glob':
        return `${icon} <code>${this.escapeHTML(input.pattern || '')}</code>`;
      case 'Grep':
        return `${icon} <code>${this.escapeHTML(input.pattern || '')}</code>`;
      case 'TodoWrite':
        return `${icon} 작업 목록 업데이트`;
      default:
        return `${icon} ${toolName}`;
    }
  }

  /** Claude 응답 출력 포맷 (코드블록 변환) */
  formatClaudeOutput(output: string): string {
    // 마크다운 코드블록을 HTML pre 태그로 변환
    let result = output;

    // ```lang\ncode\n``` → <pre><code class="language-lang">code</code></pre>
    result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      const langAttr = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${langAttr}>${this.escapeHTML(code.trim())}</code></pre>`;
    });

    // 인라인 코드 `code` → <code>code</code>
    result = result.replace(/`([^`]+)`/g, (_, code) => {
      return `<code>${this.escapeHTML(code)}</code>`;
    });

    // **bold** → <b>bold</b>
    result = result.replace(/\*\*([^*]+)\*\*/g, (_, text) => {
      return `<b>${text}</b>`;
    });

    // *italic* → <i>italic</i> (단, ** 제외)
    result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, text) => {
      return `<i>${text}</i>`;
    });

    return result;
  }

  // ─────────────────────────────────────────────
  // 유틸리티
  // ─────────────────────────────────────────────

  /** 긴 경로 축약 */
  shortenPath(filePath: string, maxLength = 40): string {
    if (filePath.length <= maxLength) return filePath;
    const parts = filePath.split('/');
    const filename = parts.pop() || '';
    if (filename.length >= maxLength - 3) {
      return '...' + filename.slice(-(maxLength - 3));
    }
    let result = filename;
    for (let i = parts.length - 1; i >= 0; i--) {
      const next = parts[i] + '/' + result;
      if (next.length + 3 > maxLength) break;
      result = next;
    }
    return '.../' + result;
  }

  /** 상태 카드 포맷 */
  formatStatusCard(fields: Array<{ icon: string; label: string; value: string }>): string {
    return fields.map((f) => `${f.icon} <b>${this.escapeHTML(f.label)}:</b> ${this.escapeHTML(f.value)}`).join('\n');
  }
}
