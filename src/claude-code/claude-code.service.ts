import { Injectable, Logger } from '@nestjs/common';
import { ChildProcess, spawn } from 'child_process';
import { StateService } from './state.service';
import { ClaudeResult } from './interfaces/session.interface';
import {
  StreamEvent,
  StreamProgress,
} from './interfaces/stream-event.interface';

@Injectable()
export class ClaudeCodeService {
  private readonly logger = new Logger(ClaudeCodeService.name);
  private runningProcesses = new Map<string, ChildProcess>();

  constructor(private stateService: StateService) {}

  async execute(
    chatId: string,
    message: string,
    onProgress?: (progress: StreamProgress) => void,
  ): Promise<ClaudeResult> {
    const state = this.stateService.getState(chatId);
    const args = this.buildArgs(state.sessionId, message);
    const cwd = state.cwd || state.projectPath || undefined;

    let sessionId: string | null = state.sessionId;
    let resultText = '';

    await this.runStreamCli(chatId, args, cwd, (event) => {
      if (event.type === 'assistant' && event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'tool_use' && block.name) {
            onProgress?.({
              type: 'tool_start',
              toolName: block.name,
              toolInput: block.input,
            });
          } else if (block.type === 'text' && block.text) {
            onProgress?.({ type: 'text', text: block.text });
          }
        }
        if (event.session_id) sessionId = event.session_id;
      }

      if (event.type === 'result') {
        resultText = event.result || '';
        if (event.session_id) sessionId = event.session_id;
        onProgress?.({
          type: 'result',
          sessionId: event.session_id,
          isError: event.is_error,
        });
      }
    });

    if (sessionId && sessionId !== state.sessionId) {
      this.stateService.setSession(chatId, sessionId);
    }

    return { output: resultText || '(출력 없음)', sessionId };
  }

  isRunning(chatId: string): boolean {
    return this.runningProcesses.has(chatId);
  }

  killProcess(chatId: string): boolean {
    const proc = this.runningProcesses.get(chatId);
    if (proc) {
      proc.kill('SIGTERM');
      this.runningProcesses.delete(chatId);
      return true;
    }
    return false;
  }

  private buildArgs(sessionId: string | null, message: string): string[] {
    const args: string[] = [];

    if (sessionId) {
      args.push('--resume', sessionId, '-p', message);
    } else {
      args.push('-p', message);
    }

    args.push('--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions');
    return args;
  }

  private runStreamCli(
    chatId: string,
    args: string[],
    cwd: string | undefined,
    onEvent: (event: StreamEvent) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.log(`spawn: claude ${args.join(' ')} (cwd: ${cwd})`);
      const proc = spawn('claude', args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      // stdin을 즉시 닫아야 함 - Claude CLI가 열린 stdin 파이프를 감지하면 행(hang)
      // https://github.com/anthropics/claude-code/issues/771
      proc.stdin.end();

      this.runningProcesses.set(chatId, proc);

      let buffer = '';
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        const raw = chunk.toString();
        buffer += raw;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as StreamEvent;
            this.logger.log(
              `[stream] type=${event.type}${event.type === 'assistant' ? ` blocks=${event.message?.content?.length}` : ''}${event.type === 'result' ? ` subtype=${event.subtype}` : ''}`,
            );
            onEvent(event);
          } catch {
            this.logger.warn(`Non-JSON line: ${line.substring(0, 200)}`);
          }
        }
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        const errChunk = chunk.toString().trim();
        if (errChunk) {
          this.logger.warn(`[stderr] ${errChunk.substring(0, 500)}`);
        }
        stderr += errChunk;
      });

      proc.on('close', (code) => {
        this.runningProcesses.delete(chatId);
        this.logger.log(`[process] exited with code ${code}`);

        if (buffer.trim()) {
          try {
            const event = JSON.parse(buffer) as StreamEvent;
            onEvent(event);
          } catch {
            // not JSON
          }
        }

        if (code !== 0 && stderr) {
          this.logger.error(`[process] error: ${stderr.substring(0, 500)}`);
          reject(new Error(stderr.substring(0, 500)));
          return;
        }
        resolve();
      });

      proc.on('error', (err) => {
        this.runningProcesses.delete(chatId);
        reject(err);
      });
    });
  }
}
