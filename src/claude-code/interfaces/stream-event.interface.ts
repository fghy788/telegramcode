export interface StreamContentBlock {
  type: 'text' | 'tool_use';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, any>;
}

export interface StreamMessage {
  role: 'assistant' | 'user';
  content: StreamContentBlock[];
  stop_reason?: string;
}

export interface StreamAssistantEvent {
  type: 'assistant';
  message: StreamMessage;
  session_id: string;
}

export interface StreamUserEvent {
  type: 'user';
  message: StreamMessage;
  session_id: string;
}

export interface StreamResultEvent {
  type: 'result';
  subtype: 'success' | 'error';
  cost_usd?: number;
  duration_ms?: number;
  num_turns?: number;
  result: string;
  session_id: string;
  is_error: boolean;
}

export interface StreamSystemEvent {
  type: 'system';
  subtype: string;
  session_id?: string;
}

export type StreamEvent =
  | StreamAssistantEvent
  | StreamUserEvent
  | StreamResultEvent
  | StreamSystemEvent;

export interface StreamProgress {
  type: 'tool_start' | 'text' | 'result' | 'error';
  toolName?: string;
  toolInput?: Record<string, any>;
  text?: string;
  sessionId?: string;
  isError?: boolean;
}
