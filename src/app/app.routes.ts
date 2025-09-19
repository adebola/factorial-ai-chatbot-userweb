import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DocumentUploadComponent } from './document-upload/document-upload.component';
import { DocumentsComponent } from './documents/documents.component';
import { CategoriesComponent } from './categories/categories.component';
import { WebsiteIngestionComponent } from './website-ingestion/website-ingestion.component';
import { IngestionDetailsComponent } from './website-ingestion/ingestion-details/ingestion-details.component';
import { PlansComponent } from './plans/plans.component';
import { MessagesComponent } from './messages/messages.component';
import { SettingsComponent } from './settings/settings.component';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { CallbackComponent } from './auth/callback/callback.component';
import { MainLayoutComponent } from './shared/main-layout/main-layout.component';
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
      { path: 'messages', component: MessagesComponent },
      { path: 'plans', component: PlansComponent },
      { path: 'settings', component: SettingsComponent }
    ]
  },
  { path: '**', redirectTo: '/login' }
];
