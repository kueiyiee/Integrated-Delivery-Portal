/**
 * Normalize backend MFA enabled flag (handles string/boolean/undefined mismatches).
 * The backend must always return the authoritative boolean value, but
 * this helps bridge any temporary serialization issues.
 */
export function normalizeMfaEnabled(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  return false;
}

/**
 * Determine whether to show any MFA-related action/button.
 * Always show action buttons (Enable/Disable toggle) when:
 * - MFA is not enabled (show Setup button)
 * - MFA is enabled (show Disable button)
 * Hide only while setup is in progress (QR generation/entry).
 */
export function shouldShowMfaAction({
  mfaEnabled,
  isMfaSetupVisible,
}: {
  mfaEnabled: boolean;
  isMfaSetupVisible: boolean;
}): boolean {
  // If setup modal is showing, buttons are replaced by setup form
  if (isMfaSetupVisible) {
    return false;
  }
  // Otherwise always show the Enable/Disable action
  return true;
}

/**
 * Determine whether to show the MFA setup form (QR code, code entry, etc.).
 * Show setup only when:
 * - Setup was explicitly initiated by user (isMfaSetupVisible = true)
 * - AND MFA is not yet fully enabled (mfaEnabled = false)
 * Hide setup form after successful enable or when user cancels.
 */
export function shouldShowMfaSetupState({
  mfaEnabled,
  isMfaSetupVisible,
}: {
  mfaEnabled: boolean;
  isMfaSetupVisible: boolean;
}): boolean {
  return isMfaSetupVisible && !mfaEnabled;
}
