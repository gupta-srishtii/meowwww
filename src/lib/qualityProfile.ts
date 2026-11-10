export type QualityProfile = 'high' | 'balanced' | 'low';

export interface QualityPreset {
  profile: QualityProfile;
  label: string;
  dpr: [number, number] | number;
  shadows: boolean;
  antialias: boolean;
  treeDensity: number;
}

export const QUALITY_PRESETS: Record<QualityProfile, QualityPreset> = {
  high: {
    profile: 'high',
    label: 'High (Desktop)',
    dpr: [1, 2],
    shadows: true,
    antialias: true,
    treeDensity: 120,
  },
  balanced: {
    profile: 'balanced',
    label: 'Balanced (Mobile Cap)',
    dpr: [1, 1.5],
    shadows: false,
    antialias: false,
    treeDensity: 84,
  },
  low: {
    profile: 'low',
    label: 'Low (Battery / Entry)',
    dpr: 1,
    shadows: false,
    antialias: false,
    treeDensity: 48,
  },
};

export function detectIsTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );
}

export function detectInitialQualityProfile(): QualityProfile {
  if (typeof window === 'undefined') return 'balanced';

  const isTouch = detectIsTouchDevice();
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;

  if (deviceMemory !== undefined && deviceMemory <= 2) {
    return 'low';
  }

  if (isTouch || cores <= 4) {
    // Plan §9: All mobile devices (including flagship phones) cap DPR at 1.5 and disable shadow maps.
    return 'balanced';
  }

  return 'high';
}

