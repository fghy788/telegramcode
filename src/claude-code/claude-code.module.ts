import { Module } from '@nestjs/common';
import { ClaudeCodeService } from './claude-code.service';
import { StateService } from './state.service';
import { SessionService } from './session.service';

@Module({
  providers: [ClaudeCodeService, StateService, SessionService],
  exports: [ClaudeCodeService, StateService, SessionService],
})
export class ClaudeCodeModule {}
