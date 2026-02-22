import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import * as path from 'path';
import { StateService } from '../../claude-code/state.service';
import { FileService } from '../../file/file.service';
import { TelegramFormat } from '../telegram.format';
import { isWithinProject, expandTilde } from '../../common/utils/path.util';
import { t } from '../../common/i18n/messages';

@Injectable()
export class NavigationHandler {
  constructor(
    private stateService: StateService,
    private fileService: FileService,
    private fmt: TelegramFormat,
  ) {}

  async handleLs(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const args = this.fmt.getArgs(ctx);
    const state = this.stateService.getState(cid);
    const basePath = state.cwd || state.projectPath || '/';
    const targetPath = args ? path.resolve(basePath, expandTilde(args)) : basePath;

    if (state.projectPath && !isWithinProject(targetPath, state.projectPath)) {
      await this.fmt.reply(ctx, m.outsideProject);
      return;
    }

    try {
      const listing = await this.fileService.listDirectory(targetPath);
      let response = `📂 ${targetPath}\n`;
      for (const item of listing) {
        response += item.isDirectory
          ? `📁 ${item.name}/\n`
          : `📄 ${item.name} (${this.fmt.formatSize(item.size)})\n`;
      }
      await this.fmt.replyPlain(ctx, response);
    } catch (error: any) {
      await this.fmt.reply(ctx, `❌ ${this.fmt.escapeHTML(error.message)}`);
    }
  }

  async handleCd(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const args = this.fmt.getArgs(ctx);
    if (!args) {
      await this.fmt.reply(ctx, m.usageCd);
      return;
    }

    const state = this.stateService.getState(cid);
    const basePath = state.cwd || state.projectPath || '/';
    const targetPath = path.resolve(basePath, expandTilde(args));

    if (state.projectPath && !isWithinProject(targetPath, state.projectPath)) {
      await this.fmt.reply(ctx, m.outsideProjectCd);
      return;
    }

    try {
      if (!(await this.fileService.isDirectory(targetPath))) {
        await this.fmt.reply(ctx, m.dirNotFound(args));
        return;
      }
      this.stateService.setCwd(cid, targetPath);
      await this.fmt.reply(ctx, m.movedTo(targetPath));
    } catch (error: any) {
      await this.fmt.reply(ctx, `❌ ${this.fmt.escapeHTML(error.message)}`);
    }
  }

  async handlePwd(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const state = this.stateService.getState(cid);
    await this.fmt.reply(ctx, `📂 ${state.cwd || state.projectPath || m.statusNotSet}`);
  }

  async handleHome(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const state = this.stateService.getState(cid);
    if (!state.projectPath) {
      await this.fmt.reply(ctx, m.setProjectFirst);
      return;
    }
    this.stateService.setCwd(cid, state.projectPath);
    await this.fmt.reply(
      ctx,
      `${m.movedToRoot}: <code>${this.fmt.escapeHTML(state.projectPath)}</code>`,
    );
  }

  async handleTree(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const args = this.fmt.getArgs(ctx);
    const state = this.stateService.getState(cid);
    if (!state.projectPath) {
      await this.fmt.reply(ctx, m.setProjectFirst);
      return;
    }

    const basePath = state.cwd || state.projectPath;
    const targetPath = args ? path.resolve(basePath, expandTilde(args)) : basePath;

    if (!isWithinProject(targetPath, state.projectPath)) {
      await this.fmt.reply(ctx, m.outsideProject);
      return;
    }

    try {
      const tree = await this.fileService.getTree(targetPath);
      const dirName =
        path.relative(state.projectPath, targetPath) ||
        path.basename(state.projectPath);
      await this.fmt.replyPlain(ctx, `📂 ${dirName}\n${tree}`);
    } catch (error: any) {
      await this.fmt.reply(ctx, `❌ ${this.fmt.escapeHTML(error.message)}`);
    }
  }
}
