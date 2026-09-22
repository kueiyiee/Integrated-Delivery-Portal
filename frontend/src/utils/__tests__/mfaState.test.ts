import { describe, expect, it } from 'vitest';
import { normalizeMfaEnabled, shouldShowMfaAction, shouldShowMfaSetupState } from '../mfaState';

describe('mfa state helpers', () => {
  it('normalizes string and boolean MFA flags from the backend/auth state', () => {
    expect(normalizeMfaEnabled(true)).toBe(true);
    expect(normalizeMfaEnabled(false)).toBe(false);
    expect(normalizeMfaEnabled('true')).toBe(true);
    expect(normalizeMfaEnabled('false')).toBe(false);
    expect(normalizeMfaEnabled('1')).toBe(true);
    expect(normalizeMfaEnabled('0')).toBe(false);
    expect(normalizeMfaEnabled(undefined)).toBe(false);
  });

  it('shows the action when MFA is not configured but hides setup while enabled', () => {
    expect(shouldShowMfaAction({ mfaEnabled: false, isMfaSetupVisible: false })).toBe(true);
    expect(shouldShowMfaAction({ mfaEnabled: true, isMfaSetupVisible: false })).toBe(true);
    expect(shouldShowMfaSetupState({ mfaEnabled: false, isMfaSetupVisible: true })).toBe(true);
    expect(shouldShowMfaSetupState({ mfaEnabled: true, isMfaSetupVisible: true })).toBe(false);
  });
});
