import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UploadResponse {
  message: string;
  filename: string;
  chunks_created: number;
  tenant_id: string;
  tenant_name: string;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  uploadDocument(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadResponse>(`${this.baseUrl}/documents/upload`, formData);
  }
}
