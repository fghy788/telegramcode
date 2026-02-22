import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramFormat } from './telegram.format';
import { NavigationHandler } from './handlers/navigation.handler';
import { FileCommandHandler } from './handlers/file-command.handler';
import { ProjectHandler } from './handlers/project.handler';
import { SystemHandler } from './handlers/system.handler';
import { MessageHandler } from './handlers/message.handler';
import { ClaudeCodeModule } from '../claude-code/claude-code.module';
import { FileModule } from '../file/file.module';

@Module({
  imports: [ClaudeCodeModule, FileModule],
  providers: [
    TelegramService,
    TelegramFormat,
    NavigationHandler,
    FileCommandHandler,
    ProjectHandler,
    SystemHandler,
    MessageHandler,
  ],
})
export class TelegramModule {}
