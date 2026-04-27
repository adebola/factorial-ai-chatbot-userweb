import { StepType, WorkflowStep, WorkflowTrigger } from '../../../models/workflow.models';

export const START_NODE_ID = '__start';
export const END_NODE_ID = '__end';

export type NodeKind = 'start' | 'end' | 'step';

export interface Position {
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface NodeView {
  id: string;
  kind: NodeKind;
  type?: StepType;
  position: Position;
  userPlaced: boolean;
  data?: WorkflowStep;
  trigger?: WorkflowTrigger;
}

export type EdgePortKind = 'default' | 'option';

export interface EdgeView {
  id: string;
  source: string;
  target: string;
  portKind: EdgePortKind;
  optionIndex?: number;
}

export interface GraphState {
  nodes: NodeView[];
  edges: EdgeView[];
  selectedNodeId: string | null;
  viewport: Viewport;
  dirty: boolean;
}

export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 90;
export const LAYER_SPACING_X = 280;
export const LAYER_SPACING_Y = 140;

export interface PortRef {
  nodeId: string;
  kind: EdgePortKind;
  optionIndex?: number;
}

export function edgeIdFor(source: string, portKind: EdgePortKind, optionIndex?: number): string {
  return portKind === 'option'
    ? `${source}::option:${optionIndex}`
    : `${source}::default`;
}
