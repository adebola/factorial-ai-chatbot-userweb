import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, distinctUntilChanged } from 'rxjs';
import { StepType, WorkflowStep } from '../../../models/workflow.models';
import {
  DEFAULT_VIEWPORT,
  EdgePortKind,
  EdgeView,
  GraphState,
  NodeView,
  Position,
  Viewport,
  edgeIdFor
} from '../models/graph.models';

const EMPTY_STATE: GraphState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  viewport: { ...DEFAULT_VIEWPORT },
  dirty: false
};

@Injectable()
export class WorkflowGraphStore {
  private readonly state$ = new BehaviorSubject<GraphState>(EMPTY_STATE);

  get snapshot(): GraphState {
    return this.state$.value;
  }

  get state(): Observable<GraphState> {
    return this.state$.asObservable();
  }

  selectNodes(): Observable<NodeView[]> {
    return this.state$.pipe(map((s) => s.nodes), distinctUntilChanged());
  }

  selectEdges(): Observable<EdgeView[]> {
    return this.state$.pipe(map((s) => s.edges), distinctUntilChanged());
  }

  selectViewport(): Observable<Viewport> {
    return this.state$.pipe(map((s) => s.viewport), distinctUntilChanged());
  }

  selectSelected(): Observable<NodeView | null> {
    return this.state$.pipe(
      map((s) => (s.selectedNodeId ? s.nodes.find((n) => n.id === s.selectedNodeId) ?? null : null)),
      distinctUntilChanged()
    );
  }

  setState(next: GraphState): void {
    this.state$.next(next);
  }

  setDirty(dirty: boolean): void {
    this.state$.next({ ...this.snapshot, dirty });
  }

  setViewport(viewport: Viewport): void {
    this.state$.next({ ...this.snapshot, viewport });
  }

  selectNode(nodeId: string | null): void {
    this.state$.next({ ...this.snapshot, selectedNodeId: nodeId });
  }

  moveNode(nodeId: string, position: Position): void {
    const nodes = this.snapshot.nodes.map((n) =>
      n.id === nodeId ? { ...n, position, userPlaced: true } : n
    );
    this.state$.next({ ...this.snapshot, nodes, dirty: true });
  }

  updateStepData(nodeId: string, patch: Partial<WorkflowStep>): void {
    const nodes = this.snapshot.nodes.map((n) => {
      if (n.id !== nodeId || n.kind !== 'step' || !n.data) return n;
      const merged: WorkflowStep = { ...n.data, ...patch };
      return { ...n, data: merged, type: merged.type ?? n.type };
    });
    this.state$.next({ ...this.snapshot, nodes, dirty: true });
  }

  replaceStepData(nodeId: string, data: WorkflowStep): void {
    const nodes = this.snapshot.nodes.map((n) =>
      n.id === nodeId && n.kind === 'step' ? { ...n, data, type: data.type } : n
    );
    this.state$.next({ ...this.snapshot, nodes, dirty: true });
  }

  addNode(node: NodeView): void {
    this.state$.next({
      ...this.snapshot,
      nodes: [...this.snapshot.nodes, node],
      dirty: true
    });
  }

  removeNode(nodeId: string): { affectedSources: string[] } {
    const edges = this.snapshot.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    const affectedSources = Array.from(
      new Set(this.snapshot.edges.filter((e) => e.target === nodeId).map((e) => e.source))
    );
    const nodes = this.snapshot.nodes.filter((n) => n.id !== nodeId);
    this.state$.next({
      ...this.snapshot,
      nodes,
      edges,
      selectedNodeId: this.snapshot.selectedNodeId === nodeId ? null : this.snapshot.selectedNodeId,
      dirty: true
    });
    return { affectedSources };
  }

  addEdge(source: string, target: string, portKind: EdgePortKind, optionIndex?: number): void {
    const id = edgeIdFor(source, portKind, optionIndex);
    const edges = this.snapshot.edges.filter((e) => e.id !== id);
    edges.push({ id, source, target, portKind, optionIndex });
    this.state$.next({ ...this.snapshot, edges, dirty: true });
  }

  removeEdge(edgeId: string): void {
    const edges = this.snapshot.edges.filter((e) => e.id !== edgeId);
    this.state$.next({ ...this.snapshot, edges, dirty: true });
  }

  hasOutgoingDefault(sourceId: string): boolean {
    return this.snapshot.edges.some((e) => e.source === sourceId && e.portKind === 'default');
  }

  validationFor(node: NodeView): { severity: 'error' | 'warning' | 'ok'; message?: string } {
    if (node.kind !== 'step' || !node.data) return { severity: 'ok' };
    const step = node.data;
    if (step.type === StepType.CHOICE) {
      const total = step.options?.length ?? 0;
      const connected = this.snapshot.edges.filter(
        (e) => e.source === node.id && e.portKind === 'option'
      ).length;
      if (total === 0) return { severity: 'error', message: 'Choice has no options' };
      if (connected === 0) return { severity: 'warning', message: 'No option is wired up' };
      return { severity: 'ok' };
    }
    const hasOutgoing = this.snapshot.edges.some(
      (e) => e.source === node.id && e.portKind === 'default'
    );
    if (!hasOutgoing) return { severity: 'warning', message: 'Step has no next step' };
    return { severity: 'ok' };
  }
}
