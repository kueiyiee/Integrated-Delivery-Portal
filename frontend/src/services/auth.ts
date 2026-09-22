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
  provider: string;
  name: string;
  description?: string;
  target_url: string;
  http_method?: string;
  retry_count?: number;
  timeout_seconds?: number;
  events: string[];
  status?: 'active' | 'disabled';
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
  provider?: string;
  name: string;
  description?: string | null;
  target_url: string;
  http_method?: string;
  retry_count?: number;
  timeout_seconds?: number;
  secret?: string;
  status: string;
  events: string[];
  last_delivery_at?: string | null;
  last_status?: string | null;
  environment?: string;
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

export interface MfaSetupRequiredResponse {
  success: true;
  mfa_setup_required: true;
  token: string;
  user?: User | null;
}

export type LoginResponse = AuthResponse | MfaRequiredResponse | MfaSetupRequiredResponse;

export interface RegisterResponse {
  user: User;
  message: string;
}

interface DataResponse<T> {
  data: T;
}

type ExtractKind = 'auto' | 'data' | 'user' | 'raw';

const TIMEOUT_ERROR_MESSAGE = 'The connection timed out while reaching the server. Please refresh the page and try again. If the issue continues, contact support.';
const NETWORK_ERROR_MESSAGE = 'We’re unable to reach the server right now. Please check your connection and try again. If the issue continues, contact support.';
const SIGN_IN_NETWORK_ERROR_MESSAGE = 'We couldn’t reach the secure sign-in service right now. Please check your connection and try again. If the problem continues, contact support.';
const DEFAULT_ERROR_MESSAGE = 'We couldn’t reach the secure service right now. Please refresh the page and try again. If the problem continues, contact support.';

// MFA Messages
const MFA_SETUP_INIT_MESSAGE = 'MFA setup is ready. Scan the QR code with your authenticator app and enter the 6-digit code to verify and activate two-factor protection.';
const MFA_ENABLED_MESSAGE = 'Two-factor authentication is now active. Your account is protected with an additional security layer and requires both a password and authenticator code to sign in.';
const MFA_DISABLED_MESSAGE = 'Two-factor authentication has been disabled. Your account will now only require your password to sign in. Please note this reduces your account security.';
const MFA_DISABLE_INIT_ERROR_MESSAGE = 'Start MFA setup again before verifying your authenticator code.';
const MFA_CODE_EMPTY_MESSAGE = 'Enter the 6-digit code from your authenticator app to continue.';
const MFA_CONFIRMATION_REQUIRED_MESSAGE = 'Please confirm that you want to disable two-factor authentication before continuing.';
const MFA_PASSWORD_CODE_REQUIRED_MESSAGE = 'Enter your current password and the current 6-digit authenticator code to disable MFA.';
const MFA_DISABLE_GENERIC_ERROR_MESSAGE = 'Unable to disable two-factor authentication. Please confirm your password and current authenticator code and try again.';

export function isTimeoutError(error: any): boolean {
  if (!error) return false;

  if (error.code === 'ECONNABORTED') return true;
  if (error.name === 'TimeoutError') return true;
  if (error.message === 'timeout of ' + (error.timeout || '30000') + 'ms exceeded') return true;

  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return message.includes('timeout') || message.includes('timed out') || message.includes('econnaborted');
}

export function getRequestErrorMessage(error: any, fallback = DEFAULT_ERROR_MESSAGE): string {
  if (!error) return fallback;

  const remoteMessage = typeof error?.response?.data?.message === 'string'
    ? error.response.data.message.trim()
    : typeof error?.response?.data?.error === 'string'
      ? error.response.data.error.trim()
      : '';

  if (remoteMessage) {
    return remoteMessage;
  }

  if (isTimeoutError(error)) {
    return TIMEOUT_ERROR_MESSAGE;
  }

  if (error?.isAxiosError || error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return NETWORK_ERROR_MESSAGE;
  }

  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  if (message) return message;

  return fallback;
}

export function getApiHubFailureMessage(rejections: any[] = []): string {
  if (!rejections.length) {
    return 'No API data is available for this organization yet. Create an API key or configure your integration details to get started in the Developer & API Hub.';
  }

  const remoteMessages = rejections
    .map((error) => error?.response?.data?.message || error?.response?.data?.error || error?.message)
    .filter((message): message is string => typeof message === 'string' && message.trim().length > 0);

  const statusCodes = rejections
    .map((error) => error?.response?.status ?? error?.status)
    .filter((status): status is number => typeof status === 'number');

  const isNoDataState = statusCodes.some((status) => status === 404) || remoteMessages.some((message) => /no data|no records|not found|empty/i.test(message));
  if (isNoDataState) {
    return 'No API data is available for this organization yet. Create an API key or configure your integration details to get started in the Developer & API Hub.';
  }

  const hasNetworkIssue = rejections.some((error) => {
    if (!error) return false;
    const isNetworkError = error?.isAxiosError || error?.code === 'ERR_NETWORK' || error?.message === 'Network Error';
    return isNetworkError || isTimeoutError(error);
  });

  if (hasNetworkIssue) {
    return PROFESSIONAL_ERROR_MESSAGES.network;
  }

  const firstMessage = remoteMessages[0] || 'Unable to load Developer & API Hub data right now. Please try again shortly.';
  return firstMessage;
}

export const PROFESSIONAL_ERROR_MESSAGES = {
  timeout: TIMEOUT_ERROR_MESSAGE,
  network: NETWORK_ERROR_MESSAGE,
  signInNetwork: SIGN_IN_NETWORK_ERROR_MESSAGE,
  default: DEFAULT_ERROR_MESSAGE,
  invalidCredentials: "We couldn't sign you in. Please check your email address and password, then try again.",
  emailRequired: 'Email is required to continue.',
  passwordRequired: 'Password is required to continue.',
  validationRequired: 'Please complete the required information before continuing.',
};

export type AuthErrorContext = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'mfa' | 'verification';

export function resolveAuthErrorMessage(error: any, context: AuthErrorContext = 'login', fallback?: string): string {
  const remoteMessage = typeof error?.response?.data?.message === 'string'
    ? error.response.data.message.trim()
    : typeof error?.response?.data?.error === 'string'
      ? error.response.data.error.trim()
      : '';

  if (remoteMessage) {
    return remoteMessage;
  }

  if (isTimeoutError(error)) {
    return PROFESSIONAL_ERROR_MESSAGES.timeout;
  }

  if (error?.isAxiosError || error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return PROFESSIONAL_ERROR_MESSAGES.network;
  }

  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  if (message) {
    return message;
  }

  const defaultFallback = fallback ?? (() => {
    switch (context) {
      case 'login':
        return PROFESSIONAL_ERROR_MESSAGES.invalidCredentials;
      case 'register':
        return 'We were unable to complete your registration request. Please review the information and try again.';
      case 'forgot-password':
        return 'We could not process your password recovery request. Please try again shortly.';
      case 'reset-password':
        return 'We could not update your password. Please review the reset code and try again.';
      case 'mfa':
        return 'We could not verify your security code. Please try again.';
      case 'verification':
        return 'We could not complete verification. Please try again.';
      default:
        return PROFESSIONAL_ERROR_MESSAGES.default;
    }
  })();

  return defaultFallback;
}

export const PROFESSIONAL_MFA_MESSAGES = {
  setupInit: MFA_SETUP_INIT_MESSAGE,
  enabled: MFA_ENABLED_MESSAGE,
  disabled: MFA_DISABLED_MESSAGE,
  disableInitError: MFA_DISABLE_INIT_ERROR_MESSAGE,
  codeEmpty: MFA_CODE_EMPTY_MESSAGE,
  confirmationRequired: MFA_CONFIRMATION_REQUIRED_MESSAGE,
  passwordCodeRequired: MFA_PASSWORD_CODE_REQUIRED_MESSAGE,
  disableGenericError: MFA_DISABLE_GENERIC_ERROR_MESSAGE,
};

async function handleRequest<T>(promise: Promise<AxiosResponse<unknown>>, extract: ExtractKind = 'auto', schema?: z.ZodType<T>): Promise<T> {
  try {
    const res = await promise;
    const payload = res.data as unknown;

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
      const isTimeout = isTimeoutError(err);
      const detail = getRequestErrorMessage(err);

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
    SEND_VERIFICATION_OTP: '/v1/auth/send-verification-otp',
    VERIFY_EMAIL_OTP: '/v1/auth/verify-email-otp',
    VERIFY_PASSWORD_RESET_OTP: '/v1/auth/verify-password-reset-otp',
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
      mfa_setup_required: z.literal(true),
      token: z.string(),
      user: userShape,
    }).passthrough(),
    z.object({
      success: z.literal(true).optional(),
      data: z.object({
        token: z.string(),
        user: userShape,
      }).passthrough(),
    }).passthrough(),
  ]) as z.ZodType<LoginResponse>;

  try {
    const response = await handleRequest<LoginResponse>(api.post<LoginResponse>(ENDPOINTS.AUTH.LOGIN, payload), 'auto', AuthResponseSchema);

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
      throw new ApiError(error.message || "We couldn't sign you in. Please check your email address and password, then try again.", 401, { responseData: error.responseData });
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

export async function verifyPasswordResetOtp(payload: { email: string; otp: string }): Promise<{ success: boolean; message: string }> {
  return handleRequest<{ success: boolean; message: string }>(api.post<{ success: boolean; message: string }>(ENDPOINTS.AUTH.VERIFY_PASSWORD_RESET_OTP, payload), 'raw');
}

export async function resetPassword(payload: { email: string; token?: string; otp?: string; password: string; password_confirmation: string }): Promise<{ message: string }> {
  return handleRequest<{ message: string }>(api.post<{ message: string }>(ENDPOINTS.AUTH.RESET_PASSWORD, payload), 'raw');
}

export async function resendVerificationEmail(payload: { email: string }): Promise<{ message: string }> {
  return handleRequest<{ message: string }>(api.post<{ message: string }>(ENDPOINTS.AUTH.RESEND_VERIFICATION, payload), 'raw');
}

export async function sendVerificationOtp(payload: { email: string }): Promise<{ success: boolean; message: string }> {
  return handleRequest<{ success: boolean; message: string }>(api.post<{ success: boolean; message: string }>(ENDPOINTS.AUTH.SEND_VERIFICATION_OTP, payload), 'raw');
}

export async function verifyEmailOtp(payload: { email: string; otp: string }): Promise<{ success: boolean; message: string; user?: Record<string, unknown> }> {
  return handleRequest<{ success: boolean; message: string; user?: Record<string, unknown> }>(api.post<{ success: boolean; message: string; user?: Record<string, unknown> }>(ENDPOINTS.AUTH.VERIFY_EMAIL_OTP, payload), 'raw');
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
  sessions: Array<Record<string, unknown> & { is_current?: boolean }>;
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

export async function revokeOtherSessions(): Promise<{ message: string; terminated_count: number }> {
  return handleRequest<{ message: string; terminated_count: number }>(api.post('/v1/auth/security/sessions/revoke-others'), 'raw');
}

export async function setupMfa(): Promise<{ secret: string; otpauth: string }> {
  return handleRequest<{ secret: string; otpauth: string }>(api.get('/v1/auth/mfa/setup'), 'raw');
}

export async function confirmMfa(payload: { secret: string; code: string }): Promise<{ message: string; mfa_enabled?: boolean; recovery_codes?: string[]; token?: string; user?: User }> {
  return handleRequest<{ message: string; mfa_enabled?: boolean; recovery_codes?: string[]; token?: string; user?: User }>(api.post('/v1/auth/mfa/confirm', payload), 'raw');
}

export async function disableMfa(payload: { current_password: string; mfa_code: string }): Promise<{ message: string }> {
  return handleRequest<{ message: string }>(api.post('/v1/auth/mfa/disable', payload), 'raw');
}

export async function verifyMfa(payload: { challenge_token: string; code: string }): Promise<{ token: string; user: User }> {
  return handleRequest<{ token: string; user: User }>(api.post('/v1/auth/mfa/verify', payload), 'raw');
}

export async function fetchMe(): Promise<User> {
  const UserSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    email: z.string().email().optional(),
    status: z.string().optional(),
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
  }).passthrough() as z.ZodType<User>;

  return handleRequest<User>(api.get<{ user: User }>(ENDPOINTS.AUTH.ME), 'user', UserSchema);
}

export async function logoutRequest(token?: string | null): Promise<void> {
  await api.post(ENDPOINTS.AUTH.LOGOUT, undefined, token ? {
    headers: { Authorization: `Bearer ${token}` },
  } : undefined);
}

// Roles, permissions and user management API helpers were removed with the
// legacy admin pages. Reintroduce on request.

// Platform-specific functions were removed from the frontend auth service because the current SaaS model routes admin workflows through `/admin/*` and client workflows through `/client/*`.
