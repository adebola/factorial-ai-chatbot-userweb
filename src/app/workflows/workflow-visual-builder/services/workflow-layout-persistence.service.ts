import { Injectable } from '@angular/core';
import { GraphState, Position, Viewport } from '../models/graph.models';

interface PersistedLayout {
  positions: Record<string, Position & { userPlaced?: boolean }>;
  viewport: Viewport;
}

@Injectable({ providedIn: 'root' })
export class WorkflowLayoutPersistenceService {
  private storageKey(workflowId: string): string {
    return `wf:layout:${workflowId}`;
  }

  load(workflowId: string): PersistedLayout | null {
    try {
      const raw = localStorage.getItem(this.storageKey(workflowId));
      if (!raw) return null;
      return JSON.parse(raw) as PersistedLayout;
    } catch {
      return null;
    }
  }

  save(workflowId: string, graph: GraphState): void {
    const positions: Record<string, Position & { userPlaced?: boolean }> = {};
    graph.nodes.forEach((n) => {
      positions[n.id] = { x: n.position.x, y: n.position.y, userPlaced: n.userPlaced };
    });
    const payload: PersistedLayout = { positions, viewport: graph.viewport };
    try {
      localStorage.setItem(this.storageKey(workflowId), JSON.stringify(payload));
    } catch {
      // localStorage unavailable; layout will fall back to step.metadata.position
    }
  }

  applyTo(workflowId: string, graph: GraphState): GraphState {
    const stored = this.load(workflowId);
    if (!stored) return graph;
    const nodes = graph.nodes.map((n) => {
      const saved = stored.positions[n.id];
      if (!saved) return n;
      return {
        ...n,
        position: { x: saved.x, y: saved.y },
        userPlaced: saved.userPlaced ?? n.userPlaced
      };
    });
    return { ...graph, nodes, viewport: stored.viewport ?? graph.viewport };
  }
}
