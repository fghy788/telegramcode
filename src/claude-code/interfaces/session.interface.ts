export interface UserState {
  projectPath: string | null;
  sessionId: string | null;
  cwd: string | null;
  clipboard: string | null;
  lang: 'ko' | 'en';
  lastUsed: string;
}

export interface SessionInfo {
  id: string;
  name: string;
  lastUsed: string;
  lastUsedTimestamp: number;
}

export interface FileChange {
  path: string;
  type: 'created' | 'modified' | 'deleted';
}

export interface ClaudeResult {
  output: string;
  sessionId: string | null;
}

export interface StateStore {
  [chatId: string]: UserState;
}
