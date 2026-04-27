import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { WorkflowGraphStore } from '../services/workflow-graph.store';
import { WorkflowNodeComponent } from './workflow-node.component';
import { WorkflowEdgeComponent } from './workflow-edge.component';
import {
  EdgeView,
  NODE_HEIGHT,
  NODE_WIDTH,
  NodeView,
  PortRef,
  Position,
  START_NODE_ID,
  Viewport
} from '../models/graph.models';
import { StepType } from '../../../models/workflow.models';

const HEADER_HEIGHT = 50;
const OPTION_ROW_HEIGHT = 32;
const PORT_INPUT_OFFSET_Y = 36;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;

interface DraftLink {
  source: PortRef;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

@Component({
  selector: 'app-workflow-canvas',
  standalone: true,
  imports: [CommonModule, WorkflowNodeComponent, WorkflowEdgeComponent],
  templateUrl: './workflow-canvas.component.html',
  styleUrl: './workflow-canvas.component.scss'
})
export class WorkflowCanvasComponent implements AfterViewInit, OnDestroy {
  @Input() readOnly = false;

  @Output() nodeSelected = new EventEmitter<string | null>();
  @Output() edgeRequested = new EventEmitter<{ source: PortRef; target: PortRef }>();
  @Output() edgeDeleteRequested = new EventEmitter<EdgeView>();
  @Output() paletteDrop = new EventEmitter<{ stepType: StepType; position: Position }>();

  @ViewChild('canvasRoot', { static: true }) canvasRoot!: ElementRef<HTMLDivElement>;

  nodes: NodeView[] = [];
  edges: EdgeView[] = [];
  viewport: Viewport = { x: 0, y: 0, zoom: 1 };
  selectedNodeId: string | null = null;
  draftLink: DraftLink | null = null;

  private destroy$ = new Subject<void>();
  private panState: { startX: number; startY: number; viewportX: number; viewportY: number } | null = null;
  private nodeDrag: {
    nodeId: string;
    pointerStart: Position;
    nodeStart: Position;
  } | null = null;
  private boundMouseMove = (e: MouseEvent) => this.onWindowMouseMove(e);
  private boundMouseUp = (e: MouseEvent) => this.onWindowMouseUp(e);

  constructor(
    private store: WorkflowGraphStore,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngAfterViewInit(): void {
    this.store.state.pipe(takeUntil(this.destroy$)).subscribe((state) => {
      this.nodes = state.nodes;
      this.edges = state.edges;
      this.viewport = state.viewport;
      this.selectedNodeId = state.selectedNodeId;
      this.cdr.markForCheck();
    });

    this.zone.runOutsideAngular(() => {
      window.addEventListener('mousemove', this.boundMouseMove);
      window.addEventListener('mouseup', this.boundMouseUp);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mouseup', this.boundMouseUp);
  }

  trackNode = (_: number, n: NodeView) => n.id;
  trackEdge = (_: number, e: EdgeView) => e.id;

  worldTransform(): string {
    return `translate(${this.viewport.x}px, ${this.viewport.y}px) scale(${this.viewport.zoom})`;
  }

  outgoingDefault(nodeId: string): boolean {
    return this.edges.some((e) => e.source === nodeId && e.portKind === 'default');
  }

  outgoingOptions(nodeId: string): number[] {
    return this.edges
      .filter((e) => e.source === nodeId && e.portKind === 'option')
      .map((e) => e.optionIndex ?? -1)
      .filter((i) => i >= 0);
  }

  validationFor(node: NodeView) {
    return this.store.validationFor(node);
  }

  onCanvasMouseDown(event: MouseEvent): void {
    if (event.target !== this.canvasRoot.nativeElement && (event.target as HTMLElement).closest('.wf-node')) {
      return;
    }
    if (event.button !== 0 && event.button !== 1) return;
    this.panState = {
      startX: event.clientX,
      startY: event.clientY,
      viewportX: this.viewport.x,
      viewportY: this.viewport.y
    };
    event.preventDefault();
    this.store.selectNode(null);
    this.nodeSelected.emit(null);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = this.canvasRoot.nativeElement.getBoundingClientRect();
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;

    const direction = event.deltaY < 0 ? 1 : -1;
    const factor = 1 + direction * 0.1;
    const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.viewport.zoom * factor));
    if (nextZoom === this.viewport.zoom) return;

    const worldX = (cx - this.viewport.x) / this.viewport.zoom;
    const worldY = (cy - this.viewport.y) / this.viewport.zoom;
    const nextX = cx - worldX * nextZoom;
    const nextY = cy - worldY * nextZoom;

    this.zone.run(() => {
      this.store.setViewport({ x: nextX, y: nextY, zoom: nextZoom });
    });
  }

  onNodeMouseDown(event: MouseEvent, node: NodeView): void {
    if (this.readOnly) return;
    if (event.button !== 0) return;
    event.stopPropagation();
    this.nodeDrag = {
      nodeId: node.id,
      pointerStart: { x: event.clientX, y: event.clientY },
      nodeStart: { ...node.position }
    };
  }

  onNodeClick(node: NodeView): void {
    this.store.selectNode(node.id);
    this.nodeSelected.emit(node.id);
  }

  onPortMouseDown(payload: { event: MouseEvent; ref: PortRef }): void {
    if (this.readOnly) return;
    const port = this.outputPortPosition(payload.ref);
    if (!port) return;
    this.draftLink = {
      source: payload.ref,
      startX: port.x,
      startY: port.y,
      currentX: port.x,
      currentY: port.y
    };
    this.cdr.markForCheck();
  }

  onPortMouseUp(payload: { event: MouseEvent; ref: PortRef }): void {
    if (!this.draftLink) return;
    if (this.readOnly) {
      this.draftLink = null;
      return;
    }
    const target = payload.ref;
    if (target.nodeId === this.draftLink.source.nodeId) {
      this.draftLink = null;
      this.cdr.markForCheck();
      return;
    }
    if (target.nodeId === START_NODE_ID) {
      this.draftLink = null;
      this.cdr.markForCheck();
      return;
    }
    this.edgeRequested.emit({ source: this.draftLink.source, target });
    this.draftLink = null;
    this.cdr.markForCheck();
  }

  onEdgeClick(edge: EdgeView): void {
    if (this.readOnly) return;
    this.edgeDeleteRequested.emit(edge);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const data = event.dataTransfer?.getData('application/x-workflow-step-type');
    if (!data) return;
    const stepType = data as StepType;
    const rect = this.canvasRoot.nativeElement.getBoundingClientRect();
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;
    const worldX = (cx - this.viewport.x) / this.viewport.zoom - NODE_WIDTH / 2;
    const worldY = (cy - this.viewport.y) / this.viewport.zoom - NODE_HEIGHT / 2;
    this.paletteDrop.emit({ stepType, position: { x: worldX, y: worldY } });
  }

  fitToContent(): void {
    if (this.nodes.length === 0) return;
    const padding = 80;
    const minX = Math.min(...this.nodes.map((n) => n.position.x));
    const maxX = Math.max(...this.nodes.map((n) => n.position.x + NODE_WIDTH));
    const minY = Math.min(...this.nodes.map((n) => n.position.y));
    const maxY = Math.max(...this.nodes.map((n) => n.position.y + NODE_HEIGHT));
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;
    const rect = this.canvasRoot.nativeElement.getBoundingClientRect();
    const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min(rect.width / contentWidth, rect.height / contentHeight, 1)));
    const x = -minX * zoom + padding * zoom + (rect.width - (contentWidth) * zoom) / 2;
    const y = -minY * zoom + padding * zoom + (rect.height - (contentHeight) * zoom) / 2;
    this.store.setViewport({ x, y, zoom });
  }

  // Edge endpoints in world coordinates
  edgeStart(edge: EdgeView): Position {
    const ref: PortRef = {
      nodeId: edge.source,
      kind: edge.portKind,
      optionIndex: edge.optionIndex
    };
    return this.outputPortPosition(ref) ?? { x: 0, y: 0 };
  }

  edgeEnd(edge: EdgeView): Position {
    const node = this.nodes.find((n) => n.id === edge.target);
    if (!node) return { x: 0, y: 0 };
    return { x: node.position.x, y: node.position.y + PORT_INPUT_OFFSET_Y };
  }

  private outputPortPosition(ref: PortRef): Position | null {
    const node = this.nodes.find((n) => n.id === ref.nodeId);
    if (!node) return null;
    if (ref.kind === 'option' && ref.optionIndex !== undefined) {
      const optionsCount = node.data?.options?.length ?? 0;
      if (ref.optionIndex >= optionsCount) return null;
      return {
        x: node.position.x + NODE_WIDTH,
        y: node.position.y + HEADER_HEIGHT + (ref.optionIndex + 0.5) * OPTION_ROW_HEIGHT
      };
    }
    return {
      x: node.position.x + NODE_WIDTH,
      y: node.position.y + PORT_INPUT_OFFSET_Y
    };
  }

  private screenToWorld(screen: Position): Position {
    return {
      x: (screen.x - this.viewport.x) / this.viewport.zoom,
      y: (screen.y - this.viewport.y) / this.viewport.zoom
    };
  }

  private onWindowMouseMove(event: MouseEvent): void {
    if (this.panState) {
      const dx = event.clientX - this.panState.startX;
      const dy = event.clientY - this.panState.startY;
      this.zone.run(() => {
        this.store.setViewport({
          x: this.panState!.viewportX + dx,
          y: this.panState!.viewportY + dy,
          zoom: this.viewport.zoom
        });
      });
      return;
    }
    if (this.nodeDrag) {
      const dx = (event.clientX - this.nodeDrag.pointerStart.x) / this.viewport.zoom;
      const dy = (event.clientY - this.nodeDrag.pointerStart.y) / this.viewport.zoom;
      this.zone.run(() => {
        this.store.moveNode(this.nodeDrag!.nodeId, {
          x: this.nodeDrag!.nodeStart.x + dx,
          y: this.nodeDrag!.nodeStart.y + dy
        });
      });
      return;
    }
    if (this.draftLink) {
      const rect = this.canvasRoot.nativeElement.getBoundingClientRect();
      const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const world = this.screenToWorld(screen);
      this.draftLink = { ...this.draftLink, currentX: world.x, currentY: world.y };
      this.zone.run(() => this.cdr.markForCheck());
    }
  }

  private onWindowMouseUp(_event: MouseEvent): void {
    this.panState = null;
    this.nodeDrag = null;
    if (this.draftLink) {
      this.zone.run(() => {
        this.draftLink = null;
        this.cdr.markForCheck();
      });
    }
  }
}
