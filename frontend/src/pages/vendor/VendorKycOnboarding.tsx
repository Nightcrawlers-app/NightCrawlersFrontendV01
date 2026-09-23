import React from 'react';
import { useLocation } from 'react-router-dom';
import KycOnboarding from './KycOnboarding';

const VendorKycOnboarding: React.FC = () => {
  const { state } = useLocation();
  return (
    <KycOnboarding
      role="vendor"
      userId={state?.userId ?? ''}
      firstName={state?.firstName ?? ''}
      lastName={state?.lastName ?? ''}
    />
  );
};

export default VendorKycOnboarding;