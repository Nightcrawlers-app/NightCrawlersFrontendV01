import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';

interface SmileIDVerificationProps {
  /** 'vendor' or 'rider' — determines partner_params.job_type sent to SmileID */
  role: 'vendor' | 'rider';
  /** The logged-in user's ID — sent as partner_params.user_id so the webhook knows who this is */
  userId: string;
  /** User's first + last name — pre-fills SmileID's user details screen */
  firstName: string;
  lastName: string;
  /** Called when SmileID submits the job successfully (job queued, not yet verified) */
  onSubmitted?: (jobId: string) => void;
  /** Called if the user closes the modal or an error occurs */
  onCancelled?: () => void;
}

declare global {
  interface Window {
    SmileIdentity?: (config: Record<string, unknown>) => void;
  }
}

const SMILEID_SDK_URL = 'https://cdn.usesmileid.com/inline/v12/js/script.min.js';

/**
 * SmileID Biometric KYC component — Web SDK v12.
 *
 * Flow:
 * 1. Loads the SmileID hosted SDK script from their CDN
 * 2. Calls our backend to mint a short-lived token (keeps API key off the browser)
 * 3. Opens SmileID's hosted verification modal (consent → selfie → liveness)
 * 4. SmileID posts the verdict to our backend webhook (/api/kyc/smileid/callback)
 * 5. onSubmitted fires in the browser once the job is accepted (not yet verified)
 *
 * The actual selfieVerified=true update happens when the webhook fires — not here.
 * Show the user a "verification pending" message after onSubmitted.
 */
export const SmileIDVerification: React.FC<SmileIDVerificationProps> = ({
  role,
  userId,
  firstName,
  lastName,
  onSubmitted,
  onCancelled,
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'submitted' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Load the SmileID SDK script once
  useEffect(() => {
    if (document.getElementById('smileid-sdk')) return; // already loaded

    const script = document.createElement('script');
    script.id = 'smileid-sdk';
    script.src = SMILEID_SDK_URL;
    script.async = true;
    document.head.appendChild(script);
    scriptRef.current = script;

    return () => {
      // Don't remove the script on unmount — it may be reused if the component remounts
    };
  }, []);

  const startVerification = async () => {
    setStatus('loading');
    setErrorMessage('');

    try {
      // 1. Mint a token from our backend
      const { token } = await apiFetch<{ token: string }>('/api/kyc/smileid/token', {
        method: 'POST',
      });

      // 2. Wait for SDK to be ready
      const waitForSDK = (): Promise<void> =>
        new Promise((resolve, reject) => {
          const MAX_WAIT = 10000;
          const start = Date.now();
          const poll = setInterval(() => {
            if (typeof window.SmileIdentity === 'function') {
              clearInterval(poll);
              resolve();
            } else if (Date.now() - start > MAX_WAIT) {
              clearInterval(poll);
              reject(new Error('SmileID SDK failed to load. Please refresh and try again.'));
            }
          }, 100);
        });

      await waitForSDK();

      // 3. Open the SmileID verification modal
      setStatus('ready');

      window.SmileIdentity!({
        // Auth
        token,

        // Your identity in the flow
        partner_details: {
          name: 'NightCrawlers',
          logo_url: `${window.location.origin}/favicon.png`,
          partner_id: import.meta.env.VITE_SMILEID_PARTNER_ID,
          policy_url: `${window.location.origin}/privacy-policy`,
          theme_color: '#C62222',
        },

        // The verification product
        product: 'biometric_kyc',

        // Pre-fill user details so they don't have to type their name twice
        user_details: {
          name: `${firstName} ${lastName}`.trim(),
        },

        // NIN verification for Nigerian users
        id_info: {
          country: 'NG',
          id_type: 'NIN',
        },

        // Partner params come back in the webhook so we know who this is
        partner_params: {
          user_id: userId,
          job_type: role,
        },

        // Browser callbacks — carry submission status only, not the verdict.
        // The actual verification result arrives at the backend webhook.
        onResult: (result: { status: string; job_id?: string }) => {
          if (result.status === 'success') {
            setStatus('submitted');
            onSubmitted?.(result.job_id || '');
          } else {
            setStatus('error');
            setErrorMessage('Verification was not completed. Please try again.');
            onCancelled?.();
          }
        },

        onError: (error: { message?: string }) => {
          setStatus('error');
          setErrorMessage(error?.message || 'An error occurred during verification.');
          onCancelled?.();
        },

        // Where the SDK renders its container
        // If omitted it opens as a full-screen modal
        ...(containerRef.current ? { container: containerRef.current } : {}),
      });
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (status === 'submitted') {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Selfie submitted!</h3>
        <p className="text-sm text-gray-500">
          Your liveness check is being processed. This usually takes a few minutes.
          You'll be notified once your verification is complete.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* SDK renders here when container prop is passed */}
      <div ref={containerRef} />

      {status === 'idle' && (
        <div className="text-center py-6 px-4">
          <div className="w-16 h-16 bg-[#C62222]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#C62222]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Selfie & Liveness Check</h3>
          <p className="text-sm text-gray-500 mb-6">
            We need to take a quick selfie to verify your identity. This is powered by SmileID
            and takes about 30 seconds. Make sure you're in a well-lit area.
          </p>
          <button
            onClick={startVerification}
            className="w-full py-3 bg-[#C62222] text-white rounded-lg font-semibold text-sm
                       hover:bg-[#aa1c1c] transition-colors"
          >
            Start Verification
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-[#C62222] border-t-transparent rounded-full
                          animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Opening verification…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-6 px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-red-600 mb-4">{errorMessage}</p>
          <button
            onClick={() => { setStatus('idle'); setErrorMessage(''); }}
            className="py-2 px-6 border border-[#C62222] text-[#C62222] rounded-lg text-sm
                       font-medium hover:bg-[#C62222]/5 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default SmileIDVerification;