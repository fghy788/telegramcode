import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import * as path from 'path';
import { StateService } from '../../claude-code/state.service';
import { ClaudeCodeService } from '../../claude-code/claude-code.service';
import { TelegramFormat } from '../telegram.format';
import { t, Lang } from '../../common/i18n/messages';

@Injectable()
export class SystemHandler {
  constructor(
    private stateService: StateService,
    private claudeCodeService: ClaudeCodeService,
    private fmt: TelegramFormat,
  ) {}

  async handleHelp(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    await this.fmt.reply(
      ctx,
      [
        m.helpTitle,
        '',
        m.helpNav,
        m.helpLs,
        m.helpCd,
        m.helpPwd,
        m.helpTree,
        m.helpHome,
        '',
        m.helpFile,
        m.helpCode,
        m.helpFileDownload,
        m.helpFiles,
        m.helpFolder,
        m.helpCopy,
        m.helpPaste,
        m.helpRm,
        '',
        m.helpProject,
        m.helpProjects,
        m.helpProjectSet,
        m.helpSessions,
        m.helpNew,
        m.helpLeave,
        '',
        m.helpSystem,
        m.helpStatus,
        m.helpBreak,
        m.helpHelp,
        m.helpLang,
        '',
        m.helpFooter,
      ].join('\n'),
    );
  }

  async handleStatus(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const state = this.stateService.getState(cid);
    const projectName = state.projectPath
      ? path.basename(state.projectPath)
      : m.statusNone;
    const running = this.claudeCodeService.isRunning(cid)
      ? m.statusRunning
      : m.statusIdle;

    await this.fmt.reply(
      ctx,
      `${m.statusTitle}

📂 ${m.statusProject}: ${this.fmt.escapeHTML(projectName)}
📍 ${m.statusPath}: <code>${this.fmt.escapeHTML(state.projectPath || m.statusNotSet)}</code>
💬 ${m.statusSession}: <code>${this.fmt.escapeHTML(state.sessionId || m.statusAutoSession)}</code>
📁 ${m.statusCwd}: <code>${this.fmt.escapeHTML(state.cwd || state.projectPath || m.statusNotSet)}</code>
⚙️ ${m.statusState}: ${running}`,
    );
  }

  async handleBreak(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const killed = this.claudeCodeService.killProcess(cid);
    await this.fmt.reply(ctx, killed ? m.breakSuccess : m.breakNoTask);
  }

  async handleLang(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const keyboard = new InlineKeyboard()
      .text('🇰🇷 한국어', 'lang:ko')
      .text('🇺🇸 English', 'lang:en');
    await this.fmt.replyWithButtons(ctx, '🌐 Language / 언어', keyboard);
  }

  async handleLangCallback(ctx: Context, lang: Lang) {
    const cid = this.fmt.chatId(ctx);
    this.stateService.setLang(cid, lang);
    const m = t(lang);
    await this.fmt.reply(ctx, m.langSwitched);
  }
}
