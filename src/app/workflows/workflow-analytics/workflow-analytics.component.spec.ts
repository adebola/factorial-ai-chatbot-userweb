import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkflowAnalyticsComponent } from './workflow-analytics.component';

describe('WorkflowAnalyticsComponent', () => {
  let component: WorkflowAnalyticsComponent;
  let fixture: ComponentFixture<WorkflowAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowAnalyticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkflowAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
