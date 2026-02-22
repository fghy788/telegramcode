import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'grammy';
import * as path from 'path';
import { StateService } from '../../claude-code/state.service';
import { ClaudeCodeService } from '../../claude-code/claude-code.service';
import { FileService } from '../../file/file.service';
import { TelegramFormat } from '../telegram.format';
import { t } from '../../common/i18n/messages';

@Injectable()
export class MessageHandler {
  private readonly logger = new Logger(MessageHandler.name);

  constructor(
    private stateService: StateService,
    private claudeCodeService: ClaudeCodeService,
    private fileService: FileService,
    private fmt: TelegramFormat,
  ) {}

  async handleTextMessage(ctx: Context) {
    const cid = this.fmt.chatId(ctx);
    const m = t(this.stateService.getLang(cid));
    const text = ctx.message?.text?.trim();
    if (!text) return;

    const state = this.stateService.getState(cid);
    if (!state.projectPath) {
      await this.fmt.reply(ctx, m.projectNotSet);
      return;
    }

    if (this.claudeCodeService.isRunning(cid)) {
      await this.fmt.reply(ctx, m.taskRunning);
      return;
    }

    const chatId = ctx.chat!.id;

    await ctx.reply(m.taskStarted);

    const typingInterval = setInterval(() => {
      void ctx.api.sendChatAction(chatId, 'typing');
    }, 5000);

    let lastProgressText = '';

    try {
      const snapshot = await this.fileService.takeSnapshot(state.projectPath);

      const result = await this.claudeCodeService.execute(
        cid,
        text,
        (progress) => {
          if (progress.type === 'tool_start' && progress.toolName) {
            const progressText = this.fmt.formatToolProgress(
              progress.toolName,
              progress.toolInput || {},
            );
            if (progressText !== lastProgressText) {
              lastProgressText = progressText;
              void ctx.api.sendMessage(chatId, progressText).catch(() => {});
            }
          } else if (progress.type === 'text') {
            if (lastProgressText !== m.generating) {
              lastProgressText = m.generating;
              void ctx.api
                .sendMessage(chatId, m.generating)
                .catch(() => {});
            }
          }
        },
      );

      const changes = await this.fileService.detectChanges(
        state.projectPath,
        snapshot,
      );
      this.stateService.setLastChangedFiles(cid, changes);

      let response = `${m.taskComplete}\n\n${result.output}`;
      if (changes.length > 0) {
        response += `\n\n${m.changedFiles}`;
        for (const change of changes) {
          const icon =
            change.type === 'created'
              ? '🆕'
              : change.type === 'modified'
                ? '✏️'
                : '🗑️';
          const label =
            change.type === 'created'
              ? m.changeCreated
              : change.type === 'modified'
                ? m.changeModified
                : m.changeDeleted;
          response += `\n ${icon} ${path.relative(state.projectPath!, change.path)} (${label})`;
        }
        response += `\n\n${m.filesDownload}`;
      }
      await this.fmt.replyPlain(ctx, response);
    } catch (error: any) {
      this.logger.error(`Claude Code error: ${error.message}`);
      await this.fmt.reply(ctx, m.errorOccurred(error.message));
    } finally {
      clearInterval(typingInterval);
    }
  }
}
