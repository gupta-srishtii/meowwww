'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { FallbackStorybookView } from '@/components/ui/FallbackStorybookView';
import { checkWebGL2Support } from '@/lib/webgl';

const Experience = dynamic(() => import('@/components/canvas/Experience'), {
  ssr: false,
  loading: () => <LoadingScreen status="Loading 3D Canvas..." />,
});

type WebGL2Status = 'checking' | 'supported' | 'unsupported';

export default function ExperienceWrapper() {
  const [webgl2Status, setWebgl2Status] = useState<WebGL2Status>('checking');

  useEffect(() => {
    setWebgl2Status(checkWebGL2Support() ? 'supported' : 'unsupported');
  }, []);

  if (webgl2Status === 'checking') {
    return <LoadingScreen status="Checking WebGL2 support..." />;
  }

  if (webgl2Status === 'unsupported') {
    return <FallbackStorybookView />;
  }

  return <Experience />;
}

