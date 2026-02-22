import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import * as path from 'path';
import * as fs from 'fs';
import { StateService } from '../../claude-code/state.service';
import { FileService } from '../../file/file.service';
import { TelegramFormat } from '../telegram.format';
import { isWithinProject, resolveSecurePath } from '../../common/utils/path.util';
import { t } from '../../common/i18n/messages';

const LINES_PER_PAGE = 40;

@Injectable()
export class FileCommandHandler {
  private codeViewState = new Map<string, { filePath: string; totalLines: number }>();
  private codeSearchResults = new Map<string, string[]>();
  private rmTargets = new Map<string, string>();

  constructor(
    private stateService: StateService,
    private fileService: FileService,
    private fmt: TelegramFormat,
  ) {}

  async handleFile(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const args = this.fmt.getArgs(ctx);
    if (!args) {
      await this.fmt.reply(ctx, m.usageFile);
      return;
    }

    const state = this.stateService.getState(cid);
    const basePath = state.cwd || state.projectPath;
    if (!basePath || !state.projectPath) {
      await this.fmt.reply(ctx, m.setProjectFirst);
      return;
    }

    const filePath = resolveSecurePath(basePath, args, state.projectPath);
    if (!filePath) {
      await this.fmt.reply(ctx, m.outsideProject);
      return;
    }

    try {
      await this.fmt.sendDocument(ctx, filePath, path.basename(filePath));
    } catch (error: any) {
      await this.fmt.reply(ctx, m.fileSendFailed(error.message));
    }
  }

  async handleFiles(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const changedFiles = this.stateService.getLastChangedFiles(cid);
    if (!changedFiles || changedFiles.length === 0) {
      await this.fmt.reply(ctx, m.noChangedFiles);
      return;
    }

    for (const change of changedFiles) {
      if (change.type !== 'deleted' && fs.existsSync(change.path)) {
        try {
          const icon = change.type === 'created' ? '🆕' : '✏️';
          const caption = `${icon} ${path.basename(change.path)}`;
          await this.fmt.sendDocumentWithCaption(ctx, change.path, path.basename(change.path), caption);
        } catch {
          await this.fmt.reply(ctx, m.sendFailed(path.basename(change.path)));
        }
      }
    }
  }

  async handleFolder(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const args = this.fmt.getArgs(ctx);
    if (!args) {
      await this.fmt.reply(ctx, m.usageFolder);
      return;
    }

    const state = this.stateService.getState(cid);
    const basePath = state.cwd || state.projectPath;
    if (!basePath || !state.projectPath) {
      await this.fmt.reply(ctx, m.setProjectFirst);
      return;
    }

    const folderPath = resolveSecurePath(basePath, args, state.projectPath);
    if (!folderPath) {
      await this.fmt.reply(ctx, m.outsideProjectCreate);
      return;
    }

    try {
      await this.fileService.createFolder(folderPath);
      await this.fmt.reply(ctx, m.folderCreated(args));
    } catch (error: any) {
      await this.fmt.reply(ctx, `❌ ${error.message}`);
    }
  }

  async handleCopy(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const args = this.fmt.getArgs(ctx);
    if (!args) {
      await this.fmt.reply(ctx, m.usageCopy);
      return;
    }

    const state = this.stateService.getState(cid);
    const basePath = state.cwd || state.projectPath;
    if (!basePath || !state.projectPath) {
      await this.fmt.reply(ctx, m.setProjectFirst);
      return;
    }

    const filePath = resolveSecurePath(basePath, args, state.projectPath);
    if (!filePath) {
      await this.fmt.reply(ctx, m.outsideProjectCopy);
      return;
    }

    this.stateService.setClipboard(cid, filePath);
    await this.fmt.reply(ctx, m.copied(filePath));
  }

  async handlePaste(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const args = this.fmt.getArgs(ctx);
    if (!args) {
      await this.fmt.reply(ctx, m.usagePaste);
      return;
    }

    const state = this.stateService.getState(cid);
    if (!state.clipboard) {
      await this.fmt.reply(ctx, m.clipboardEmpty);
      return;
    }

    const basePath = state.cwd || state.projectPath!;
    const destPath = resolveSecurePath(basePath, args, state.projectPath!);
    if (!destPath) {
      await this.fmt.reply(ctx, m.outsideProjectPaste);
      return;
    }

    try {
      const result = await this.fileService.copyFile(state.clipboard, destPath);
      await this.fmt.reply(ctx, m.pasteComplete(path.basename(state.clipboard), result));
    } catch (error: any) {
      await this.fmt.reply(ctx, `❌ ${error.message}`);
    }
  }

  async handleRm(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const args = this.fmt.getArgs(ctx);
    if (!args) {
      await this.fmt.reply(ctx, m.usageRm);
      return;
    }

    const state = this.stateService.getState(cid);
    const basePath = state.cwd || state.projectPath;
    if (!basePath || !state.projectPath) {
      await this.fmt.reply(ctx, m.setProjectFirst);
      return;
    }

    const targetPath = resolveSecurePath(basePath, args, state.projectPath);
    if (!targetPath) {
      await this.fmt.reply(ctx, m.outsideProjectDelete);
      return;
    }

    this.rmTargets.set(cid, targetPath);
    const keyboard = new InlineKeyboard().text(m.deleteBtn, 'rm_yes').text(m.cancelBtn, 'rm_no');
    await this.fmt.replyWithButtons(ctx, `${m.deleteConfirm}\n${targetPath}`, keyboard);
  }

  async handleRmConfirm(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const targetPath = this.rmTargets.get(cid);
    if (!targetPath) {
      await this.fmt.reply(ctx, m.deleteExpired);
      return;
    }
    this.rmTargets.delete(cid);

    try {
      await this.fileService.remove(targetPath);
      await this.fmt.reply(ctx, m.deleteComplete(path.basename(targetPath)));
    } catch (error: any) {
      await this.fmt.reply(ctx, m.deleteFailed(error.message));
    }
  }

  async handleRmCancel(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    this.rmTargets.delete(cid);
    await this.fmt.reply(ctx, m.cancelled);
  }

  // --- /code ---

  async handleCode(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const args = this.fmt.getArgs(ctx);
    if (!args) {
      await this.fmt.reply(ctx, m.usageCode);
      return;
    }

    const state = this.stateService.getState(cid);
    if (!state.projectPath) {
      await this.fmt.reply(ctx, m.setProjectFirst);
      return;
    }

    const basePath = state.cwd || state.projectPath;
    const directPath = path.resolve(basePath, args);
    if (
      isWithinProject(directPath, state.projectPath) &&
      fs.existsSync(directPath) &&
      fs.statSync(directPath).isFile()
    ) {
      await this.sendCodePage(ctx, cid, directPath, state.projectPath, 0);
      return;
    }

    const matches = await this.fileService.findFilesByName(state.projectPath, args);
    if (matches.length === 0) {
      await this.fmt.reply(ctx, m.fileNotFound(args));
      return;
    }

    if (matches.length === 1) {
      await this.sendCodePage(ctx, cid, matches[0], state.projectPath, 0);
      return;
    }

    this.codeSearchResults.set(cid, matches);
    const keyboard = new InlineKeyboard();
    for (let i = 0; i < matches.length; i++) {
      const rel = path.relative(state.projectPath, matches[i]);
      keyboard.text(rel, `cs:${i}`).row();
    }
    await this.fmt.replyWithButtons(ctx, m.searchResults(args, matches.length), keyboard);
  }

  async handleCodeSelect(ctx: Context, index: number) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const results = this.codeSearchResults.get(cid);
    if (!results || index >= results.length) {
      await this.fmt.reply(ctx, m.codeExpired);
      return;
    }
    const state = this.stateService.getState(cid);
    if (!state.projectPath) return;
    await this.sendCodePage(ctx, cid, results[index], state.projectPath, 0);
  }

  async handleCodePage(ctx: Context, page: number) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const viewState = this.codeViewState.get(cid);
    if (!viewState) {
      await this.fmt.reply(ctx, m.codeExpired);
      return;
    }
    const state = this.stateService.getState(cid);
    if (!state.projectPath) return;

    try {
      const msgId = ctx.callbackQuery?.message?.message_id;
      if (msgId) await ctx.api.deleteMessage(ctx.chat!.id, msgId);
    } catch {
      // ignore
    }

    await this.sendCodePage(ctx, cid, viewState.filePath, state.projectPath, page);
  }

  private async sendCodePage(
    ctx: Context,
    chatId: string,
    filePath: string,
    projectPath: string,
    page: number,
  ) {
    const m = t(this.stateService.getLang(chatId));
    try {
      const content = await this.fileService.readFileContent(filePath);
      const allLines = content.split('\n');
      const totalLines = allLines.length;
      const totalPages = Math.ceil(totalLines / LINES_PER_PAGE);
      const safePage = Math.max(0, Math.min(page, totalPages - 1));

      this.codeViewState.set(chatId, { filePath, totalLines });

      const startLine = safePage * LINES_PER_PAGE;
      const endLine = Math.min(startLine + LINES_PER_PAGE, totalLines);
      const pageLines = allLines.slice(startLine, endLine);

      const relPath = path.relative(projectPath, filePath);
      const lang = this.fmt.getLanguageFromExt(path.basename(filePath));

      const maxLineNum = endLine;
      const padWidth = String(maxLineNum).length;
      const numbered = pageLines.map((line, i) => {
        const num = String(startLine + i + 1).padStart(padWidth, ' ');
        return `${num}│ ${line}`;
      });

      const escapedCode = this.fmt.escapeHTML(numbered.join('\n'));
      const header = `📄 <b>${this.fmt.escapeHTML(relPath)}</b>  (${startLine + 1}-${endLine} / ${totalLines}${m.linesLabel})`;
      const codeBlock = `<pre><code class="language-${lang}">${escapedCode}</code></pre>`;
      const message = `${header}\n${codeBlock}`;

      if (totalPages <= 1) {
        await this.fmt.replyHTML(ctx, message);
        return;
      }

      const keyboard = new InlineKeyboard();
      if (safePage > 0) {
        keyboard.text(m.prevPage, `cp:${safePage - 1}`);
      }
      keyboard.text(`${safePage + 1} / ${totalPages}`, 'noop');
      if (safePage < totalPages - 1) {
        keyboard.text(m.nextPage, `cp:${safePage + 1}`);
      }

      await this.fmt.replyHTMLWithButtons(ctx, message, keyboard);
    } catch (error: any) {
      await this.fmt.reply(ctx, m.fileReadFailed(error.message));
    }
  }
}
