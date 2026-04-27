import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { WorkflowService } from '../../services/workflow.service';
import {
  StepType,
  WorkflowDefinition,
  WorkflowResponse,
  WorkflowUpdateRequest
} from '../../models/workflow.models';
import { WorkflowGraphStore } from './services/workflow-graph.store';
import { WorkflowGraphMapperService } from './services/workflow-graph-mapper.service';
import { WorkflowLayoutService } from './services/workflow-layout.service';
import { WorkflowLayoutPersistenceService } from './services/workflow-layout-persistence.service';
import { WorkflowCanvasComponent } from './canvas/workflow-canvas.component';
import { NodePaletteComponent } from './palette/node-palette.component';
import { NodeInspectorComponent } from './inspector/node-inspector.component';
import { WorkflowToolbarComponent } from './toolbar/workflow-toolbar.component';
import { EdgeView, NodeView, PortRef, Position } from './models/graph.models';

let stepIdCounter = 0;

@Component({
  selector: 'app-workflow-visual-builder',
  standalone: true,
  imports: [
    CommonModule,
    WorkflowCanvasComponent,
    NodePaletteComponent,
    NodeInspectorComponent,
    WorkflowToolbarComponent
  ],
  providers: [WorkflowGraphStore],
  templateUrl: './workflow-visual-builder.component.html',
  styleUrl: './workflow-visual-builder.component.scss'
})
export class WorkflowVisualBuilderComponent implements OnInit, OnDestroy {
  @ViewChild(WorkflowCanvasComponent) canvas?: WorkflowCanvasComponent;

  workflow: WorkflowResponse | null = null;
  loading = true;
  saving = false;
  statusMessage = '';
  statusKind: 'info' | 'success' | 'error' = 'info';
  dirty = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private workflowService: WorkflowService,
    private store: WorkflowGraphStore,
    private mapper: WorkflowGraphMapperService,
    private layout: WorkflowLayoutService,
    private layoutPersistence: WorkflowLayoutPersistenceService
  ) {}

  ngOnInit(): void {
    this.store.state.pipe(takeUntil(this.destroy$)).subscribe((state) => {
      this.dirty = state.dirty;
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.statusMessage = 'No workflow id provided';
      this.statusKind = 'error';
      this.loading = false;
      return;
    }
    this.loadWorkflow(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadWorkflow(workflowId: string): void {
    this.loading = true;
    this.workflowService.getWorkflow(workflowId).subscribe({
      next: (response) => {
        this.workflow = response;
        let graph = this.mapper.definitionToGraph(response.definition);
        graph = this.layout.layout(graph);
        graph = this.layoutPersistence.applyTo(workflowId, graph);
        graph = { ...graph, dirty: false };
        this.store.setState(graph);
        this.loading = false;
        queueMicrotask(() => this.canvas?.fitToContent());
      },
      error: (err) => {
        console.error('Failed to load workflow', err);
        this.statusMessage = 'Failed to load workflow';
        this.statusKind = 'error';
        this.loading = false;
      }
    });
  }

  onNodeSelected(_nodeId: string | null): void {}

  onEdgeRequested(payload: { source: PortRef; target: PortRef }): void {
    this.store.addEdge(
      payload.source.nodeId,
      payload.target.nodeId,
      payload.source.kind,
      payload.source.optionIndex
    );
  }

  onEdgeDeleteRequested(edge: EdgeView): void {
    this.store.removeEdge(edge.id);
  }

  onPaletteDrop(payload: { stepType: StepType; position: Position }): void {
    const id = this.generateStepId();
    const node: NodeView = {
      id,
      kind: 'step',
      type: payload.stepType,
      position: payload.position,
      userPlaced: true,
      data: this.makeStubStep(id, payload.stepType)
    };
    this.store.addNode(node);
    this.store.selectNode(id);
  }

  onSave(): void {
    if (!this.workflow) return;
    const graph = this.store.snapshot;
    const baseDefinition: WorkflowDefinition = this.workflow.definition;
    const definition = this.mapper.graphToDefinition(graph, baseDefinition);

    const update: WorkflowUpdateRequest = {
      name: this.workflow.name,
      description: this.workflow.description,
      definition,
      trigger_type: this.workflow.trigger_type,
      trigger_config: this.workflow.trigger_config,
      requires_auth: this.workflow.requires_auth,
      status: this.workflow.status
    };

    this.saving = true;
    this.statusMessage = 'Saving…';
    this.statusKind = 'info';

    this.workflowService.updateWorkflow(this.workflow.id, update).subscribe({
      next: (response) => {
        this.workflow = response;
        this.layoutPersistence.save(response.id, this.store.snapshot);
        this.store.setDirty(false);
        this.saving = false;
        this.statusMessage = 'Saved';
        this.statusKind = 'success';
        setTimeout(() => {
          if (this.statusMessage === 'Saved') this.statusMessage = '';
        }, 1500);
      },
      error: (err) => {
        console.error('Failed to save workflow', err);
        this.saving = false;
        this.statusMessage = err?.error?.message || 'Failed to save workflow';
        this.statusKind = 'error';
      }
    });
  }

  onFit(): void {
    this.canvas?.fitToContent();
  }

  onAutoLayout(): void {
    const next = this.layout.layout(this.store.snapshot, { force: true });
    this.store.setState({ ...next, dirty: true });
    queueMicrotask(() => this.canvas?.fitToContent());
  }

  private generateStepId(): string {
    stepIdCounter += 1;
    return `step_${Date.now().toString(36)}_${stepIdCounter}`;
  }

  private makeStubStep(id: string, type: StepType) {
    const base = {
      id,
      type,
      name: this.defaultName(type),
      next_step: '',
      metadata: {}
    };

    switch (type) {
      case StepType.MESSAGE:
        return { ...base, content: 'New message' };
      case StepType.CHOICE:
        return {
          ...base,
          content: 'Pick an option',
          variable: 'choice',
          options: [
            { text: 'Option 1', value: 'option_1', next_step: '' },
            { text: 'Option 2', value: 'option_2', next_step: '' }
          ]
        };
      case StepType.INPUT:
        return { ...base, content: 'Please enter a value', variable: 'input_value' };
      case StepType.CONDITION:
        return { ...base, condition: 'variable == \'value\'' };
      case StepType.ACTION:
        return { ...base, action: 'log', params: { message: '', level: 'info' } };
      default:
        return base;
    }
  }

  private defaultName(type: StepType): string {
    return type.charAt(0).toUpperCase() + type.slice(1) + ' step';
  }
}
