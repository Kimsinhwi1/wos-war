'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStrategyStore } from '@/store/strategy-store';
import { RALLY_COLORS, HEROES, getHeroName, DEFAULT_COUNTER_MATRIX, DEFAULT_JOINER_EFFECTS } from '@/lib/constants';
import { formatTroopRatio } from '@/lib/utils';
import type { RallyType, RallyTypeId, RallyLeaderSlot } from '@/lib/types';

export default function RallyPage() {
  const router = useRouter();
  const { rallyConfigs, updateRallyConfig, resetRallyDefaults, setCurrentStep } = useStrategyStore();

  useEffect(() => {
    setCurrentStep(3);
  }, [setCurrentStep]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Step 3: 집결 설정</h2>
        <button
          onClick={resetRallyDefaults}
          className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700"
        >
          기본값 복원
        </button>
      </div>

      {/* Counter System */}
      <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
        <h3 className="font-semibold mb-2">병종 상성</h3>
        <p className="text-xs sm:text-sm text-gray-400 mb-3">
          방패(보병) &rarr; 궁병(마크스맨) &rarr; 창병(랜서) &rarr; 방패
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEFAULT_COUNTER_MATRIX.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 text-xs sm:text-sm p-2 bg-gray-800 rounded">
              <span className="text-red-400">{entry.enemyCompKo} ({entry.enemyRatio})</span>
              <span className="text-gray-500">&rarr;</span>
              <span className="text-green-400">{entry.ourResponseKo} ({entry.ourRatio})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rally Type Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
        {rallyConfigs.map((rally) => (
          <RallyTypeCard
            key={rally.id}
            rally={rally}
            onUpdateRatio={(field, value) => {
              updateRallyConfig(rally.id, {
                troopRatio: { ...rally.troopRatio, [field]: value },
              });
            }}
            onUpdateLeader={(slot, heroId) => {
              updateRallyConfig(rally.id, {
                leaderComposition: { ...rally.leaderComposition, [slot]: heroId },
              });
            }}
            onUpdateJoiners={(joinerHeroes) => {
              updateRallyConfig(rally.id, { joinerHeroes });
            }}
          />
        ))}
      </div>

      {/* Joiner Effects */}
      <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
        <h3 className="font-semibold mb-3">집결원 영웅 효과</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="text-gray-400 text-left">
                <th className="pb-2">상황</th>
                <th className="pb-2">영웅</th>
                <th className="pb-2">효과</th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_JOINER_EFFECTS.map((effect, i) => (
                <tr key={i} className="border-t border-gray-800">
                  <td className="py-2">{effect.situationKo}</td>
                  <td className="py-2">{getHeroName(effect.heroId, 'ko')}</td>
                  <td className="py-2 text-gray-300">{effect.effectKo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => { setCurrentStep(2); router.push('/assignment'); }}
          className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
        >
          &larr; 이전
        </button>
        <button
          onClick={() => { setCurrentStep(4); router.push('/strategy'); }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          다음: 전략 편집 &rarr;
        </button>
      </div>
    </div>
  );
}

function RallyTypeCard({
  rally,
  onUpdateRatio,
  onUpdateLeader,
  onUpdateJoiners,
}: {
  rally: RallyType;
  onUpdateRatio: (field: 'infantry' | 'lancer' | 'marksman', value: number) => void;
  onUpdateLeader: (slot: 'hero1Id' | 'hero2Id' | 'hero3Id', heroId: string) => void;
  onUpdateJoiners: (joinerHeroes: string[]) => void;
}) {
  const colors = RALLY_COLORS[rally.color];
  const total = rally.troopRatio.infantry + rally.troopRatio.lancer + rally.troopRatio.marksman;
  const [isEditing, setIsEditing] = useState(false);

  const joinerHeroOptions = HEROES.filter((h) => h.joinerEffect);

  return (
    <div className={`p-3 sm:p-4 rounded-lg border ${colors.border} ${colors.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`font-semibold ${colors.text}`}>
          {colors.emoji} {rally.labelKo}
        </h4>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-gray-400 hover:text-gray-300"
        >
          {isEditing ? '완료' : '편집'}
        </button>
      </div>

      {/* Leader Composition */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1">집결장 영웅</p>
        {isEditing ? (
          <div className="space-y-1">
            {(['hero1Id', 'hero2Id', 'hero3Id'] as const).map((slot, i) => (
              <select
                key={slot}
                value={rally.leaderComposition[slot]}
                onChange={(e) => onUpdateLeader(slot, e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs sm:text-sm text-gray-200"
              >
                {HEROES.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nameKo} ({h.heroClass === 'infantry' ? '보병' : h.heroClass === 'lancer' ? '창병' : '궁병'})
                  </option>
                ))}
              </select>
            ))}
          </div>
        ) : (
          <p className="text-xs sm:text-sm font-medium text-gray-100">
            {getHeroName(rally.leaderComposition.hero1Id, 'ko')} /{' '}
            {getHeroName(rally.leaderComposition.hero2Id, 'ko')} /{' '}
            {getHeroName(rally.leaderComposition.hero3Id, 'ko')}
          </p>
        )}
      </div>

      {/* Joiner */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1">집결원</p>
        {isEditing ? (
          <div className="space-y-1">
            {rally.joinerHeroes.map((heroId, i) => (
              <div key={i} className="flex items-center gap-1">
                <select
                  value={heroId}
                  onChange={(e) => {
                    const updated = [...rally.joinerHeroes];
                    updated[i] = e.target.value;
                    onUpdateJoiners(updated);
                  }}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs sm:text-sm text-gray-200"
                >
                  {joinerHeroOptions.map((h) => (
                    <option key={h.id} value={h.id}>{h.nameKo}</option>
                  ))}
                </select>
                {rally.joinerHeroes.length > 1 && (
                  <button
                    onClick={() => onUpdateJoiners(rally.joinerHeroes.filter((_, j) => j !== i))}
                    className="text-red-400 text-xs px-1"
                  >
                    X
                  </button>
                )}
              </div>
            ))}
            {rally.joinerHeroes.length < 4 && (
              <button
                onClick={() => {
                  const available = joinerHeroOptions.find((h) => !rally.joinerHeroes.includes(h.id));
                  if (available) onUpdateJoiners([...rally.joinerHeroes, available.id]);
                }}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                + 추가
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-gray-200">
            {rally.joinerHeroes.length === 1
              ? `전원 ${getHeroName(rally.joinerHeroes[0], 'ko')}`
              : rally.joinerHeroes.map((h) => getHeroName(h, 'ko')).join(' / ') + ' 분배'}
          </p>
        )}
      </div>

      {/* Troop Ratio */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400">
          병종 비율: {formatTroopRatio(rally.troopRatio.infantry, rally.troopRatio.lancer, rally.troopRatio.marksman)}
        </p>
        <RatioSlider label="보병" value={rally.troopRatio.infantry} total={total} onChange={(v) => onUpdateRatio('infantry', v)} color="bg-amber-500" />
        <RatioSlider label="창병" value={rally.troopRatio.lancer} total={total} onChange={(v) => onUpdateRatio('lancer', v)} color="bg-emerald-500" />
        <RatioSlider label="궁병" value={rally.troopRatio.marksman} total={total} onChange={(v) => onUpdateRatio('marksman', v)} color="bg-sky-500" />
      </div>

      {/* Counter Info */}
      {rally.counterTo && (
        <p className="mt-3 text-xs text-gray-400">
          카운터 대상: {rally.counterTo === 'offense_anti_spear' ? '방궁 공성' : rally.counterTo === 'defense_anti_archer' ? '방창 수성' : rally.counterTo}
        </p>
      )}
    </div>
  );
}

function RatioSlider({
  label,
  value,
  total,
  onChange,
  color,
}: {
  label: string;
  value: number;
  total: number;
  onChange: (v: number) => void;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-6 sm:w-8 text-gray-300">{label}</span>
      <input
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 h-1.5 accent-blue-500"
      />
      <span className="w-6 text-right text-gray-400">{value}</span>
      <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
