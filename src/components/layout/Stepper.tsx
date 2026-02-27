'use client';

import { cn } from '@/lib/utils';
import { useStrategyStore } from '@/store/strategy-store';
import Link from 'next/link';

const STEPS = [
  { number: 1, label: '멤버 관리', path: '/members' },
  { number: 2, label: '역할 배정', path: '/assignment' },
  { number: 3, label: '집결 설정', path: '/rally' },
  { number: 4, label: '전략 편집', path: '/strategy' },
  { number: 5, label: '미리보기', path: '/preview' },
];

export default function Stepper() {
  const currentStep = useStrategyStore((s) => s.currentStep);

  return (
    <nav className="flex items-center justify-center gap-1 px-4 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      {STEPS.map((step, i) => (
        <div key={step.number} className="flex items-center">
          <Link
            href={step.path}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              currentStep === step.number
                ? 'bg-blue-600 text-white'
                : currentStep > step.number
                  ? 'bg-green-100 dark:bg-green-600/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-600/30'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700',
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                currentStep === step.number
                  ? 'bg-white text-blue-600'
                  : currentStep > step.number
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-400 dark:bg-gray-600 text-white dark:text-gray-300',
              )}
            >
              {currentStep > step.number ? '\u2713' : step.number}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </Link>
          {i < STEPS.length - 1 && (
            <div className={cn(
              'w-4 sm:w-8 h-0.5 mx-0.5 sm:mx-1',
              currentStep > step.number ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
            )} />
          )}
        </div>
      ))}
    </nav>
  );
}
