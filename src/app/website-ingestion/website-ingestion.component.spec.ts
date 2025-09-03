import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebsiteIngestionComponent } from './website-ingestion.component';

describe('WebsiteIngestionComponent', () => {
  let component: WebsiteIngestionComponent;
  let fixture: ComponentFixture<WebsiteIngestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebsiteIngestionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WebsiteIngestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
