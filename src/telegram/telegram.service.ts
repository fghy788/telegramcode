import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, BotError, Context } from 'grammy';
import { run, RunnerHandle } from '@grammyjs/runner';
import { NavigationHandler } from './handlers/navigation.handler';
import { FileCommandHandler } from './handlers/file-command.handler';
import { ProjectHandler } from './handlers/project.handler';
import { SystemHandler } from './handlers/system.handler';
import { MessageHandler } from './handlers/message.handler';
import { StateService } from '../claude-code/state.service';
import { TelegramFormat } from './telegram.format';
import { t, Lang } from '../common/i18n/messages';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Bot;
  private runner?: RunnerHandle;
  private allowedChatIds: string[];

  constructor(
    private configService: ConfigService,
    private stateService: StateService,
    private fmt: TelegramFormat,
    private navigationHandler: NavigationHandler,
    private fileCommandHandler: FileCommandHandler,
    private projectHandler: ProjectHandler,
    private systemHandler: SystemHandler,
    private messageHandler: MessageHandler,
  ) {
    const token = this.configService.get<string>('telegram.botToken') ?? '';
    this.bot = new Bot(token);
    this.allowedChatIds = this.configService.get<string[]>('telegram.allowedChatIds') ?? [];
  }

  onModuleInit() {
    this.registerHandlers();
    this.bot.catch((err: BotError) => {
      this.logger.error(`Bot error: ${err.message}`);
    });
    this.runner = run(this.bot);
    this.logger.log('Telegram bot started (polling, concurrent)');
  }

  onModuleDestroy() {
    void this.runner?.stop();
  }

  private isAllowed(ctx: Context): boolean {
    const chatId = String(ctx.chat?.id ?? '');
    return this.allowedChatIds.includes(chatId);
  }

  private registerHandlers() {
    // Auth middleware
    this.bot.use((ctx, next) => {
      if (!this.isAllowed(ctx)) return;
      return next();
    });

    // Navigation
    this.bot.command('ls', (ctx) => this.navigationHandler.handleLs(ctx));
    this.bot.command('cd', (ctx) => this.navigationHandler.handleCd(ctx));
    this.bot.command('pwd', (ctx) => this.navigationHandler.handlePwd(ctx));
    this.bot.command('tree', (ctx) => this.navigationHandler.handleTree(ctx));
    this.bot.command('home', (ctx) => this.navigationHandler.handleHome(ctx));

    // File management
    this.bot.command('file', (ctx) => this.fileCommandHandler.handleFile(ctx));
    this.bot.command('files', (ctx) => this.fileCommandHandler.handleFiles(ctx));
    this.bot.command('folder', (ctx) => this.fileCommandHandler.handleFolder(ctx));
    this.bot.command('copy', (ctx) => this.fileCommandHandler.handleCopy(ctx));
    this.bot.command('paste', (ctx) => this.fileCommandHandler.handlePaste(ctx));
    this.bot.command('rm', (ctx) => this.fileCommandHandler.handleRm(ctx));
    this.bot.command('code', (ctx) => this.fileCommandHandler.handleCode(ctx));

    // Project / Session
    this.bot.command('projects', (ctx) => this.projectHandler.handleProjects(ctx));
    this.bot.command('project', (ctx) => this.projectHandler.handleProject(ctx));
    this.bot.command('sessions', (ctx) => this.projectHandler.handleSessions(ctx));
    this.bot.command('new', (ctx) => this.projectHandler.handleNew(ctx));
    this.bot.command('leave', (ctx) => this.projectHandler.handleLeave(ctx));

    // System
    this.bot.command('start', (ctx) => this.systemHandler.handleHelp(ctx));
    this.bot.command('help', (ctx) => this.systemHandler.handleHelp(ctx));
    this.bot.command('status', (ctx) => this.systemHandler.handleStatus(ctx));
    this.bot.command('break', (ctx) => this.systemHandler.handleBreak(ctx));
    this.bot.command('lang', (ctx) => this.systemHandler.handleLang(ctx));

    // Callback queries (inline button clicks)
    this.bot.on('callback_query:data', (ctx) => this.handleCallbackQuery(ctx));

    // Unknown command filter
    this.bot.on('message:text', (ctx, next) => {
      const text = ctx.message?.text ?? '';
      if (text.startsWith('/')) {
        const cmd = text.split(/\s/)[0].replace('@', '/').split('/')[1];
        const known = [
          'ls',
          'cd',
          'pwd',
          'tree',
          'home',
          'file',
          'files',
          'folder',
          'copy',
          'paste',
          'rm',
          'code',
          'projects',
          'project',
          'sessions',
          'new',
          'leave',
          'start',
          'help',
          'status',
          'break',
          'lang',
        ];
        if (!known.includes(cmd)) {
          const cid = this.fmt.chatId(ctx);
          const m = t(this.stateService.getLang(cid));
          void ctx.reply(m.unknownCommand(cmd));
          return;
        }
      }
      return next();
    });

    // Plain text → Claude Code
    this.bot.on('message:text', (ctx) => this.messageHandler.handleTextMessage(ctx));
  }

  private async handleCallbackQuery(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data || data === 'noop') return;

    await ctx.answerCallbackQuery();

    if (data.startsWith('pj:')) {
      const index = parseInt(data.substring('pj:'.length), 10);
      await this.projectHandler.handleProjectCallback(ctx, index);
    } else if (data.startsWith('ss:')) {
      await this.projectHandler.handleSessionCallback(ctx, data.substring('ss:'.length));
    } else if (data === 'rm_yes') {
      await this.fileCommandHandler.handleRmConfirm(ctx);
    } else if (data === 'rm_no') {
      await this.fileCommandHandler.handleRmCancel(ctx);
    } else if (data.startsWith('cs:')) {
      const index = parseInt(data.substring('cs:'.length), 10);
      await this.fileCommandHandler.handleCodeSelect(ctx, index);
    } else if (data.startsWith('cp:')) {
      const page = parseInt(data.substring('cp:'.length), 10);
      await this.fileCommandHandler.handleCodePage(ctx, page);
    } else if (data.startsWith('lang:')) {
      const lang = data.substring('lang:'.length) as Lang;
      await this.systemHandler.handleLangCallback(ctx, lang);
    }
  }
}
