import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { TelegramModule } from './telegram/telegram.module';
import { ClaudeCodeModule } from './claude-code/claude-code.module';
import { FileModule } from './file/file.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TelegramModule,
    ClaudeCodeModule,
    FileModule,
  ],
})
export class AppModule {}
