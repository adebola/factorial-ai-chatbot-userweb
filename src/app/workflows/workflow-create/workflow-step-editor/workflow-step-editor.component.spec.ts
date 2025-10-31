import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkflowStepEditorComponent } from './workflow-step-editor.component';

describe('WorkflowStepEditorComponent', () => {
  let component: WorkflowStepEditorComponent;
  let fixture: ComponentFixture<WorkflowStepEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowStepEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkflowStepEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
