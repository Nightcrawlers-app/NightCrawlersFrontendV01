import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronRight, Phone, FileCheck, XCircle, Loader2 } from 'lucide-react';
import PhoneVerificationModal from './PhoneVerificationModal';
import { useAppConfig } from '../../lib/appConfig';
import { reapplyApplication, toErrorMessage } from '../../services/api';
import type { KycStatus } from '../../types/models';

interface ApprovalChecklistProps {
  role: 'vendor' | 'rider';
  account: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    phoneVerified?: boolean;
    kycStatus?: KycStatus;
    rejectedAt?: string | null;
    rejectionReason?: string | null;
  };
  /** Called after a step completes, so the page can re-fetch the account. */
  onChanged: () => void;
}

const KYC_LABEL: Record<KycStatus, string> = {
  pending: 'Not started',
  in_progress: 'In progress',
  passed: 'Complete',
  failed: 'Needs attention',
};

/**
 * What a vendor/rider must finish before an admin can approve them. Admins
 * can't approve until both are done, so without this the account just sat
 * "pending" with no way for the applicant to know why.
 */
const ApprovalChecklist: React.FC<ApprovalChecklistProps> = ({ role, account, onChanged }) => {
  const navigate = useNavigate();
  const [showPhone, setShowPhone] = useState(false);
  const [reapplying, setReapplying] = useState(false);
  const [reapplyError, setReapplyError] = useState('');
  const { requirePhoneVerification } = useAppConfig();
  const phoneDone = !!account.phoneVerified;
  const kycDone = account.kycStatus === 'passed';

  const rows = [
    {
      key: 'phone',
      icon: <Phone size={16} />,
      title: 'Verify your phone number',
      detail: phoneDone ? account.phoneNumber || 'Verified' : account.phoneNumber ? `Code goes to ${account.phoneNumber}` : 'Add your number',
      done: phoneDone,
      action: () => setShowPhone(true),
    },
    {
      key: 'kyc',
      icon: <FileCheck size={16} />,
      title: role === 'vendor' ? 'Complete business verification (KYC)' : 'Complete identity verification (KYC)',
      detail: KYC_LABEL[account.kycStatus ?? 'pending'],
      done: kycDone,
      action: () =>
        navigate(role === 'vendor' ? '/vendor-kyc' : '/rider-kyc', {
          state: { userId: account.id, firstName: account.firstName, lastName: account.lastName },
        }),
    },
  ];

  // While the phone requirement is switched off on the server, it's optional.
  const required = rows.filter((r) => r.key !== 'phone' || requirePhoneVerification);
  const remaining = required.filter((r) => !r.done).length;

  const reapply = async () => {
    setReapplying(true);
    setReapplyError('');
    try {
      await reapplyApplication(role);
      onChanged();
    } catch (err) {
      setReapplyError(toErrorMessage(err, "Couldn't resubmit your application."));
    } finally {
      setReapplying(false);
    }
  };

  return (
    <div className="text-left mb-6">
      {account.rejectedAt && (
        <div className="mb-4 rounded-xl border border-[#F5C2C2] bg-[#FFF5F5] p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#991B1B]">
            <XCircle size={16} /> Your application wasn't approved
          </p>
          {account.rejectionReason && (
            <p className="mt-1 text-sm text-gray-700">
              <span className="font-medium">Reason:</span> {account.rejectionReason}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">Fix anything needed below, then send it for review again.</p>
          {reapplyError && <p className="mt-2 text-xs text-[#C62222]">{reapplyError}</p>}
          <button
            type="button"
            onClick={reapply}
            disabled={reapplying}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#C62222] text-white text-sm font-semibold rounded-lg hover:bg-[#A01B1B] disabled:opacity-60"
          >
            {reapplying && <Loader2 size={14} className="animate-spin" />} Reapply
          </button>
        </div>
      )}
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
        {remaining ? `${remaining} step${remaining > 1 ? 's' : ''} before we can approve you` : 'All done — waiting for review'}
      </p>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              onClick={r.done ? undefined : r.action}
              disabled={r.done}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${r.done ? 'border-green-200 bg-green-50/60 cursor-default' : 'border-gray-200 hover:border-[#C62222] hover:bg-[#FFF5F5]'}`}
            >
              {r.done ? (
                <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
              ) : (
                <Circle size={20} className="text-gray-300 flex-shrink-0" />
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-gray-900">
                  {r.title}
                  {r.key === 'phone' && !requirePhoneVerification && !r.done && (
                    <span className="ml-1.5 text-[10px] font-medium text-gray-400">(optional for now)</span>
                  )}
                </span>
                <span className="block text-xs text-gray-500 truncate">{r.detail}</span>
              </span>
              {!r.done && <ChevronRight size={16} className="text-gray-400" />}
            </button>
          </li>
        ))}
      </ul>

      {showPhone && (
        <PhoneVerificationModal
          role={role}
          currentPhone={account.phoneNumber}
          onClose={() => setShowPhone(false)}
          onVerified={() => {
            setShowPhone(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
};

export default ApprovalChecklist;
