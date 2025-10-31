import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkflowExecutionsComponent } from './workflow-executions.component';

describe('WorkflowExecutionsComponent', () => {
  let component: WorkflowExecutionsComponent;
  let fixture: ComponentFixture<WorkflowExecutionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowExecutionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkflowExecutionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
