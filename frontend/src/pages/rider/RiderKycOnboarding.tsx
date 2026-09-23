import React from 'react';
import { useLocation } from 'react-router-dom';
import KycOnboarding from '../vendor/KycOnboarding';

const RiderKycOnboarding: React.FC = () => {
  const { state } = useLocation();
  return (
    <KycOnboarding
      role="rider"
      userId={state?.userId ?? ''}
      firstName={state?.firstName ?? ''}
      lastName={state?.lastName ?? ''}
    />
  );
};

export default RiderKycOnboarding;