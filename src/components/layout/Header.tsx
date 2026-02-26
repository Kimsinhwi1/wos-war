'use client';

import Stepper from './Stepper';

export default function Header() {
  return (
    <header className="sticky top-0 z-50">
      <div className="bg-gray-950 border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl sm:text-2xl">{'\u2694\uFE0F'}</span>
            <span className="hidden sm:inline">WOS 캐슬전 전략서 생성기</span>
            <span className="sm:hidden">WOS 전략서</span>
          </h1>
          <span className="text-xs text-gray-500">#3074 HAN Alliance 집냥이</span>
        </div>
      </div>
      <Stepper />
    </header>
  );
}
