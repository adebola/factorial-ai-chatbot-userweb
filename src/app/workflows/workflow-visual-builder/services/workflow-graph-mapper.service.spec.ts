import { TestBed } from '@angular/core/testing';
import { WorkflowGraphMapperService } from './workflow-graph-mapper.service';
import {
  FALLBACK_TO_AI_SENTINEL,
  StepType,
  TriggerType,
  WorkflowDefinition
} from '../../../models/workflow.models';

describe('WorkflowGraphMapperService', () => {
  let service: WorkflowGraphMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkflowGraphMapperService);
  });

  function stripPositions(def: WorkflowDefinition): WorkflowDefinition {
    const clone: WorkflowDefinition = JSON.parse(JSON.stringify(def));
    if (clone.trigger?.metadata && 'position' in clone.trigger.metadata) {
      delete (clone.trigger.metadata as any)['position'];
    }
    clone.steps?.forEach((s) => {
      if (s.metadata && 'position' in s.metadata) {
        delete (s.metadata as any)['position'];
      }
    });
    return clone;
  }

  it('round-trips a message-only workflow that ends in fallback', () => {
    const definition: WorkflowDefinition = {
      name: 'Greeting',
      description: 'A simple greeting',
      trigger: {
        type: TriggerType.KEYWORD,
        keywords: ['hello'],
        metadata: {}
      },
      steps: [
        {
          id: 'greeting',
          type: StepType.MESSAGE,
          name: 'Welcome',
          content: 'Hi there',
          next_step: FALLBACK_TO_AI_SENTINEL,
          metadata: {}
        }
      ],
      variables: {},
      settings: {}
    };

    const graph = service.definitionToGraph(definition);
    const restored = service.graphToDefinition(graph, definition);

    expect(stripPositions(restored)).toEqual(stripPositions(definition));
  });

  it('round-trips a choice with three options and fan-out', () => {
    const definition: WorkflowDefinition = {
      name: 'Choice',
      trigger: { type: TriggerType.MESSAGE, metadata: {} },
      steps: [
        {
          id: 'ask',
          type: StepType.CHOICE,
          name: 'Ask',
          content: 'Pick one',
          variable: 'pick',
          options: [
            { text: 'A', value: 'a', next_step: 'do_a' },
            { text: 'B', value: 'b', next_step: 'do_b' },
            { text: 'C', value: 'c', next_step: FALLBACK_TO_AI_SENTINEL }
          ],
          next_step: '',
          metadata: {}
        },
        { id: 'do_a', type: StepType.MESSAGE, content: 'A!', next_step: '', metadata: {} },
        { id: 'do_b', type: StepType.MESSAGE, content: 'B!', next_step: '', metadata: {} }
      ],
      variables: {},
      settings: {}
    };

    const graph = service.definitionToGraph(definition);
    const restored = service.graphToDefinition(graph, definition);

    expect(stripPositions(restored)).toEqual(stripPositions(definition));
  });

  it('round-trips a workflow with action and condition steps', () => {
    const definition: WorkflowDefinition = {
      name: 'Mixed',
      trigger: { type: TriggerType.INTENT, intent_patterns: ['support'], metadata: {} },
      steps: [
        {
          id: 'check',
          type: StepType.CONDITION,
          condition: 'priority == \'high\'',
          next_step: 'log_high',
          metadata: {}
        },
        {
          id: 'log_high',
          type: StepType.ACTION,
          action: 'log',
          params: { message: 'high priority', level: 'info' },
          next_step: 'fallback',
          metadata: {}
        },
        {
          id: 'fallback',
          type: StepType.MESSAGE,
          content: 'A human will follow up.',
          next_step: FALLBACK_TO_AI_SENTINEL,
          metadata: {}
        }
      ],
      variables: {},
      settings: {}
    };

    const graph = service.definitionToGraph(definition);
    const restored = service.graphToDefinition(graph, definition);

    expect(stripPositions(restored)).toEqual(stripPositions(definition));
  });

  it('encodes start edge as steps[0] regardless of original ordering', () => {
    const definition: WorkflowDefinition = {
      name: 'Order',
      trigger: { type: TriggerType.MESSAGE, metadata: {} },
      steps: [
        { id: 's1', type: StepType.MESSAGE, content: 'first', next_step: 's2', metadata: {} },
        { id: 's2', type: StepType.MESSAGE, content: 'second', next_step: '', metadata: {} }
      ],
      variables: {},
      settings: {}
    };
    const graph = service.definitionToGraph(definition);
    const restored = service.graphToDefinition(graph, definition);
    expect(restored.steps[0].id).toBe('s1');
  });

  it('persists position into step.metadata.position', () => {
    const definition: WorkflowDefinition = {
      name: 'Pos',
      trigger: { type: TriggerType.MESSAGE, metadata: {} },
      steps: [
        { id: 's1', type: StepType.MESSAGE, content: 'x', next_step: '', metadata: {} }
      ],
      variables: {},
      settings: {}
    };
    let graph = service.definitionToGraph(definition);
    graph = {
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === 's1' ? { ...n, position: { x: 123, y: 456 }, userPlaced: true } : n
      )
    };
    const restored = service.graphToDefinition(graph, definition);
    expect(restored.steps[0].metadata?.['position']).toEqual({ x: 123, y: 456, userPlaced: true });
  });
});
