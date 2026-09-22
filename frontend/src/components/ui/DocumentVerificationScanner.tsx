import React, { useCallback, useEffect, useRef, useState } from 'react';

function parseVerificationToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const parsedUrl = new URL(trimmed);
    const match = parsedUrl.pathname.match(/\/(?:reports|documents)\/verify\/([A-Za-z0-9]{64})/i);
    if (match) return match[1];
  } catch {
    // Not a URL; continue with plain-token fallback.
  }

  if (/^[A-Za-z0-9]{64}$/.test(trimmed)) return trimmed;

  return null;
}

interface DocumentVerificationScannerProps {
  value: string;
  onChange: (nextValue: string) => void;
  buttonLabel?: string;
  compact?: boolean;
}

export function DocumentVerificationScanner({
  value,
  onChange,
  buttonLabel = 'Scan QR code',
  compact = false,
}: DocumentVerificationScannerProps) {
  const [supportsScanner, setSupportsScanner] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'starting' | 'scanning' | 'error'>('idle');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  useEffect(() => {
    setSupportsScanner(Boolean(typeof window !== 'undefined' && 'BarcodeDetector' in window && navigator?.mediaDevices?.getUserMedia));
  }, []);

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      window.cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScannerActive(false);
    setScanStatus('idle');
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const beginScan = useCallback(async () => {
    setScanError(null);
    setScanStatus('starting');

    if (!supportsScanner) {
      setScanError('This browser cannot scan QR codes. You can still paste a verification token or URL manually.');
      setScanStatus('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (!videoRef.current) {
        throw new Error('Unable to initialize camera preview.');
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScannerActive(true);
      setScanStatus('scanning');

      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      let active = true;

      const scanFrame = async () => {
        if (!videoRef.current || !active || !streamRef.current) return;

        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0]?.rawValue?.toString();
            if (rawValue) {
              active = false;
              stopCamera();
              const token = parseVerificationToken(rawValue);
              onChange(token ?? rawValue);
              return;
            }
          }
        } catch {
          active = false;
          setScanError('Unable to decode the QR code. Please try again or paste the verification code manually.');
          setScanStatus('error');
          return;
        }

        scanLoopRef.current = window.requestAnimationFrame(scanFrame);
      };

      scanLoopRef.current = window.requestAnimationFrame(scanFrame);
    } catch (err: any) {
      const name = err?.name ?? '';
      const message = err?.message ?? '';

      if (name === 'NotAllowedError' || name === 'SecurityError' || message.toLowerCase().includes('permission')) {
        setScanError('Camera access is blocked. Please allow camera access in the browser and try again.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError' || message.toLowerCase().includes('no device')) {
        setScanError('No camera was found on this device. Please paste the verification code manually.');
      } else {
        setScanError(message || 'Camera access is unavailable right now. Please use manual verification.');
      }
      setScanStatus('error');
    }
  }, [onChange, stopCamera, supportsScanner]);

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={scannerActive ? stopCamera : beginScan}
          style={{
            border: '1px solid rgba(106,143,49,0.22)',
            background: 'linear-gradient(135deg, rgba(106,143,49,0.14), rgba(156,196,58,0.12))',
            color: 'var(--text-primary)',
            padding: compact ? '0.6rem 0.9rem' : '0.7rem 1rem',
            borderRadius: 12,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 10px 24px rgba(106,143,49,0.12)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span aria-hidden="true">📷</span>
          {scannerActive ? 'Stop camera' : buttonLabel}
        </button>

        {supportsScanner ? (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            {scannerActive ? 'Scanning live' : 'Ready to scan'}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            Manual entry only
          </span>
        )}
      </div>

      {scannerActive || scanStatus === 'error' ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div
            style={{
              width: '100%',
              maxWidth: compact ? 260 : 360,
              aspectRatio: '4 / 3',
              borderRadius: 14,
              overflow: 'hidden',
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 14px 30px rgba(15,23,42,0.12)',
            }}
          >
            {scannerActive ? (
              <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted autoPlay playsInline />
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#cbd5e1', textAlign: 'center', padding: 18, fontSize: 13, lineHeight: 1.6 }}>
                Point your camera at a verification QR code.
              </div>
            )}
          </div>

          {scanError ? <div style={{ color: '#b91c1c', fontSize: 12, fontWeight: 600 }}>{scanError}</div> : null}
          {scanStatus === 'error' && supportsScanner ? (
            <button
              type="button"
              onClick={beginScan}
              style={{
                width: 'fit-content',
                padding: '0.55rem 0.85rem',
                borderRadius: 10,
                border: '1px solid rgba(106,143,49,0.24)',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Retry scan
            </button>
          ) : null}
        </div>
      ) : null}

      {value ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          Current value: {value.length > 40 ? `${value.slice(0, 40)}…` : value}
        </div>
      ) : null}
    </div>
  );
}
