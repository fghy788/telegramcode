import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import * as path from 'path';
import { StateService } from '../../claude-code/state.service';
import { SessionService } from '../../claude-code/session.service';
import { FileService } from '../../file/file.service';
import { TelegramFormat } from '../telegram.format';
import { t } from '../../common/i18n/messages';
import { expandTilde } from '../../common/utils/path.util';

@Injectable()
export class ProjectHandler {
  constructor(
    private stateService: StateService,
    private sessionService: SessionService,
    private fileService: FileService,
    private fmt: TelegramFormat,
  ) {}

  async handleProjects(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const projects = this.stateService.getProjects();
    if (projects.length === 0) {
      await this.fmt.reply(ctx, m.noProjects);
      return;
    }

    const keyboard = new InlineKeyboard();
    for (let i = 0; i < projects.length; i++) {
      keyboard.text(path.basename(projects[i]), `pj:${i}`).row();
    }
    await this.fmt.replyWithButtons(ctx, m.selectProject, keyboard);
  }

  async handleProject(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const args = this.fmt.getArgs(ctx);
    const state = this.stateService.getState(cid);

    if (!args) {
      const cwd = state.cwd;
      if (!cwd) {
        await this.fmt.reply(ctx, m.cdFirstThenProject);
        return;
      }
      this.stateService.switchProject(cid, cwd);
      this.stateService.registerProject(cwd);
      await this.fmt.reply(ctx, m.projectSetFromCwd(path.basename(cwd), cwd));
      return;
    }

    const projects = this.stateService.getProjects();
    const match = projects.find((p) => path.basename(p) === args);
    if (match) {
      this.stateService.switchProject(cid, match);
      await this.fmt.reply(ctx, m.projectSet(args, match));
      return;
    }

    const projectPath = path.resolve(expandTilde(args));
    if (!(await this.fileService.isDirectory(projectPath))) {
      await this.fmt.reply(ctx, m.projectNotFound(args));
      return;
    }

    this.stateService.switchProject(cid, projectPath);
    this.stateService.registerProject(projectPath);
    await this.fmt.reply(ctx, m.projectSet(path.basename(projectPath), projectPath));
  }

  async handleProjectCallback(ctx: Context, index: number) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const projects = this.stateService.getProjects();
    if (index >= projects.length) {
      await this.fmt.reply(ctx, m.projectListChanged);
      return;
    }
    const projectPath = projects[index];
    this.stateService.switchProject(cid, projectPath);
    await this.fmt.reply(ctx, m.projectSwitched(path.basename(projectPath), projectPath));
  }

  async handleSessions(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const state = this.stateService.getState(cid);
    if (!state.projectPath) {
      await this.fmt.reply(ctx, m.setProjectFirst);
      return;
    }

    const sessions = await this.sessionService.listSessions(state.projectPath);
    if (sessions.length === 0) {
      await this.fmt.reply(ctx, m.noSessions);
      return;
    }

    const keyboard = new InlineKeyboard();
    for (let i = 0; i < sessions.length; i++) {
      const label = `${sessions[i].name} — ${sessions[i].lastUsed}`;
      keyboard.text(label, `ss:${sessions[i].id}`).row();
    }
    await this.fmt.replyWithButtons(ctx, `${m.selectSession} (${path.basename(state.projectPath)})`, keyboard);
  }

  async handleSessionCallback(ctx: Context, sessionId: string) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    this.stateService.setSession(cid, sessionId);
    const state = this.stateService.getState(cid);
    const recent = this.sessionService.getRecentMessages(state.projectPath!, sessionId, 5);

    let msg = m.sessionConnected;
    if (recent.length > 0) {
      msg += `\n\n${m.recentChat}\n\n` + recent.join('\n\n');
    }
    await this.fmt.replyPlain(ctx, msg);
  }

  async handleLeave(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    this.stateService.clearProject(cid);
    await this.fmt.reply(ctx, m.projectLeft);
  }

  async handleNew(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    this.stateService.clearSession(cid);
    await this.fmt.reply(ctx, m.newSessionStarted);
  }
}
