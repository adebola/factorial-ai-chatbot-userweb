import { Injectable } from '@angular/core';
import {
  ChoiceOption,
  FALLBACK_TO_AI_SENTINEL,
  StepType,
  WorkflowDefinition,
  WorkflowStep
} from '../../../models/workflow.models';
import {
  DEFAULT_VIEWPORT,
  EdgeView,
  END_NODE_ID,
  GraphState,
  NodeView,
  Position,
  START_NODE_ID,
  edgeIdFor
} from '../models/graph.models';

@Injectable({ providedIn: 'root' })
export class WorkflowGraphMapperService {
  definitionToGraph(definition: WorkflowDefinition): GraphState {
    const nodes: NodeView[] = [];
    const edges: EdgeView[] = [];

    nodes.push({
      id: START_NODE_ID,
      kind: 'start',
      position: this.readPositionFromMetadata(definition.trigger?.metadata) ?? { x: 0, y: 0 },
      userPlaced: this.readUserPlacedFromMetadata(definition.trigger?.metadata),
      trigger: definition.trigger
    });

    nodes.push({
      id: END_NODE_ID,
      kind: 'end',
      position: this.readPositionFromMetadata(definition.settings?.['__end_metadata']) ?? { x: 0, y: 0 },
      userPlaced: this.readUserPlacedFromMetadata(definition.settings?.['__end_metadata'])
    });

    const steps = definition.steps ?? [];
    steps.forEach((step) => {
      nodes.push({
        id: step.id,
        kind: 'step',
        type: step.type,
        position: this.readPositionFromMetadata(step.metadata) ?? { x: 0, y: 0 },
        userPlaced: this.readUserPlacedFromMetadata(step.metadata),
        data: this.cloneStep(step)
      });
    });

    if (steps.length > 0) {
      const entry = steps[0];
      edges.push({
        id: edgeIdFor(START_NODE_ID, 'default'),
        source: START_NODE_ID,
        target: entry.id,
        portKind: 'default'
      });
    }

    steps.forEach((step) => {
      if (step.type === StepType.CHOICE && step.options) {
        step.options.forEach((option, index) => {
          const target = this.resolveTarget(option.next_step);
          if (target) {
            edges.push({
              id: edgeIdFor(step.id, 'option', index),
              source: step.id,
              target,
              portKind: 'option',
              optionIndex: index
            });
          }
        });
        return;
      }

      const target = this.resolveTarget(step.next_step);
      if (target) {
        edges.push({
          id: edgeIdFor(step.id, 'default'),
          source: step.id,
          target,
          portKind: 'default'
        });
      }
    });

    return {
      nodes,
      edges,
      selectedNodeId: null,
      viewport: { ...DEFAULT_VIEWPORT },
      dirty: false
    };
  }

  graphToDefinition(graph: GraphState, base: WorkflowDefinition): WorkflowDefinition {
    const stepNodes = graph.nodes.filter((n) => n.kind === 'step' && n.data);

    const startEdge = graph.edges.find((e) => e.source === START_NODE_ID);
    const entryId = startEdge?.target ?? stepNodes[0]?.id;

    const orderedNodes = entryId
      ? [
          ...stepNodes.filter((n) => n.id === entryId),
          ...stepNodes.filter((n) => n.id !== entryId)
        ]
      : stepNodes;

    const steps: WorkflowStep[] = orderedNodes.map((node) => {
      const step = this.cloneStep(node.data!);
      step.metadata = this.writePositionToMetadata(step.metadata, node.position, node.userPlaced);
      this.writeNextStepFromEdges(step, node.id, graph.edges);
      return step;
    });

    const trigger = base.trigger
      ? {
          ...base.trigger,
          metadata: this.writePositionToMetadata(
            base.trigger.metadata,
            graph.nodes.find((n) => n.id === START_NODE_ID)?.position ?? { x: 0, y: 0 },
            graph.nodes.find((n) => n.id === START_NODE_ID)?.userPlaced ?? false
          )
        }
      : base.trigger;

    return {
      ...base,
      trigger,
      steps
    };
  }

  private cloneStep(step: WorkflowStep): WorkflowStep {
    return JSON.parse(JSON.stringify(step));
  }

  private resolveTarget(nextStep: string | undefined | null): string | null {
    if (!nextStep) return null;
    if (nextStep === FALLBACK_TO_AI_SENTINEL) return END_NODE_ID;
    return nextStep;
  }

  private encodeNextStep(targetId: string | null | undefined): string {
    if (!targetId) return '';
    if (targetId === END_NODE_ID) return FALLBACK_TO_AI_SENTINEL;
    return targetId;
  }

  private writeNextStepFromEdges(step: WorkflowStep, nodeId: string, edges: EdgeView[]): void {
    if (step.type === StepType.CHOICE && step.options) {
      const optionEdges = edges.filter((e) => e.source === nodeId && e.portKind === 'option');
      const updatedOptions: ChoiceOption[] = step.options.map((option, index) => {
        const edge = optionEdges.find((e) => e.optionIndex === index);
        return {
          ...option,
          next_step: this.encodeNextStep(edge?.target)
        };
      });
      step.options = updatedOptions;
      step.next_step = '';
      return;
    }

    const defaultEdge = edges.find((e) => e.source === nodeId && e.portKind === 'default');
    step.next_step = this.encodeNextStep(defaultEdge?.target);
  }

  private readPositionFromMetadata(metadata: Record<string, any> | undefined): Position | null {
    const pos = metadata?.['position'];
    if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
      return { x: pos.x, y: pos.y };
    }
    return null;
  }

  private readUserPlacedFromMetadata(metadata: Record<string, any> | undefined): boolean {
    return !!metadata?.['position']?.userPlaced;
  }

  private writePositionToMetadata(
    metadata: Record<string, any> | undefined,
    position: Position,
    userPlaced: boolean
  ): Record<string, any> {
    const next = { ...(metadata ?? {}) };
    next['position'] = { x: position.x, y: position.y, userPlaced };
    return next;
  }
}
