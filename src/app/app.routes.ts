import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DocumentUploadComponent } from './document-upload/document-upload.component';
import { DocumentsComponent } from './documents/documents.component';
import { CategoriesComponent } from './categories/categories.component';
import { WebsiteIngestionComponent } from './website-ingestion/website-ingestion.component';
import { IngestionDetailsComponent } from './website-ingestion/ingestion-details/ingestion-details.component';
import { PlansComponent } from './plans/plans.component';
import { MessagesComponent } from './messages/messages.component';
import { CommunicationsComponent } from './communications/communications.component';
import { SettingsComponent } from './settings/settings.component';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { CallbackComponent } from './auth/callback/callback.component';
import { MainLayoutComponent } from './shared/main-layout/main-layout.component';
import { WorkflowsListComponent } from './workflows/workflows-list/workflows-list.component';
import { WorkflowDetailsComponent } from './workflows/workflow-details/workflow-details.component';
import { WorkflowTemplatesComponent } from './workflows/workflow-templates/workflow-templates.component';
import { WorkflowExecutionsComponent } from './workflows/workflow-executions/workflow-executions.component';
import { WorkflowAnalyticsComponent } from './workflows/workflow-analytics/workflow-analytics.component';
import { WorkflowCreateComponent } from './workflows/workflow-create/workflow-create.component';
import { QualityDashboardComponent } from './quality/quality-dashboard/quality-dashboard.component';
import { KnowledgeGapsComponent } from './quality/knowledge-gaps/knowledge-gaps.component';
import { AlertRulesComponent } from './quality/alerts/alert-rules/alert-rules.component';
import { AlertHistoryComponent } from './quality/alerts/alert-history/alert-history.component';
import { SchedulerMonitorComponent } from './quality/scheduler/scheduler-monitor.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'callback', component: CallbackComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'documents', component: DocumentsComponent },
      { path: 'categories', component: CategoriesComponent },
      { path: 'upload', component: DocumentUploadComponent },
      { path: 'websites', component: WebsiteIngestionComponent },
      { path: 'websites/:id/details', component: IngestionDetailsComponent },
      { path: 'workflows', component: WorkflowsListComponent },
      { path: 'workflows/create', component: WorkflowCreateComponent },
      { path: 'workflows/templates', component: WorkflowTemplatesComponent },
      { path: 'workflows/executions', component: WorkflowExecutionsComponent },
      { path: 'workflows/analytics', component: WorkflowAnalyticsComponent },
      { path: 'workflows/:id/edit', component: WorkflowCreateComponent },
      { path: 'workflows/:id', component: WorkflowDetailsComponent },
      { path: 'messages', component: MessagesComponent },
      { path: 'communications', component: CommunicationsComponent },
      { path: 'plans', component: PlansComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'quality', redirectTo: 'quality/dashboard', pathMatch: 'full' },
      { path: 'quality/dashboard', component: QualityDashboardComponent },
      { path: 'quality/knowledge-gaps', component: KnowledgeGapsComponent },
      { path: 'quality/alerts', component: AlertRulesComponent },
      { path: 'quality/alert-history', component: AlertHistoryComponent },
      { path: 'quality/scheduler', component: SchedulerMonitorComponent }
    ]
  },
  { path: '**', redirectTo: '/login' }
];
