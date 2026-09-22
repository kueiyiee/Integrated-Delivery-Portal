import React, { useEffect, useRef } from 'react';

type OtpPurpose = 'email_verification' | 'password_reset';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: string | null;
  autoFocus?: boolean;
  purpose?: OtpPurpose;
  ariaLabel?: string;
}

function normalizeOtpValue(value: string, length: number): string {
  return value.replace(/\D/g, '').slice(0, length);
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = null,
  autoFocus = false,
  purpose = 'email_verification',
  ariaLabel,
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const focusInput = (index: number) => {
    const input = inputsRef.current[index];
    if (input) {
      input.focus();
      input.select();
    }
  };

  useEffect(() => {
    if (autoFocus) {
      focusInput(0);
    }
  }, [autoFocus]);

  const emitChange = (nextValue: string, nextIndex?: number) => {
    const normalized = normalizeOtpValue(nextValue, length);
    onChange(normalized);

    if (normalized.length === length && /^\d{6}$/.test(normalized)) {
      onComplete?.(normalized);
      return;
    }

    if (typeof nextIndex === 'number' && nextIndex >= 0 && nextIndex < length) {
      focusInput(nextIndex);
    }
  };

  const handleInputChange = (index: number, rawValue: string) => {
    const digits = value.padEnd(length, '').split('');
    const sanitized = rawValue.replace(/\D/g, '').slice(-1);

    if (!sanitized) {
      digits[index] = '';
      emitChange(digits.join(''));
      return;
    }

    digits[index] = sanitized;
    const nextValue = digits.join('').slice(0, length);
    emitChange(nextValue, index < length - 1 ? index + 1 : undefined);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    const currentDigits = value.padEnd(length, '').split('');

    if (event.key === 'Backspace') {
      if (currentDigits[index]) {
        event.preventDefault();
        currentDigits[index] = '';
        emitChange(currentDigits.join(''));
        return;
      }

      if (index > 0) {
        event.preventDefault();
        currentDigits[index - 1] = '';
        emitChange(currentDigits.join(''));
        focusInput(index - 1);
      }
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      currentDigits[index] = '';
      emitChange(currentDigits.join(''));
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (index > 0) {
        focusInput(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (index < length - 1) {
        focusInput(index + 1);
      }
      return;
    }
  };

  const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData.getData('text') ?? '';
    const digits = normalizeOtpValue(pastedText, length);

    if (!digits) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    const nextDigits = value.padEnd(length, '').split('');
    for (let offset = 0; offset < digits.length; offset += 1) {
      const targetIndex = index + offset;
      if (targetIndex < length) {
        nextDigits[targetIndex] = digits[offset];
      }
    }

    const nextValue = nextDigits.join('').slice(0, length);
    emitChange(nextValue, digits.length > 0 ? Math.min(length - 1, index + digits.length - 1) : index);
  };

  const otpValues = Array.from({ length }, (_, index) => value[index] ?? '');

  return (
    <div
      className={`otp-input-shell ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}
      role="group"
      aria-label={ariaLabel ?? `${purpose === 'password_reset' ? 'Password reset' : 'Email verification'} one-time password`}
      aria-invalid={Boolean(error)}
    >
      {otpValues.map((cellValue, index) => (
        <input
          key={index}
          ref={(node) => {
            inputsRef.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={1}
          value={cellValue}
          onChange={(event) => handleInputChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.target.select()}
          aria-label={`${purpose === 'password_reset' ? 'Password reset' : 'Verification'} digit ${index + 1}`}
          className="otp-input-box"
          disabled={disabled}
          aria-invalid={Boolean(error)}
        />
      ))}
    </div>
  );
}
