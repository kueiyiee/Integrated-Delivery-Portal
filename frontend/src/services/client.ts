import { api } from '../api';
import type { AxiosResponse } from 'axios';

function formatApiErrorMessage(err: any, fallback: string): string {
  const response = err?.response;
  if (!response?.data) {
    return err?.message ?? fallback;
  }

  const payload = response.data;
  const serverMessage = typeof payload?.message === 'string'
    ? payload.message
    : payload?.error ?? fallback;

  if (payload?.errors && typeof payload.errors === 'object') {
    const details = Object.values(payload.errors)
      .flatMap((item: unknown) => (Array.isArray(item) ? item : [item]))
      .filter((item): item is string => typeof item === 'string')
      .join(' ');
    return details ? `${serverMessage} ${details}` : serverMessage;
  }

  return serverMessage;
}

async function handleApi<T>(promise: Promise<AxiosResponse<T>>): Promise<T> {
  try {
    const response = await promise;
    return response.data;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) {
      throw new Error('Your session has expired. Please sign in again.');
    }
    if (status === 403) {
      throw new Error("You don't have permission to access these documents.");
    }
    if (status === 404) {
      throw new Error('The requested document could not be found.');
    }
    if (status === 419) {
      throw new Error('Your secure session has expired. Please refresh and sign in again.');
    }
    if (status && status >= 500) {
      throw new Error('The document service is temporarily unavailable. Please try again shortly.');
    }
    const message = formatApiErrorMessage(err, 'Unable to complete the request. Please try again.');
    throw new Error(message);
  }
}

export type Delivery = {
  id: number;
  uuid: string;
  tracking_number: string;
  external_reference?: string | null;
  status: string;
  pickup_address?: { line1?: string | null; address?: string | null } | null;
  dropoff_address?: { line1?: string | null; address?: string | null } | null;
  package?: {
    type?: string | null;
    description?: string | null;
    quantity?: number | null;
    weight?: number | null;
    weight_unit?: 'kg' | 'g' | null;
    special_handling?: string | null;
  } | null;
  notes?: string | null;
  scheduled_at?: string | null;
  cancel_reason?: string | null;
  status_history?: Array<{ status: string; changed_at?: string | null }> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Customer = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  links?: unknown;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
    [key: string]: unknown;
  };
};

export type ClientDeliveryPayload = {
  external_reference?: string | null;
  pickup_address?: { line1?: string | null; address?: string | null } | null;
  dropoff_address?: { line1?: string | null; address?: string | null } | null;
  package?: {
    type?: string | null;
    description?: string | null;
    quantity?: number | null;
    weight?: number | null;
    weight_unit?: 'kg' | 'g' | null;
    special_handling?: string | null;
  } | null;
  notes?: string | null;
  scheduled_at?: string | null;
  status?: string;
};

export type Company = {
  id: number;
  name: string;
  business_email?: string | null;
  phone?: string | null;
  address?: string | null;
  about?: string | null;
  business_hours?: Record<string, string> | null;
  social_links?: Record<string, string> | null;
  primary_contact?: string | null;
  mfa_enabled?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ApiUsageStatistics = {
  total_requests: number;
  requests_last_24h: number;
  requests_last_30d: number;
  error_count: number;
  success_rate: number | null;
  health_window?: string;
  health_requests?: number;
  health_success_count?: number;
  health_error_count?: number;
  average_response_time_ms: number | null;
  last_activity: { endpoint: string; method: string; status_code: number; occurred_at: string } | null;
  requests_by_day: Array<{ date: string; total: number }>;
  keys: Array<{ id: number; name: string; public_key?: string | null; status?: string | null; last_used_at?: string | null; total_requests: number }>;
};

export type ApiRequestLogEntry = {
  id: number;
  request_id?: string | null;
  api_key_id?: number | null;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms?: number | null;
  ip_address?: string | null;
  created_at?: string | null;
};

export type CompanyUser = {
  id: number;
  name: string;
  email: string;
  role?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function fetchClientDeliveries(params: Record<string, unknown> = {}): Promise<PaginatedResponse<Delivery>> {
  return handleApi<PaginatedResponse<Delivery>>(api.get<PaginatedResponse<Delivery>>('/v1/client/deliveries', { params }));
}

export async function fetchClientDeliveryMonthlyStats(year = new Date().getFullYear()): Promise<Array<{ month: number; total: number }>> {
  const response = await handleApi<{ data: Array<{ month: number; total: number }> }>(api.get('/v1/client/deliveries/monthly-stats', { params: { year } }));
  return response.data;
}

export async function createClientDelivery(payload: ClientDeliveryPayload): Promise<Delivery> {
  const response = await handleApi<{ data: Delivery }>(api.post('/v1/client/deliveries', payload));
  return response.data;
}

export async function updateClientDelivery(deliveryId: number, payload: ClientDeliveryPayload): Promise<Delivery> {
  const response = await handleApi<{ data: Delivery }>(api.put(`/v1/client/deliveries/${deliveryId}`, payload));
  return response.data;
}

export async function cancelClientDelivery(deliveryId: number, payload: { cancel_reason?: string; notes?: string } = {}): Promise<Delivery> {
  const response = await handleApi<{ data: Delivery }>(api.post(`/v1/client/deliveries/${deliveryId}/cancel`, payload));
  return response.data;
}

export async function requestClientDeliveryPrintForm(deliveryId: number): Promise<{ delivery: Delivery; verification_token: string; verification_url: string }> {
  const response = await handleApi<{ data: { delivery: Delivery; verification_token: string; verification_url: string } }>(api.post(`/v1/client/deliveries/${deliveryId}/print-form`));
  return response.data;
}

export type ClientDocumentRecord = {
  id: number;
  report_id?: string | null;
  reference_number?: string | null;
  verification_id?: string | null;
  report_title?: string | null;
  report_category?: string | null;
  export_format?: string | null;
  generated_by?: number | string | null;
  generated_by_role?: string | null;
  company_id?: number | null;
  record_count?: number | null;
  file_path?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  expires_at?: string | null;
  is_expired?: boolean;
  created_at?: string | null;
  download_url?: string | null;
  source?: 'server' | 'uploaded' | 'generated';
  local_url?: string | null;
  local_file_name?: string | null;
};

export async function fetchClientDocuments(params: Record<string, unknown> = {}): Promise<PaginatedResponse<ClientDocumentRecord>> {
  const response = await handleApi<{ data: ClientDocumentRecord[] }>(api.get('/v1/client/documents', { params }));
  return { data: response.data ?? [] };
}

export async function downloadClientDocument(documentId: number): Promise<AxiosResponse<Blob>> {
  return api.get(`/v1/client/documents/${documentId}/download`, {
    responseType: 'blob',
    headers: {
      Accept: 'application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*',
    },
  });
}

export async function downloadClientDeliveryDocument(deliveryId: number, format: 'pdf' | 'docx'): Promise<AxiosResponse<Blob>> {
  return api.get(`/v1/client/deliveries/${deliveryId}/export`, {
    params: { format },
    responseType: 'blob',
    headers: {
      Accept: 'application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, */*',
    },
  });
}

export async function deleteClientDelivery(deliveryId: number): Promise<void> {
  await handleApi(api.delete(`/v1/client/deliveries/${deliveryId}`));
}

export async function fetchClientCustomers(params: Record<string, unknown> = {}): Promise<PaginatedResponse<Customer>> {
  const response = await handleApi<{ data: Customer[] | { data?: Customer[]; meta?: PaginatedResponse<Customer>['meta'] }; meta?: PaginatedResponse<Customer>['meta'] }>(api.get('/v1/client/customers', { params }));
  const payload = response.data;

  if (Array.isArray(payload)) {
    return { data: payload, meta: response.meta };
  }

  return { data: payload?.data ?? [], meta: payload?.meta ?? response.meta };
}

export async function fetchCompany(): Promise<Company> {
  const response = await handleApi<{ data: Company }>(api.get('/v1/client/company'));
  return response.data;
}

export async function updateCompany(payload: Partial<Company>): Promise<Company> {
  const response = await api.put<{ data: Company }>('/v1/client/company', payload);
  return response.data.data;
}

export async function updateCompanyPassword(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  const response = await api.put<{ message: string }>('/v1/client/company/password', payload);
  return response.data;
}

export async function fetchApiUsageStatistics(): Promise<ApiUsageStatistics> {
  const response = await api.get<{ data: ApiUsageStatistics }>('/v1/client/api-management/usage-statistics');
  return response.data.data;
}

export async function fetchApiRequestLogs(params: Record<string, unknown> = {}): Promise<PaginatedResponse<ApiRequestLogEntry>> {
  const response = await api.get<PaginatedResponse<ApiRequestLogEntry>>('/v1/client/api-management/request-logs', { params });
  return response.data;
}

export async function listCompanyUsers(params: Record<string, unknown> = {}): Promise<PaginatedResponse<CompanyUser>> {
  const response = await api.get<PaginatedResponse<CompanyUser>>('/v1/client/company/users', { params });
  return response.data;
}

export async function createCompanyUser(payload: { name: string; email: string; role?: string }): Promise<CompanyUser> {
  const response = await api.post<CompanyUser>('/v1/client/company/users', payload);
  return response.data;
}

export async function updateCompanyUser(userId: number, payload: Partial<CompanyUser>): Promise<CompanyUser> {
  const response = await api.put<CompanyUser>(`/v1/client/company/users/${userId}`, payload);
  return response.data;
}

export async function deleteCompanyUser(userId: number): Promise<void> {
  await api.delete(`/v1/client/company/users/${userId}`);
}

export async function suspendCompanyUser(userId: number): Promise<any> {
  const response = await api.post(`/v1/client/company/users/${userId}/suspend`);
  return response.data;
}

export async function activateCompanyUser(userId: number): Promise<any> {
  const response = await api.post(`/v1/client/company/users/${userId}/activate`);
  return response.data;
}

export async function resetCompanyUserPassword(userId: number): Promise<{ temporary_password?: string }> {
  const response = await api.post(`/v1/client/company/users/${userId}/reset-password`);
  return response.data;
}
