// Trace store with bounded buffer

import type { Trace, TraceSpan, TraceQuery } from "./types.js";

const MAX_TRACES = 1000;
const MAX_SPANS_PER_TRACE = 500;

class TraceStore {
  private traces: Map<string, Trace> = new Map();
  private activeTraces: Set<string> = new Set();
  private traceOrder: string[] = []; // for LRU eviction

  addTrace(trace: Trace): void {
    // Evict old traces if needed
    while (this.traces.size >= MAX_TRACES && this.traceOrder.length > 0) {
      const oldestId = this.traceOrder.shift();
      if (oldestId) {
        this.traces.delete(oldestId);
        this.activeTraces.delete(oldestId);
      }
    }

    this.traces.set(trace.id, trace);
    this.traceOrder.push(trace.id);
    if (trace.status === "active") {
      this.activeTraces.add(trace.id);
    }
  }

  updateTrace(traceId: string, updates: Partial<Trace>): void {
    const trace = this.traces.get(traceId);
    if (trace) {
      const updated = { ...trace, ...updates };
      this.traces.set(traceId, updated);
      if (updates.status === "completed" || updates.status === "error") {
        this.activeTraces.delete(traceId);
      }
    }
  }

  addSpan(traceId: string, span: TraceSpan): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    // Enforce span limit per trace
    if (trace.spans.length >= MAX_SPANS_PER_TRACE) {
      return;
    }

    const newSpan: TraceSpan = {
      ...span,
      id: span.id || `span-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };

    // If span has a parent, link them
    if (newSpan.parentId) {
      const parentSpan = trace.spans.find((s) => s.id === newSpan.parentId);
      if (parentSpan && !parentSpan.children?.includes(newSpan.id)) {
        parentSpan.children = [...(parentSpan.children || []), newSpan.id];
      }
    }

    this.traces.set(traceId, {
      ...trace,
      spans: [...trace.spans, newSpan],
    });
  }

  updateSpan(traceId: string, spanId: string, updates: Partial<TraceSpan>): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    const spans = trace.spans.map((s) => (s.id === spanId ? { ...s, ...updates } : s));

    this.traces.set(traceId, { ...trace, spans });
  }

  getTrace(traceId: string): Trace | undefined {
    return this.traces.get(traceId);
  }

  getTraceByRunId(runId: string): Trace | undefined {
    for (const trace of this.traces.values()) {
      if (trace.runId === runId) return trace;
    }
    return undefined;
  }

  queryTraces(q: TraceQuery): Trace[] {
    let results = Array.from(this.traces.values());

    if (q.sessionKey) {
      results = results.filter((t) => t.sessionKey === q.sessionKey);
    }
    if (q.sessionId) {
      results = results.filter((t) => t.sessionId === q.sessionId);
    }
    if (q.agentId) {
      results = results.filter((t) => t.agentId === q.agentId);
    }
    if (q.channel) {
      results = results.filter((t) => t.channel === q.channel);
    }
    if (q.provider) {
      results = results.filter((t) => t.provider === q.provider);
    }
    if (q.model) {
      results = results.filter((t) => t.model === q.model);
    }
    if (q.status) {
      results = results.filter((t) => t.status === q.status);
    }
    if (q.startTime) {
      results = results.filter((t) => t.startTime >= q.startTime!);
    }
    if (q.endTime) {
      results = results.filter((t) => (t.endTime || t.startTime) <= q.endTime!);
    }

    // Sort by startTime descending (newest first)
    results.sort((a, b) => b.startTime - a.startTime);

    // Apply pagination
    const offset = q.offset || 0;
    const limit = q.limit || 100;
    return results.slice(offset, offset + limit);
  }

  getStats(): { totalTraces: number; activeTraces: number; totalSpans: number } {
    let totalSpans = 0;
    for (const trace of this.traces.values()) {
      totalSpans += trace.spans.length;
    }
    return {
      totalTraces: this.traces.size,
      activeTraces: this.activeTraces.size,
      totalSpans,
    };
  }

  clear(): void {
    this.traces.clear();
    this.activeTraces.clear();
    this.traceOrder = [];
  }
}

// Singleton instance
export const traceStore = new TraceStore();
