// Trace data types for the trace viewer

export interface Trace {
  id: string;
  sessionKey: string;
  sessionId: string;
  runId: string;
  agentId?: string;
  channel?: string;
  provider?: string;
  model?: string;
  startTime: number;
  endTime?: number;
  spans: TraceSpan[];
  status: "active" | "completed" | "error";
  error?: string;
}

export interface TraceSpan {
  id: string;
  traceId: string;
  type:
    | "llm_input"
    | "llm_output"
    | "tool_call"
    | "tool_result"
    | "session_start"
    | "session_end"
    | "message";
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  metadata: Record<string, unknown>;
  children?: string[]; // child span IDs
  parentId?: string;
}

export interface LlmInputEvent {
  runId: string;
  sessionId: string;
  sessionKey: string;
  provider: string;
  model: string;
  systemPrompt?: string;
  prompt: string;
  historyMessages: unknown[];
  imagesCount: number;
}

export interface LlmOutputEvent {
  runId: string;
  sessionId: string;
  provider: string;
  model: string;
  assistantTexts: string[];
  lastAssistant?: unknown;
  usage?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
    total?: number;
  };
}

export interface ToolCallEvent {
  toolName: string;
  params: Record<string, unknown>;
  runId?: string;
  toolCallId?: string;
  result?: unknown;
  error?: string;
  durationMs?: number;
}

export interface SessionEvent {
  sessionId: string;
  sessionKey?: string;
  type: "start" | "end";
  messageCount?: number;
  durationMs?: number;
  resumedFrom?: string;
}

export interface TraceQuery {
  sessionKey?: string;
  sessionId?: string;
  agentId?: string;
  channel?: string;
  provider?: string;
  model?: string;
  status?: "active" | "completed" | "error";
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}
