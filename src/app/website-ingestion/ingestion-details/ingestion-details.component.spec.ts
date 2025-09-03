import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IngestionDetailsComponent } from './ingestion-details.component';

describe('IngestionDetailsComponent', () => {
  let component: IngestionDetailsComponent;
  let fixture: ComponentFixture<IngestionDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngestionDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IngestionDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
