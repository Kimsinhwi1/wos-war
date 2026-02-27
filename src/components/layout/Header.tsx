'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Stepper from './Stepper';
import { useStrategyStore } from '@/store/strategy-store';

export default function Header() {
  const { allianceSettings, updateAllianceSettings, renameAllianceInTexts } = useStrategyStore();
  const [showSettings, setShowSettings] = useState(false);
  const prevNameRef = useRef('');

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-xl sm:text-2xl">{'\u2694\uFE0F'}</span>
            <span className="hidden sm:inline">WOS 캐슬전 전략서 생성기</span>
            <span className="sm:hidden">WOS 전략서</span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {allianceSettings.serverNumber} {allianceSettings.allianceName} Alliance {allianceSettings.leaderNickname}
            </span>
            <Link
              href="/calculator"
              className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="전투 교환비 시뮬레이터"
            >
              {'\uD83E\uDDEE'}
            </Link>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="연맹 설정"
            >
              {'\u2699\uFE0F'}
            </button>
          </div>
        </div>
      </div>

      {/* Alliance Settings Panel */}
      {showSettings && (
        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">연맹 설정</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                닫기
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">연맹 이니셜</label>
                <input
                  type="text"
                  value={allianceSettings.allianceName}
                  onFocus={() => { prevNameRef.current = allianceSettings.allianceName; }}
                  onChange={(e) => updateAllianceSettings({ allianceName: e.target.value })}
                  onBlur={() => {
                    const old = prevNameRef.current;
                    if (old && old !== allianceSettings.allianceName) {
                      renameAllianceInTexts(old, allianceSettings.allianceName);
                    }
                  }}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="HAN"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">서버 번호</label>
                <input
                  type="text"
                  value={allianceSettings.serverNumber}
                  onChange={(e) => updateAllianceSettings({ serverNumber: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="#3074"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">리더 닉네임</label>
                <input
                  type="text"
                  value={allianceSettings.leaderNickname}
                  onChange={(e) => updateAllianceSettings({ leaderNickname: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="집냥이"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">파트너 연맹</label>
                <input
                  type="text"
                  value={allianceSettings.partnerAlliance}
                  onFocus={() => { prevNameRef.current = allianceSettings.partnerAlliance; }}
                  onChange={(e) => updateAllianceSettings({ partnerAlliance: e.target.value })}
                  onBlur={() => {
                    const old = prevNameRef.current;
                    if (old && old !== allianceSettings.partnerAlliance) {
                      renameAllianceInTexts(old, allianceSettings.partnerAlliance);
                    }
                  }}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="KOR"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">디스코드 링크</label>
              <input
                type="text"
                value={allianceSettings.discordLink}
                onChange={(e) => updateAllianceSettings({ discordLink: e.target.value })}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                placeholder="https://discord.gg/..."
              />
            </div>
          </div>
        </div>
      )}

      <Stepper />
    </header>
  );
}
