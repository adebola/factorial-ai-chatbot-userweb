import { Injectable } from '@angular/core';
import { StepType } from '../../../models/workflow.models';
import {
  EdgeView,
  END_NODE_ID,
  GraphState,
  LAYER_SPACING_X,
  LAYER_SPACING_Y,
  NodeView,
  Position,
  START_NODE_ID
} from '../models/graph.models';

@Injectable({ providedIn: 'root' })
export class WorkflowLayoutService {
  layout(graph: GraphState, options: { force?: boolean } = {}): GraphState {
    const layers = this.computeLayers(graph.nodes, graph.edges);
    const positions = this.assignCoordinates(graph.nodes, layers);

    const nodes = graph.nodes.map((node) => {
      if (node.userPlaced && !options.force) {
        return node;
      }
      const position = positions.get(node.id);
      if (!position) return node;
      return { ...node, position };
    });

    return { ...graph, nodes };
  }

  private computeLayers(nodes: NodeView[], edges: EdgeView[]): Map<string, number> {
    const layer = new Map<string, number>();
    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, string[]>();

    nodes.forEach((n) => {
      incoming.set(n.id, []);
      outgoing.set(n.id, []);
    });
    edges.forEach((e) => {
      incoming.get(e.target)?.push(e.source);
      outgoing.get(e.source)?.push(e.target);
    });

    const queue: string[] = [];
    if (nodes.find((n) => n.id === START_NODE_ID)) {
      layer.set(START_NODE_ID, 0);
      queue.push(START_NODE_ID);
    }
    nodes.forEach((n) => {
      if (n.id !== START_NODE_ID && (incoming.get(n.id)?.length ?? 0) === 0) {
        layer.set(n.id, 0);
        queue.push(n.id);
      }
    });

    while (queue.length > 0) {
      const id = queue.shift()!;
      const current = layer.get(id) ?? 0;
      for (const next of outgoing.get(id) ?? []) {
        const candidate = current + 1;
        const existing = layer.get(next);
        if (existing === undefined || candidate > existing) {
          layer.set(next, candidate);
          queue.push(next);
        }
      }
    }

    nodes.forEach((n) => {
      if (!layer.has(n.id)) {
        layer.set(n.id, 0);
      }
    });

    if (nodes.find((n) => n.id === END_NODE_ID)) {
      const max = Math.max(...Array.from(layer.values()).filter((v) => Number.isFinite(v)), 0);
      layer.set(END_NODE_ID, max + 1);
    }

    return layer;
  }

  private assignCoordinates(
    nodes: NodeView[],
    layers: Map<string, number>
  ): Map<string, Position> {
    const byLayer = new Map<number, NodeView[]>();
    const order = new Map<string, number>();
    nodes.forEach((n, i) => order.set(n.id, i));

    nodes.forEach((n) => {
      const l = layers.get(n.id) ?? 0;
      if (!byLayer.has(l)) byLayer.set(l, []);
      byLayer.get(l)!.push(n);
    });

    byLayer.forEach((list) => {
      list.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    });

    const positions = new Map<string, Position>();
    byLayer.forEach((list, layerIndex) => {
      const totalHeight = list.reduce((sum, n) => sum + this.slotHeight(n), 0);
      let y = -totalHeight / 2;
      list.forEach((n) => {
        const slot = this.slotHeight(n);
        positions.set(n.id, {
          x: layerIndex * LAYER_SPACING_X,
          y: y + slot / 2
        });
        y += slot;
      });
    });

    return positions;
  }

  private slotHeight(node: NodeView): number {
    if (node.kind === 'step' && node.type === StepType.CHOICE) {
      const optionCount = node.data?.options?.length ?? 0;
      return Math.max(LAYER_SPACING_Y, LAYER_SPACING_Y + optionCount * 24);
    }
    return LAYER_SPACING_Y;
  }
}
