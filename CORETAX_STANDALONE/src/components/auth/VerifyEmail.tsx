import React, { useEffect, useState } from 'react';
import { InputOTP } from '../ui/input-otp';
import { CheckCircle, RefreshCw } from 'lucide-react';

interface VerifyEmailProps {
  email: string;
  onVerified: () => void;
  onCancel?: () => void;
}

export function VerifyEmail({ email, onVerified, onCancel }: VerifyEmailProps) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle'|'sent'|'verifying'|'verified'|'error'>('idle');
  const [message, setMessage] = useState('');
  const [resendDisabledUntil, setResendDisabledUntil] = useState<number | null>(null);

  useEffect(() => {
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendCode = async () => {
    setStatus('sent');
    setMessage('Mengirim kode...');
    try {
      const res = await fetch('/CORETAX/api/otp.php?action=send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Gagal mengirim kode');
        return;
      }
      setStatus('sent');
      setMessage('Kode verifikasi telah dikirim ke email Anda.');
      // disable resend for 30s
      const until = Date.now() + (30 * 1000);
      setResendDisabledUntil(until);
    } catch (err: any) {
      setStatus('error');
      setMessage('Gagal mengirim kode');
    }
  };

  const verifyCode = async () => {
    setStatus('verifying');
    setMessage('Memverifikasi...');
    try {
      const res = await fetch('/CORETAX/api/otp.php?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Kode tidak valid');
        return;
      }
      setStatus('verified');
      setMessage('Email telah berhasil diverifikasi');
      // Wait a second and call onVerified
      setTimeout(() => {
        onVerified();
      }, 700);
    } catch (err: any) {
      setStatus('error');
      setMessage('Gagal memverifikasi');
    }
  };

  const handleResend = () => {
    if (resendDisabledUntil && Date.now() < resendDisabledUntil) return;
    sendCode();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            {status === 'verified' ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <RefreshCw className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <h2 className="text-gray-900 mb-2">Verifikasi Email</h2>
          <p className="text-gray-600 mb-4">Masukkan kode 6 digit yang dikirim ke <strong>{email}</strong></p>

          <div className="mb-4">
            <InputOTP value={code} onChange={(val: string) => setCode(val)} length={6} />
          </div>

          <div className="mb-4">
            {status === 'error' && (
              <div className="text-red-600">{message}</div>
            )}
            {status === 'sent' && <div className="text-blue-600">{message}</div>}
            {status === 'verifying' && <div className="text-blue-600">{message}</div>}
          </div>

          <div className="flex gap-2 justify-center mb-4">
            <button
              className="bg-green-600 w-full text-white py-2 rounded-lg"
              onClick={verifyCode}
              disabled={status === 'verifying' || code.length !== 6}
            >
              Verifikasi
            </button>
            <button
              className="bg-gray-200 w-full text-gray-900 py-2 rounded-lg"
              onClick={handleResend}
              disabled={resendDisabledUntil && Date.now() < resendDisabledUntil}
            >
              Kirim Ulang
            </button>
          </div>

          <div className="text-sm text-gray-600">
            <button onClick={onCancel} className="text-blue-600 hover:underline">Batalkan</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
