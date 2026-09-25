import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, Clock, ChevronRight, Upload } from 'lucide-react';
import { apiFetch } from '../../lib/apiClient';
import { toErrorMessage } from '../../services/api';
import SmileIDVerification from '../../components/kyc/SmileIDVerification';

type Role = 'vendor' | 'rider';

interface KycStatus {
  kycStatus: 'pending' | 'in_progress' | 'passed' | 'failed';
  vendorType?: 'formal' | 'informal';
  checks?: Record<string, { verified: boolean; submitted?: boolean }>;
  paths?: {
    agentPath: { completed: boolean; checks: Record<string, { verified: boolean }> };
    digitalPath: { completed: boolean; checks: Record<string, { verified: boolean }> };
  };
  allPassed: boolean;
}

interface KycOnboardingProps {
  role: Role;
  userId: string;
  firstName: string;
  lastName: string;
}

type Step = 'type' | 'nin' | 'cac' | 'tin' | 'license' | 'selfie' | 'address' | 'terms' | 'done';

const StepIndicator = ({ done, active, label }: { done: boolean; active: boolean; label: string }) => (
  <div className={`flex items-center gap-2 text-sm ${done ? 'text-green-600' : active ? 'text-[#C62222]' : 'text-gray-400'}`}>
    {done
      ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
      : active
        ? <div className="w-5 h-5 rounded-full border-2 border-[#C62222] flex-shrink-0" />
        : <Circle className="w-5 h-5 flex-shrink-0" />
    }
    <span className={done ? 'line-through' : ''}>{label}</span>
  </div>
);

export const KycOnboarding: React.FC<KycOnboardingProps> = ({ role, userId, firstName, lastName }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('type');
  const [isInformal, setIsInformal] = useState<boolean | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nin: '',
    rcNumber: '',
    tin: '',
    licenseNumber: '',
    dateOfBirth: '',
    documentUrl: '',
    termsVersion: 'v1.0',
  });

  const fetchKycStatus = async () => {
    try {
      const path = role === 'vendor' ? '/api/vendors/me/kyc' : '/api/riders/me/kyc';
      const status = await apiFetch<KycStatus>(path);
      setKycStatus(status);
      if (status.allPassed) setStep('done');
    } catch {
      // ignore — we'll try again on next action
    }
  };

  useEffect(() => {
    fetchKycStatus();
    // set initial step for riders (no type selection needed)
    if (role === 'rider') setStep('nin');
  }, [role]);

  const post = async (path: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError('');
    try {
      await apiFetch(path, { method: 'POST', body });
      await fetchKycStatus();
      return true;
    } catch (err) {
      setError(toErrorMessage(err));
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ── Step handlers ──────────────────────────────────────────────────────────

  const handleDeclare = async (informal: boolean) => {
    setIsInformal(informal);
    const ok = await post('/api/vendors/me/kyc/declare', { isInformalVendor: informal });
    if (ok) setStep(informal ? 'nin' : 'cac');
  };

  const handleNIN = async () => {
    const path = role === 'vendor' ? '/api/vendors/me/kyc/nin' : '/api/riders/me/kyc/nin';
    const ok = await post(path, { nin: form.nin });
    if (ok) {
      if (role === 'rider') setStep('license');
      else setStep(isInformal ? 'selfie' : 'cac');
    }
  };

  const handleCAC = async () => {
    const ok = await post('/api/vendors/me/kyc/cac', { rcNumber: form.rcNumber });
    if (ok) setStep('tin');
  };

  const handleTIN = async () => {
    const ok = await post('/api/vendors/me/kyc/tin', { tin: form.tin });
    if (ok) setStep('done');
  };

  const handleLicense = async () => {
    const ok = await post('/api/riders/me/kyc/license', {
      licenseNumber: form.licenseNumber,
      dateOfBirth: form.dateOfBirth,
    });
    if (ok) setStep('selfie');
  };

  const handleAddress = async () => {
    const ok = await post('/api/riders/me/kyc/address', { documentUrl: form.documentUrl });
    if (ok) setStep('done');
  };

  const handleTerms = async () => {
    const ok = await post('/api/vendors/me/kyc/terms', {
      agreed: true,
      termsVersion: form.termsVersion,
    });
    if (ok) setStep('done');
  };

  // ── Shared UI helpers ──────────────────────────────────────────────────────

  const Input = ({ label, name, type = 'text', placeholder }: {
    label: string; name: keyof typeof form; type?: string; placeholder?: string;
  }) => (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        placeholder={placeholder}
        className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-[#C62222]"
      />
    </div>
  );

  const ActionButton = ({ onClick, disabled, label }: {
    onClick: () => void; disabled?: boolean; label: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-3 bg-[#C62222] text-white rounded-lg font-semibold text-sm
                 hover:bg-[#aa1c1c] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? 'Please wait…' : label}
    </button>
  );

  // ── Progress sidebar items ─────────────────────────────────────────────────

  const checks = kycStatus?.checks || {};
  const paths = kycStatus?.paths;

  const vendorFormalSteps = [
    { key: 'cac', label: 'CAC Verification', done: !!checks.cac?.verified },
    { key: 'tin', label: 'TIN Verification', done: !!checks.tin?.verified },
  ];

  const vendorInformalSteps = [
    { key: 'nin', label: 'NIN Verification', done: !!paths?.agentPath.checks.nin?.verified },
    { key: 'selfie', label: 'Selfie & Liveness', done: !!paths?.digitalPath.checks.selfie?.verified },
    { key: 'terms', label: 'Sign T&Cs', done: !!paths?.digitalPath.checks.termsSigned },
  ];

  const riderSteps = [
    { key: 'nin', label: 'NIN Verification', done: !!checks.nin?.verified },
    { key: 'license', label: "Driver's License", done: !!checks.driversLicense?.verified },
    { key: 'selfie', label: 'Selfie & Liveness', done: !!checks.selfie?.verified },
    { key: 'address', label: 'Residential Address', done: !!checks.residentialAddress?.verified },
  ];

  const sidebarSteps = role === 'rider'
    ? riderSteps
    : isInformal
      ? vendorInformalSteps
      : vendorFormalSteps;

  return (
    <div className="min-h-screen bg-gray-50 font-poppins">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Identity Verification</h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete your KYC to get approved and start {role === 'rider' ? 'taking deliveries' : 'receiving orders'}.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar progress */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 h-fit">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Steps</p>
            {role === 'vendor' && (
              <StepIndicator done={isInformal !== null} active={step === 'type'} label="Business Type" />
            )}
            {sidebarSteps.map(s => (
              <StepIndicator key={s.key} done={s.done} active={step === s.key} label={s.label} />
            ))}
          </div>

          {/* Main content */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* VENDOR: declare type */}
            {step === 'type' && role === 'vendor' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-gray-900">Is your business formally registered?</h2>
                <p className="text-sm text-gray-500">
                  This determines which documents we need from you.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => handleDeclare(false)}
                    className="p-4 border-2 border-gray-200 rounded-xl text-left hover:border-[#C62222]
                               hover:bg-[#C62222]/5 transition-all group"
                  >
                    <p className="font-semibold text-gray-900 group-hover:text-[#C62222]">Yes, I have a CAC number</p>
                    <p className="text-xs text-gray-500 mt-1">Formal business — CAC + TIN verification</p>
                  </button>
                  <button
                    onClick={() => handleDeclare(true)}
                    className="p-4 border-2 border-gray-200 rounded-xl text-left hover:border-[#C62222]
                               hover:bg-[#C62222]/5 transition-all group"
                  >
                    <p className="font-semibold text-gray-900 group-hover:text-[#C62222]">No, I'm an informal vendor</p>
                    <p className="text-xs text-gray-500 mt-1">Home kitchen, suya stand etc. — NIN + selfie or agent visit</p>
                  </button>
                </div>
              </div>
            )}

            {/* NIN */}
            {step === 'nin' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-gray-900">NIN Verification</h2>
                <p className="text-sm text-gray-500">Enter your 11-digit National Identification Number.</p>
                <Input label="NIN" name="nin" placeholder="12345678901" />
                <ActionButton onClick={handleNIN} disabled={form.nin.length !== 11} label="Verify NIN →" />
              </div>
            )}

            {/* CAC */}
            {step === 'cac' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-gray-900">CAC Verification</h2>
                <p className="text-sm text-gray-500">Enter your Corporate Affairs Commission RC number.</p>
                <Input label="RC Number" name="rcNumber" placeholder="RC123456 or 123456" />
                <ActionButton onClick={handleCAC} disabled={!form.rcNumber.trim()} label="Verify CAC →" />
              </div>
            )}

            {/* TIN */}
            {step === 'tin' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-gray-900">TIN Verification</h2>
                <p className="text-sm text-gray-500">Enter your Tax Identification Number.</p>
                <Input label="TIN" name="tin" placeholder="12345678-0001" />
                <ActionButton onClick={handleTIN} disabled={!form.tin.trim()} label="Verify TIN →" />
              </div>
            )}

            {/* Driver's License */}
            {step === 'license' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-gray-900">Driver's License</h2>
                <p className="text-sm text-gray-500">We'll verify your license against the FRSC database.</p>
                <Input label="License Number" name="licenseNumber" placeholder="ABC123456789" />
                <Input label="Date of Birth" name="dateOfBirth" type="date" />
                <ActionButton
                  onClick={handleLicense}
                  disabled={!form.licenseNumber.trim() || !form.dateOfBirth}
                  label="Verify License →"
                />
              </div>
            )}

            {/* Selfie / SmileID */}
            {step === 'selfie' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-gray-900">Selfie & Liveness Check</h2>
                <SmileIDVerification
                  role={role}
                  userId={userId}
                  firstName={firstName}
                  lastName={lastName}
                  onSubmitted={() => {
                    if (role === 'rider') setStep('address');
                    else setStep('terms');
                  }}
                  onCancelled={() => setError('Verification was cancelled. Please try again.')}
                />
              </div>
            )}

            {/* Residential Address (riders) */}
            {step === 'address' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-gray-900">Residential Address</h2>
                <p className="text-sm text-gray-500">
                  Upload a recent utility bill (PHCN, water, or similar) showing your name and address.
                  Upload it to a cloud service and paste the URL below.
                </p>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 mb-3">Upload bill to Cloudinary/Firebase, then paste URL</p>
                  <Input label="Document URL" name="documentUrl" placeholder="https://res.cloudinary.com/..." />
                </div>
                <ActionButton
                  onClick={handleAddress}
                  disabled={!form.documentUrl.trim()}
                  label="Submit for Review →"
                />
                <p className="text-xs text-gray-400 text-center">
                  An admin will review your document within 24 hours.
                </p>
              </div>
            )}

            {/* Sign T&Cs (informal vendors, digital path) */}
            {step === 'terms' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-gray-900">Terms & Conditions</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 space-y-2 max-h-48 overflow-y-auto">
                  <p className="font-semibold">NightCrawlers Vendor Agreement v1.0</p>
                  <p>By signing below, you agree to: maintain food hygiene standards, fulfill orders promptly, keep your menu accurate, not engage in fraudulent activity, and comply with Nigerian food safety regulations.</p>
                  <p>NightCrawlers reserves the right to suspend accounts that violate these terms.</p>
                </div>
                <ActionButton onClick={handleTerms} label="I Agree & Sign →" />
              </div>
            )}

            {/* Done */}
            {step === 'done' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">KYC Complete!</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Your identity has been verified. Our team will review your application
                  and approve your account within 24–48 hours.
                </p>
                <button
                  onClick={() => navigate(role === 'rider' ? '/rider-dashboard' : '/vendor-dashboard')}
                  className="flex items-center gap-2 mx-auto py-2 px-6 bg-[#C62222] text-white
                             rounded-lg font-semibold text-sm hover:bg-[#aa1c1c] transition-colors"
                >
                  Go to Dashboard <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Pending status display */}
            {step !== 'done' && kycStatus?.kycStatus === 'in_progress' && (
              <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Some of your checks are pending admin review. You can continue with remaining steps.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KycOnboarding;
