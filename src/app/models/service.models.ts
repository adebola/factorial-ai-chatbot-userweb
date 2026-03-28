export interface TenantService {
  id: string;
  name: string;
  service_key: string;
  description: string | null;
  category: string;
  config: Record<string, any> | null;
}