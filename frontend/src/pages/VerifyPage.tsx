import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

function formatDate(ts: string | undefined) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return ts;
  }
}

function parseVerificationToken(input: string): string | null {
  const trimmed = input.trim();
  const tokenMatch = trimmed.match(/([A-Za-z0-9]{64})$/);
  return tokenMatch ? tokenMatch[1] : null;
}

export default function VerifyPage({ token }: { token?: string }) {
  const params = useParams<{ token: string }>();
  const navigate = useNavigate();
  const verificationToken = token ?? params.token;
  const [status, setStatus] = useState<'idle'|'loading'|'verified'|'not_found'|'expired'|'temporary_error'|'invalid'>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle'|'starting'|'scanning'|'error'>('idle');
  const [supportsScanner, setSupportsScanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  const hasToken = Boolean(verificationToken);
  const scannerSupported = useMemo(() => {
    return typeof window !== 'undefined' && 'BarcodeDetector' in window && navigator?.mediaDevices?.getUserMedia;
  }, []);

  useEffect(() => {
    setSupportsScanner(scannerSupported);
  }, [scannerSupported]);

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
    setManualError(null);
    setScanStatus('starting');

    if (!supportsScanner) {
      setScanError('QR scanning is not supported by this browser. Please use manual code entry.');
      setScanStatus('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
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
              if (token) {
                navigate(`/verify/${token}`);
                return;
              }
              setScanError('QR code detected, but it did not contain a valid verification token.');
              setScanStatus('error');
              return;
            }
          }
        } catch (err) {
          active = false;
          setScanError('Unable to decode QR code. Please try again or use manual entry.');
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
        setScanError('Camera access is blocked. Please allow camera permission in your browser settings and try again.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError' || message.toLowerCase().includes('no device')) {
        setScanError('No camera was found on this device. Use the manual verification field instead.');
      } else {
        setScanError(message || 'Camera permission denied or device unavailable.');
      }
      setScanStatus('error');
    }
  }, [navigate, supportsScanner, scannerActive, stopCamera]);

  const handleManualSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setManualError(null);
    const token = parseVerificationToken(manualInput);
    if (!token) {
      setManualError('Enter a valid 64-character verification code or scanned URL.');
      return;
    }
    navigate(`/verify/${token}`);
  }, [manualInput, navigate]);

  useEffect(() => {
    if (!hasToken) return;
    setStatus('loading');
    setError(null);
    setResult(null);

    void api.get(`/v1/public/reports/verify/${verificationToken}`)
      .then((res) => {
        const st = res.data.status ?? 'verified';
        setStatus(st);
        setResult(res.data.verification_result ?? res.data);
      })
      .catch((err) => {
        const st = err?.response?.data?.status ?? 'not_found';
        setStatus(st);
        setError(err?.response?.data?.message ?? 'Verification failed.');
      });
  }, [hasToken, verificationToken]);

  return (
    <div style={{ minHeight: '100vh', padding: 16, background: '#f8fafc', fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ margin: '0 auto', width: '100%', maxWidth: 820, padding: '16px 0' }}>
        <header style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#0f172a', opacity: 0.65 }}>DeliveryPortal Secure Verification</div>
          <h1 style={{ margin: '12px 0 0', fontSize: 34, lineHeight: 1.1, color: '#0f172a' }}>Scan or enter your document verification token</h1>
          <p style={{ margin: '14px auto 0', maxWidth: 620, color: '#475569', fontSize: 15, lineHeight: 1.7 }}>Use this portal to authenticate printed DeliveryPortal documents. Scan the QR code with your phone, or paste a verification code or URL below.</p>
          <div style={{ margin: '12px auto 0', maxWidth: 620, display: 'inline-flex', alignItems: 'center', padding: '10px 14px', borderRadius: 999, background: '#eff6ff', color: '#1d4ed8', fontSize: 13, fontWeight: 600, border: '1px solid #dbeafe' }}>
            Trusted verification service for DeliveryPortal official exports
          </div>
        </header>

        {!hasToken && (
          <section style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gap: 14, background: '#ffffff', borderRadius: 18, padding: 22, boxShadow: '0 12px 30px rgba(15,23,42,0.05)' }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Start verification</div>
                <div style={{ color: '#475569', lineHeight: 1.7 }}>Tap the scanner button below to use your device camera, or paste a secure verification code or URL into the manual entry field. No app installation required.</div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <button
                  type="button"
                  onClick={beginScan}
                  style={{
                    borderRadius: 12,
                    padding: '14px 18px',
                    border: 'none',
                    background: '#1d4ed8',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 10px 20px rgba(30,64,175,0.16)',
                  }}
                >
                  {supportsScanner ? 'Scan QR Code with Camera' : 'Start Manual Verification'}
                </button>

                <div style={{ display: 'grid', gap: 8 }}>
                  <form onSubmit={handleManualSubmit}>
                    <label htmlFor="verificationInput" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Paste verification URL or code</label>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <input
                        id="verificationInput"
                        value={manualInput}
                        onChange={(event) => setManualInput(event.target.value)}
                        placeholder="https://.../verify/abcdef123... or 64-character code"
                        style={{ width: '100%', minHeight: 50, borderRadius: 12, border: '1px solid #cbd5e1', padding: '0 14px', fontSize: 15, color: '#0f172a' }}
                      />
                      <button
                        type="submit"
                        style={{ borderRadius: 12, padding: '12px 18px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Verify Code
                      </button>
                      {manualError && <div style={{ color: '#b91c1c', fontSize: 13 }}>{manualError}</div>}
                    </div>
                  </form>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8, padding: '16px 0 0', borderTop: '1px solid #e2e8f0', color: '#475569', fontSize: 13 }}>
                <div><strong>What this portal checks</strong></div>
                <ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc' }}>
                  <li>Authenticity of the printed document</li>
                  <li>Official DeliveryPortal verification token</li>
                  <li>Expiry and tamper status from the audit service</li>
                </ul>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 18, padding: 20, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>QR Scanner</div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>Point your camera at the QR code. The scan will complete automatically once the code is in frame.</div>
                </div>
                <button
                  onClick={scannerActive ? stopCamera : beginScan}
                  type="button"
                  style={{ borderRadius: 12, border: '1px solid #cbd5e1', background: scannerActive ? '#f8fafc' : '#fff', color: '#0f172a', padding: '10px 14px', cursor: 'pointer' }}
                >
                  {scannerActive ? 'Stop scan' : supportsScanner ? 'Open camera scanner' : 'Camera unavailable'}
                </button>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 18, background: '#0f172a', overflow: 'hidden', position: 'relative', minHeight: 240, display: 'grid', placeItems: 'center' }}>
                  {scannerActive ? (
                    <video
                      ref={videoRef}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      muted
                      playsInline
                      autoPlay
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#cbd5e1', padding: 20, fontSize: 15, lineHeight: 1.6 }}>
                      Camera preview will appear here when you start scanning. Tap the button above to open your device camera and scan the QR code.
                    </div>
                  )}
                </div>
                <div style={{ color: '#475569', fontSize: 14, display: 'grid', gap: 6 }}>
                  {supportsScanner ? (
                    <div>Make sure your browser has camera permissions enabled. If scanning fails, try refreshing the page or using the rear camera.</div>
                  ) : (
                    <div style={{ color: '#b91c1c' }}>
                      QR scanning is not supported by this browser. Use the manual code entry above, or try a supported browser such as Chrome or Edge.
                    </div>
                  )}
                  {scanStatus === 'error' && scanError ? (
                    <div style={{ color: '#b91c1c', fontSize: 13 }}>{scanError}</div>
                  ) : null}
                  {scanStatus === 'error' && supportsScanner ? (
                    <button
                      type="button"
                      onClick={beginScan}
                      style={{ borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', padding: '10px 14px', cursor: 'pointer', width: 'fit-content' }}
                    >
                      Retry camera scan
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        )}

        {hasToken && (
          <section style={{ background: '#ffffff', borderRadius: 24, padding: 26, boxShadow: '0 10px 30px rgba(15,23,42,0.05)' }}>
            {status === 'loading' && <div style={{ textAlign: 'center', padding: 28 }}>Checking document…</div>}

            {status === 'verified' && result && (
              <div style={{ display: 'grid', gap: 20 }}>
                <div style={{ display: 'grid', gap: 12, textAlign: 'center' }}>
                  <div style={{ width: 80, height: 80, margin: '0 auto', borderRadius: 999, background: '#dcfce7', color: '#166534', display: 'grid', placeItems: 'center', fontSize: 40 }}>✓</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>Verified document</div>
                  <div style={{ color: '#475569' }}>This document is authentic and matches the official DeliveryPortal verification service.</div>
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                    <div style={{ padding: 18, borderRadius: 18, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Document ID</div>
                      <div style={{ color: '#0f172a' }}>{result.report_id}</div>
                    </div>
                    <div style={{ padding: 18, borderRadius: 18, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Reference</div>
                      <div style={{ color: '#0f172a' }}>{result.reference_number}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                    <div style={{ padding: 18, borderRadius: 18, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Category</div>
                      <div style={{ color: '#0f172a' }}>{result.report_category}</div>
                    </div>
                    <div style={{ padding: 18, borderRadius: 18, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Verified</div>
                      <div style={{ color: '#0f172a' }}>{formatDate(result.verification_timestamp)}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ padding: 18, borderRadius: 18, border: '1px solid #d1fae5', background: '#ecfdf5', color: '#166534' }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Integrity check</div>
                    <div>{result.fingerprint_matched ? 'Document fingerprint matches the official audit record.' : 'Document fingerprint could not be fully verified.'}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDetails((current) => !current)}
                    style={{ borderRadius: 12, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', padding: '12px 16px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {showDetails ? 'Hide verification details' : 'Show verification details'}
                  </button>

                  {showDetails && (
                    <div style={{ padding: 18, borderRadius: 18, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a' }}>
                      <div style={{ display: 'grid', gap: 10 }}>
                        <div><strong>Verification ID:</strong> {result.verification_id}</div>
                        <div><strong>Document Type:</strong> {result.document_type ?? 'N/A'}</div>
                        <div><strong>Generated by role:</strong> {result.generated_by_role ?? 'N/A'}</div>
                        <div><strong>Verification timestamp:</strong> {formatDate(result.verification_timestamp)}</div>
                        <div style={{ color: '#475569', fontSize: 13 }}>This page presents the authoritative verification outcome from the DeliveryPortal audit service.</div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => navigate('/verify')}
                      style={{ borderRadius: 12, padding: '12px 18px', border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Verify another document
                    </button>
                  </div>
                </div>
              </div>
            )}

            {status !== 'verified' && status !== 'loading' && (
              <div style={{ display: 'grid', gap: 20, textAlign: 'center', padding: 28 }}>
                <div style={{ fontSize: 38, color: status === 'not_found' ? '#ef4444' : '#f59e0b' }}>{status === 'not_found' ? '✕' : '⚠'}</div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{status === 'not_found' ? 'Document not found' : 'Verification issue'}</div>
                  <div style={{ color: '#475569', marginTop: 8 }}>{error ?? 'The verification service could not validate this document.'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/verify')}
                  style={{ borderRadius: 12, padding: '12px 18px', border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Scan another document
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
