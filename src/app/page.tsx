'use client';

import { useRouter } from 'next/navigation';
import { useStrategyStore } from '@/store/strategy-store';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  const setCurrentStep = useStrategyStore((s) => s.setCurrentStep);

  useEffect(() => {
    setCurrentStep(1);
    router.replace('/members');
  }, [router, setCurrentStep]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-gray-400">Loading...</p>
    </div>
  );
}
