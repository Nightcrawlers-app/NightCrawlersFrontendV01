import { useEffect, useState } from 'react';
import { getAppConfig } from '../services/api';
import type { AppConfig } from '../types/models';

/**
 * Server settings (fees, whether a verified phone is required, whether online
 * payment is on). Fetched once per page load and shared by every component.
 * Until it arrives — or if it fails — the safe defaults below are used.
 */
const DEFAULTS: AppConfig = {
    requirePhoneVerification: true,
    onlinePayments: false,
    paystackTestMode: false,
    delivery: { baseFee: 500, perKm: 150, includedKm: 2, minFee: 500, maxFee: 3000, maxKm: 20 },
    serviceFeePercent: 5,
};

let cached: AppConfig | null = null;
let inflight: Promise<AppConfig> | null = null;

const load = () => {
    if (!inflight) {
        inflight = getAppConfig()
            .then((c) => (cached = { ...DEFAULTS, ...c }))
            .catch(() => {
                inflight = null; // try again next time
                return DEFAULTS;
            });
    }
    return inflight;
};

export function useAppConfig(): AppConfig {
    const [config, setConfig] = useState<AppConfig>(cached ?? DEFAULTS);
    useEffect(() => {
        if (cached) return;
        let alive = true;
        load().then((c) => alive && setConfig(c));
        return () => {
            alive = false;
        };
    }, []);
    return config;
}
