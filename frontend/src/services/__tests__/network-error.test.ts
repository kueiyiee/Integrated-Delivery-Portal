import { describe, expect, it } from 'vitest';
import { getApiHubFailureMessage, getRequestErrorMessage, isTimeoutError, PROFESSIONAL_ERROR_MESSAGES } from '../auth';

describe('network error handling', () => {
  it('detects timeout errors and returns professional message', () => {
    const error = {
      isAxiosError: true,
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
    };

    expect(isTimeoutError(error)).toBe(true);
    expect(getRequestErrorMessage(error)).toBe(PROFESSIONAL_ERROR_MESSAGES.timeout);
    expect(getRequestErrorMessage(error)).toBe('The connection timed out while reaching the server. Please refresh the page and try again. If the issue continues, contact support.');
  });

  it('detects ECONNABORTED by code', () => {
    const error = { code: 'ECONNABORTED', message: 'Connection aborted' };
    expect(isTimeoutError(error)).toBe(true);
    expect(getRequestErrorMessage(error)).toBe(PROFESSIONAL_ERROR_MESSAGES.timeout);
  });

  it('detects TimeoutError by name', () => {
    const error = { name: 'TimeoutError', message: 'Request timed out' };
    expect(isTimeoutError(error)).toBe(true);
    expect(getRequestErrorMessage(error)).toBe(PROFESSIONAL_ERROR_MESSAGES.timeout);
  });

  it('uses professional message for offline or server connection failures', () => {
    const error = {
      isAxiosError: true,
      code: 'ERR_NETWORK',
      message: 'Network Error',
    };

    expect(getRequestErrorMessage(error)).toBe(PROFESSIONAL_ERROR_MESSAGES.network);
    expect(getRequestErrorMessage(error)).toBe('We’re unable to reach the server right now. Please check your connection and try again. If the issue continues, contact support.');
  });

  it('prefers the backend response message over the generic timeout copy when the server rejects invalid credentials', () => {
    const error = {
      isAxiosError: true,
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
      response: {
        status: 401,
        data: {
          message: 'The email address or password you entered is not recognized. Please verify and try again.',
        },
      },
    };

    expect(isTimeoutError(error)).toBe(false);
    expect(getRequestErrorMessage(error)).toBe('The email address or password you entered is not recognized. Please verify and try again.');
  });

  it('uses a truthful no-data message instead of a fake internet outage when the API hub has no configured records yet', () => {
    const errors = [
      { isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' },
      { isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' },
      { isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' },
    ];

    expect(getApiHubFailureMessage(errors)).toBe('No API data is available for this organization yet. Create an API key or configure your integration details to get started in the Developer & API Hub.');
  });

  it('exports professional error message constants', () => {
    expect(PROFESSIONAL_ERROR_MESSAGES.timeout).toBeDefined();
    expect(PROFESSIONAL_ERROR_MESSAGES.network).toBeDefined();
    expect(PROFESSIONAL_ERROR_MESSAGES.default).toBeDefined();
    expect(PROFESSIONAL_ERROR_MESSAGES.timeout).toContain('timed out while reaching the server');
    expect(PROFESSIONAL_ERROR_MESSAGES.network).toContain('unable to reach the server right now');
  });
});
