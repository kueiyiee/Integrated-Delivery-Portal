import { api } from '../api';
import type { AxiosResponse } from 'axios';
import { z } from 'zod';

export class ApiError extends Error {
  status: number | null;
  code?: string | number;
  validationErrors?: Record<string, unknown> | null;
  responseData?: any;

  constructor(message: string, status: number | null = null, opts: Partial<ApiError> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = opts.code;
    this.validationErrors = opts.validationErrors ?? null;
    this.responseData = opts.responseData;
  }
}

export type LoginPayload = {
  email: string;
  password: string;
  remember?: boolean;
};

export type RegisterPayload = {
  company_name: string;
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role?: string;
};

export type CreateWebhookPayload = {
  name: string;
  description?: string;
  target_url: string;
  http_method?: string;
  retry_count?: number;
  timeout_seconds?: number;
  events: string[];
};

export type CreateDriverPayload = {
  name: string;
  email?: string;
  phone?: string;
  vehicle_type: string;
  vehicle_number?: string;
  license_number: string;
  notes?: string;
  status?: string;
};

export interface Permission {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  uuid?: string;
  company_id?: number;
  company?: {
    id: number;
    name: string;
    slug?: string;
    status?: string;
    company_code?: string;
    business_registration_number?: string;
    subscription_status?: string;
    email_verified_at?: string;
  };
  name: string | null;
  email: string;
  profile_photo?: string | null;
  phone?: string | null;
  gender?: string | null;
  bio?: string | null;
  status: string;
  is_system_owner?: boolean;
  roles?: Role[];
}

export interface ApiKey {
  id: number;
  company_id: number;
  name: string;
  description?: string | null;
  public_key: string;
  key_prefix?: string;
  secret_hash?: string;
  permissions?: string[];
  status: string;
  environment?: string;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: number;
  secret?: string;
}

export interface Webhook {
  id: number;
  company_id: number;
  name: string;
  description?: string | null;
  target_url: string;
  http_method?: string;
  retry_count?: number;
  timeout_seconds?: number;
  secret?: string;
  status: string;
  events: string[];
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: number;
  company_id: number;
  company?: {
    id: number;
    name: string;
  };
  name: string;
  email?: string | null;
  phone?: string | null;
  vehicle_type: string;
  vehicle_number?: string | null;
  license_number: string;
  notes?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  company_id: number;
  user_id: number;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: true;
  token: string;
  user?: User | null;
}

export interface MfaRequiredResponse {
  success: true;
  mfa_required: true;
  challenge_token: string;
}

export type LoginResponse = AuthResponse | MfaRequiredResponse;

export interface RegisterResponse {
  user: User;
  message: string;
}

interface DataResponse<T> {
  data: T;
}

type ExtractKind = 'auto' | 'data' | 'user' | 'raw';

async function handleRequest<T>(promise: Promise<AxiosResponse<unknown>>, extract: ExtractKind = 'auto', schema?: z.ZodType<T>): Promise<T> {
  try {
    const res = await promise;
    const payload = res.data as unknown;

    if (import.meta.env.DEV) {
      console.log('API response:', { status: res.status, payload });
    }

    // Determine selected value in a clear, deterministic way
    let selected: unknown;

    const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

    if (extract === 'raw') {
      selected = payload;
    } else if (extract === 'data') {
      if (isObject(payload) && Object.prototype.hasOwnProperty.call(payload, 'data')) selected = (payload as any).data;
      else throw new ApiError("Expected response with 'data' property", res.status ?? null, { responseData: payload });
    } else if (extract === 'user') {
      if (isObject(payload) && Object.prototype.hasOwnProperty.call(payload, 'user')) selected = (payload as any).user;
      else throw new ApiError("Expected response with 'user' property", res.status ?? null, { responseData: payload });
    } else {
      if (isObject(payload)) {
        if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
          selected = (payload as any).data;
        } else if (Object.prototype.hasOwnProperty.call(payload, 'user') && !Object.prototype.hasOwnProperty.call(payload, 'token')) {
          selected = (payload as any).user;
        } else {
          selected = payload;
        }
      } else {
        selected = payload;
      }
    }

    if (schema) {
      const parsed = schema.safeParse(selected as any);
      if (!parsed.success) {
        const issues = parsed.error.format();
        throw new ApiError('Response validation failed', res.status ?? null, { validationErrors: issues, responseData: selected });
      }
      return parsed.data as T;
    }

    return selected as T;
  } catch (err: any) {
    if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
      throw new ApiError('Request cancelled', null, { responseData: err });
    }

    if (err?.isAxiosError && !err?.response) {
      const isTimeout = err?.code === 'ECONNABORTED' || (err?.message && typeof err.message === 'string' && err.message.toLowerCase().includes('timeout'));
      const detail = isTimeout
        ? 'The connection timed out while reaching the server. Please check your connection and click Refresh to try again.'
        : 'Unable to connect to the backend server. Please verify your network connection and server status.';

      throw new ApiError(detail, null, { code: isTimeout ? 'timeout' : 'network_error', responseData: err });
    }

    const status = err?.response?.status ?? null;
    const remote = err?.response?.data;

    if (status === 401) {
      const message = remote?.message || 'Incorrect email or password.';
      throw new ApiError(message, status, { responseData: remote });
    }

    if (status === 422) {
      const message = remote?.message || 'Please check the entered information.';
      throw new ApiError(message, status, { validationErrors: remote?.errors ?? null, responseData: remote });
    }

    if (status && status >= 500) {
      const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? 'support@yourdomain.com';
      const friendly = remote?.message || `Server error. Please try again later. If this continues, contact support at ${SUPPORT_EMAIL}.`;
      throw new ApiError(friendly, status, { responseData: remote });
    }

    const message = remote?.message || err?.message || 'Request failed';
    throw new ApiError(message, status, { responseData: remote });
  }
}

const ENDPOINTS = {
  AUTH: {
    LOGIN: '/v1/auth/login',
    LOGOUT: '/v1/auth/logout',
    REGISTER: '/v1/auth/register',
    ME: '/v1/auth/me',
    CHANGE_PASSWORD: '/v1/auth/change-password',
    SECURITY_SUMMARY: '/v1/auth/security/summary',
    FORGOT_PASSWORD: '/v1/auth/forgot-password',
    RESET_PASSWORD: '/v1/auth/reset-password',
    RESEND_VERIFICATION: '/v1/auth/resend-verification',
  },
  ADMIN: {
    // Executive console admin endpoints were removed; keep minimal surface.
    DASHBOARD: '/v1/admin/dashboard',
    SECURITY: '/v1/admin/security',
  },
  // Platform endpoints have been removed to align the frontend with the new SaaS admin/client model.
  // Legacy platform APIs are no longer used by current SaaS workflows.

};

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const userShape = z.object({
    id: z.number(),
    name: z.string().nullable(),
    email: z.string().email(),
    status: z.string(),
  }).passthrough().nullable().optional();

  const AuthResponseSchema = z.union([
    z.object({
      success: z.literal(true).optional(),
      token: z.string(),
      user: userShape,
    }).passthrough(),
    z.object({
      success: z.literal(true).optional(),
      mfa_required: z.literal(true),
      challenge_token: z.string(),
    }).passthrough(),
    z.object({
      success: z.literal(true).optional(),
      data: z.object({
        token: z.string(),
        user: userShape,
      }).passthrough(),
    }).passthrough(),
  ]);

  try {
    const response = await handleRequest<LoginResponse>(api.post<LoginResponse>(ENDPOINTS.AUTH.LOGIN, payload), 'auto', AuthResponseSchema);

    if (import.meta.env.DEV) {
      console.log('Login response:', response);
    }

    if ('data' in response && response.data) {
      return {
        token: (response as any).data.token,
        user: (response as any).data.user,
        success: true,
      } as AuthResponse;
    }

    return response;
  } catch (error: any) {
    if (error instanceof ApiError && error.status === 401) {
      throw new ApiError(error.message || 'Incorrect email or password.', 401, { responseData: error.responseData });
    }

    if (error instanceof ApiError && error.status === 403) {
      throw error;
    }

    throw error;
  }
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return handleRequest<RegisterResponse>(api.post<RegisterResponse>(ENDPOINTS.AUTH.REGISTER, payload), 'raw');
}

export async function forgotPassword(payload: { email: string }): Promise<{ message: string }> {
  return handleRequest<{ message: string }>(api.post<{ message: string }>(ENDPOINTS.AUTH.FORGOT_PASSWORD, payload), 'raw');
}

export async function resetPassword(payload: { email: string; token: string; password: string; password_confirmation: string }): Promise<{ message: string }> {
  return handleRequest<{ message: string }>(api.post<{ message: string }>(ENDPOINTS.AUTH.RESET_PASSWORD, payload), 'raw');
}

export async function resendVerificationEmail(payload: { email: string }): Promise<{ message: string }> {
  return handleRequest<{ message: string }>(api.post<{ message: string }>(ENDPOINTS.AUTH.RESEND_VERIFICATION, payload), 'raw');
}

export async function fetchDashboard(): Promise<Record<string, unknown>> {
  return handleRequest<Record<string, unknown>>(api.get<Record<string, unknown>>(ENDPOINTS.ADMIN.DASHBOARD), 'raw');
}

export async function fetchSecurityMetrics(): Promise<Record<string, unknown>> {
  return handleRequest<Record<string, unknown>>(api.get<Record<string, unknown>>(ENDPOINTS.ADMIN.SECURITY), 'raw');
}
// Legacy admin functions (API keys, webhooks, drivers, users/roles, audit logs)
// were removed along with the legacy admin pages. If you need any of these
// functions restored in a scoped way, open a task and I'll reintroduce them
// behind explicit feature flags or dedicated modules.

export async function changePassword(payload: { current_password: string; password: string; password_confirmation: string }): Promise<{ message: string }> {
  return handleRequest<{ message: string }>(api.post<{ message: string }>(ENDPOINTS.AUTH.CHANGE_PASSWORD, payload), 'raw');
}

export async function fetchSecuritySummary(): Promise<{
  mfa_enabled: boolean;
  login_history: Array<Record<string, unknown>>;
  sessions: Array<Record<string, unknown>>;
  activity_logs: Array<Record<string, unknown>>;
}> {
  return handleRequest<{ mfa_enabled: boolean; login_history: Array<Record<string, unknown>>; sessions: Array<Record<string, unknown>>; activity_logs: Array<Record<string, unknown>> }>(
    api.get(ENDPOINTS.AUTH.SECURITY_SUMMARY),
    'raw',
  );
}

export async function revokeSession(sessionId: number): Promise<{ message: string }> {
  return handleRequest<{ message: string }>(api.post(`/v1/auth/security/sessions/${sessionId}/revoke`), 'raw');
}

export async function revokeAllSessions(): Promise<{ message: string }> {
  return handleRequest<{ message: string }>(api.post('/v1/auth/security/sessions/revoke-all'), 'raw');
}

export async function setupMfa(): Promise<{ secret: string; otpauth: string }> {
  return handleRequest<{ secret: string; otpauth: string }>(api.get('/v1/auth/mfa/setup'), 'raw');
}

export async function confirmMfa(payload: { secret: string; code: string }): Promise<{ message: string; recovery_codes?: string[] }> {
  return handleRequest<{ message: string; recovery_codes?: string[] }>(api.post('/v1/auth/mfa/confirm', payload), 'raw');
}

export async function fetchMe(): Promise<User> {
  const UserSchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    email: z.string().email(),
    status: z.string(),
    roles: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        description: z.string().nullable().optional(),
        permissions: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
            description: z.string().nullable().optional(),
            created_at: z.string().optional(),
            updated_at: z.string().optional(),
          }).passthrough(),
        ).optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
      }).passthrough(),
    ).optional(),
  }).partial().passthrough();

  return handleRequest<User>(api.get<{ user: User }>(ENDPOINTS.AUTH.ME), 'user', UserSchema);
}

export async function logoutRequest(): Promise<void> {
  await api.post(ENDPOINTS.AUTH.LOGOUT);
}

// Roles, permissions and user management API helpers were removed with the
// legacy admin pages. Reintroduce on request.

// Platform-specific functions were removed from the frontend auth service because the current SaaS model routes admin workflows through `/admin/*` and client workflows through `/client/*`.
