'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────
interface Stats {
  atk: number;
  def: number;
  lethality: number;
  hp: number;
}

interface TroopRatio {
  infantry: number;
  lancer: number;
  marksman: number;
}

type Side = 'attack' | 'defense';

// ── Tactical Recommendation Data ──────────────────────
const TACTICAL_TIERS = [
  {
    id: 'dominant',
    minRatio: 1.2,
    color: 'green' as const,
    emoji: '🟢',
    titleKo: '단독 집결 돌파 가능',
    titleEn: 'Solo Rally Breakthrough',
    guideKo:
      '적과 체급 차이가 납니다. 단일 집결만으로도 확정적으로 적의 방어선을 붕괴시킬 수 있습니다.',
    setupKo:
      "공격 대장의 첫 칸 영웅을 '제시' 또는 '서윤'으로 고정하세요. 타격 극대화를 위해 방패:창:궁 비율을 1.5 : 1 : 1 정도로 세팅해도 무방합니다.",
  },
  {
    id: 'even',
    minRatio: 0.8,
    color: 'yellow' as const,
    emoji: '🟡',
    titleKo: '정면 승부 - 진형 유지와 영웅 스위칭',
    titleEn: 'Head-on Fight - Formation & Hero Switching',
    guideKo:
      '비슷한 스펙입니다. 수성 시에는 방패병 소모가 극심하므로, 방패병 비율을 최소 50~60%(2:1:1 또는 3:1:1)로 세팅하여 1열 유지력을 확보하세요.',
    setupKo:
      "수성 시 첫 칸 영웅은 체력 버프가 있는 '패트릭'을 적극 기용하세요 (필리는 데미지 감소 버프를 덮어씌우므로 1명 이하로 통제). 집결 참여자의 불의수정 레벨을 최대한 높게 통제해야 합니다.",
  },
  {
    id: 'disadvantage',
    minRatio: 0.5,
    color: 'orange' as const,
    emoji: '🟠',
    titleKo: "정면 돌파 불가 - '연속 타격(다중 랠리)' 전술 요망",
    titleEn: 'No Frontal Breakthrough - Multi-Rally Tactic Required',
    guideKo:
      "단일 타격으로는 절대 뚫을 수 없습니다. 상대의 방패병 비율을 강제로 무너뜨리는 '연속 타격' 전술을 사용하세요.",
    setupKo:
      '서브 집결장이 먼저 공격(1차 타격)하여 적의 방패병을 소진시킨 직후, 5초 이내의 시차로 가장 강한 메인 집결장이 본대(2차 타격)를 꽂아 넣어 진형을 파괴해야 합니다.',
  },
  {
    id: 'critical',
    minRatio: 0,
    color: 'red' as const,
    emoji: '🔴',
    titleKo: "체급 극복 - 2개 연맹 연계 '카운터 랠리' 필수",
    titleEn: 'Weight Class Gap - Dual Alliance Counter Rally Required',
    guideKo:
      "스펙이 너무 밀려 일반적인 공수 교대가 불가능합니다. 서브 연맹을 활용한 '카운터 랠리(교차 집결)' 전술을 준비하세요.",
    setupKo:
      '적이 우리 건물을 점령하도록 유도하십시오. 점령 직후는 수성 영웅이 미적용되고 방패병이 소진된 가장 취약한 상태입니다. 적 집결이 도착하기 전에 미리 시간을 계산하여, 적 도착 후 5초 뒤에 우리 서브 연맹의 집결 타격이 들어가도록 설계해 즉시 탈환해야 합니다.',
  },
];

// ── Color mapping ─────────────────────────────────────
const TIER_STYLES = {
  green: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-400 dark:border-green-600',
    title: 'text-green-700 dark:text-green-400',
    badge: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
    gauge: 'bg-green-500',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-400 dark:border-yellow-600',
    title: 'text-yellow-700 dark:text-yellow-400',
    badge: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
    gauge: 'bg-yellow-500',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-400 dark:border-orange-600',
    title: 'text-orange-700 dark:text-orange-400',
    badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300',
    gauge: 'bg-orange-500',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-400 dark:border-red-600',
    title: 'text-red-700 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
    gauge: 'bg-red-500',
  },
};

// ── Helper: clamp ─────────────────────────────────────
function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ── Stat Input Component ──────────────────────────────
function StatInput({
  label,
  value,
  onChange,
  suffix = '%',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 w-20 shrink-0">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm text-gray-900 dark:text-white text-right"
        min={0}
        max={999}
      />
      <span className="text-xs text-gray-400 shrink-0">{suffix}</span>
    </div>
  );
}

// ── Troop Ratio Slider Component ──────────────────────
function TroopSlider({
  label,
  emoji,
  value,
  color,
  onChange,
}: {
  label: string;
  emoji: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {emoji} {label}
        </span>
        <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--slider-color) ${value}%, #d1d5db ${value}%)`,
          // @ts-expect-error CSS custom property
          '--slider-color':
            color === 'red'
              ? '#ef4444'
              : color === 'green'
                ? '#22c55e'
                : '#3b82f6',
        }}
      />
    </div>
  );
}

// ── Side Panel Component ──────────────────────────────
function SidePanel({
  title,
  theme,
  stats,
  setStats,
  ratio,
  setRatio,
  side,
  setSide,
}: {
  title: string;
  theme: 'blue' | 'red';
  stats: Stats;
  setStats: (s: Stats) => void;
  ratio: TroopRatio;
  setRatio: (r: TroopRatio) => void;
  side: Side;
  setSide: (s: Side) => void;
}) {
  const borderColor = theme === 'blue' ? 'border-blue-300 dark:border-blue-700' : 'border-red-300 dark:border-red-700';
  const bgColor = theme === 'blue' ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-red-50 dark:bg-red-950/30';
  const headerColor = theme === 'blue' ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400';
  const dot = theme === 'blue' ? '🔵' : '🔴';

  const handleRatioChange = useCallback(
    (field: keyof TroopRatio, newValue: number) => {
      newValue = clamp(newValue, 0, 100);
      const others = (Object.keys(ratio) as (keyof TroopRatio)[]).filter((k) => k !== field);
      const remaining = 100 - newValue;
      const otherSum = others.reduce((sum, k) => sum + ratio[k], 0);

      const updated = { ...ratio, [field]: newValue };

      if (otherSum === 0) {
        const each = Math.floor(remaining / others.length);
        const extra = remaining - each * others.length;
        others.forEach((k, i) => {
          updated[k] = each + (i === 0 ? extra : 0);
        });
      } else {
        let distributed = 0;
        others.forEach((k, i) => {
          if (i === others.length - 1) {
            updated[k] = remaining - distributed;
          } else {
            const proportion = ratio[k] / otherSum;
            const val = Math.round(remaining * proportion);
            updated[k] = val;
            distributed += val;
          }
        });
      }

      (Object.keys(updated) as (keyof TroopRatio)[]).forEach((k) => {
        updated[k] = Math.max(0, updated[k]);
      });

      setRatio(updated);
    },
    [ratio, setRatio],
  );

  return (
    <div className={`rounded-lg border-2 ${borderColor} ${bgColor} p-4 space-y-4`}>
      <h3 className={`text-base font-bold ${headerColor} flex items-center gap-2`}>
        {dot} {title}
      </h3>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          스탯 설정
        </p>
        <StatInput label="ATK (공격)" value={stats.atk} onChange={(v) => setStats({ ...stats, atk: v })} />
        <StatInput label="DEF (방어)" value={stats.def} onChange={(v) => setStats({ ...stats, def: v })} />
        <StatInput
          label="치명타"
          value={stats.lethality}
          onChange={(v) => setStats({ ...stats, lethality: v })}
        />
        <StatInput label="HP (체력)" value={stats.hp} onChange={(v) => setStats({ ...stats, hp: v })} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          병종 비율 (합계: {ratio.infantry + ratio.lancer + ratio.marksman}%)
        </p>
        <TroopSlider
          label="방패(보병)"
          emoji="🛡️"
          value={ratio.infantry}
          color="red"
          onChange={(v) => handleRatioChange('infantry', v)}
        />
        <TroopSlider
          label="창병"
          emoji="🔱"
          value={ratio.lancer}
          color="green"
          onChange={(v) => handleRatioChange('lancer', v)}
        />
        <TroopSlider
          label="궁병"
          emoji="🏹"
          value={ratio.marksman}
          color="blue"
          onChange={(v) => handleRatioChange('marksman', v)}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setSide('attack')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            side === 'attack'
              ? 'bg-red-500 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          🗡️ 공격
        </button>
        <button
          onClick={() => setSide('defense')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            side === 'defense'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          🛡️ 수비
        </button>
      </div>
    </div>
  );
}

// ── Main Calculator Page ──────────────────────────────
export default function CalculatorPage() {
  const router = useRouter();

  const [allyStats, setAllyStats] = useState<Stats>({ atk: 100, def: 100, lethality: 100, hp: 100 });
  const [allyRatio, setAllyRatio] = useState<TroopRatio>({ infantry: 40, lancer: 30, marksman: 30 });
  const [allySide, setAllySide] = useState<Side>('attack');

  const [enemyStats, setEnemyStats] = useState<Stats>({ atk: 100, def: 100, lethality: 100, hp: 100 });
  const [enemyRatio, setEnemyRatio] = useState<TroopRatio>({ infantry: 40, lancer: 30, marksman: 30 });
  const [enemySide, setEnemySide] = useState<Side>('defense');

  const handleAllySideChange = useCallback(
    (s: Side) => {
      setAllySide(s);
      setEnemySide(s === 'attack' ? 'defense' : 'attack');
    },
    [],
  );
  const handleEnemySideChange = useCallback(
    (s: Side) => {
      setEnemySide(s);
      setAllySide(s === 'attack' ? 'defense' : 'attack');
    },
    [],
  );

  const result = useMemo(() => {
    const myStrike = (allyStats.atk / 100) * (allyStats.lethality / 100);
    const myDefense = (allyStats.def / 100) * (allyStats.hp / 100);
    const enemyStrike = (enemyStats.atk / 100) * (enemyStats.lethality / 100);
    const enemyDefense = (enemyStats.def / 100) * (enemyStats.hp / 100);

    const ratio =
      allySide === 'attack'
        ? enemyDefense > 0 ? myStrike / enemyDefense : 99
        : enemyStrike > 0 ? myDefense / enemyStrike : 99;

    const tier = TACTICAL_TIERS.find((t) => ratio >= t.minRatio) ?? TACTICAL_TIERS[TACTICAL_TIERS.length - 1];

    return { myStrike, myDefense, enemyStrike, enemyDefense, ratio, tier };
  }, [allyStats, enemyStats, allySide]);

  const gaugePercent = clamp((result.ratio / (result.ratio + 1)) * 100, 5, 95);
  const style = TIER_STYLES[result.tier.color];

  return (
    <div className="space-y-6 pb-12">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="text-2xl">{'⚔️'}</span>
          <span className="hidden sm:inline">전투 교환비 시뮬레이터</span>
          <span className="sm:hidden">전투 계산기</span>
        </h2>
        <button
          onClick={() => router.back()}
          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          {'←'} 돌아가기
        </button>
      </div>

      {/* 입력 패널 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SidePanel
          title="아군 (Ally)"
          theme="blue"
          stats={allyStats}
          setStats={setAllyStats}
          ratio={allyRatio}
          setRatio={setAllyRatio}
          side={allySide}
          setSide={handleAllySideChange}
        />
        <SidePanel
          title="적군 (Enemy)"
          theme="red"
          stats={enemyStats}
          setStats={setEnemyStats}
          ratio={enemyRatio}
          setRatio={setEnemyRatio}
          side={enemySide}
          setSide={handleEnemySideChange}
        />
      </div>

      {/* 결과 섹션 */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 space-y-5">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          {'📊'} 전투 교환비 결과
        </h3>

        {/* 게이지 바 */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{'🔵'} 아군</span>
            <span>{'🔴'} 적군</span>
          </div>
          <div className="relative h-8 bg-red-200 dark:bg-red-900/40 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 ${style.gauge} rounded-full transition-all duration-500 ease-out`}
              style={{ width: `${gaugePercent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-white drop-shadow-md">
                {result.ratio.toFixed(2)} : 1
              </span>
            </div>
          </div>
        </div>

        {/* 유효 수치 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-500 dark:text-blue-400 mb-1">
              {allySide === 'attack' ? '아군 유효 타격' : '아군 유효 방어'}
            </p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {allySide === 'attack'
                ? (result.myStrike * 100).toFixed(1)
                : (result.myDefense * 100).toFixed(1)}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 text-center">
            <p className="text-xs text-red-500 dark:text-red-400 mb-1">
              {allySide === 'attack' ? '적군 유효 방어' : '적군 유효 타격'}
            </p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">
              {allySide === 'attack'
                ? (result.enemyDefense * 100).toFixed(1)
                : (result.enemyStrike * 100).toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* 전술 추천 카드 */}
      <div className={`rounded-lg border-2 ${style.border} ${style.bg} p-5 space-y-4`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{result.tier.emoji}</span>
          <div>
            <h4 className={`text-base font-bold ${style.title}`}>{result.tier.titleKo}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{result.tier.titleEn}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white/70 dark:bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
              {'📋'} 전술 가이드
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              {result.tier.guideKo}
            </p>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
              {result.tier.id === 'disadvantage' || result.tier.id === 'critical'
                ? '🎯 실행 방법'
                : '🦸 영웅/병종 세팅'}
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              {result.tier.setupKo}
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${style.badge}`}>
            교환비 {result.ratio.toFixed(2)} : 1
          </span>
        </div>
      </div>

      {/* 계산 공식 참고 */}
      <details className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <summary className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
          {'📖'} 계산 공식 참고
        </summary>
        <div className="mt-3 space-y-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
          <p>Effective Strike = ATK(%) × Lethality(%)</p>
          <p>Effective Defense = DEF(%) × HP(%)</p>
          <p>Damage Ratio = My Strike / Enemy Defense</p>
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <p>{'🟢'} {'>'} 1.2 : 단독 돌파 가능</p>
            <p>{'🟡'} 0.8 ~ 1.2 : 호각 (진형 유지)</p>
            <p>{'🟠'} 0.5 ~ 0.8 : 불리 (다중 랠리)</p>
            <p>{'🔴'} {'<'} 0.5 : 매우 불리 (카운터 랠리)</p>
          </div>
        </div>
      </details>
    </div>
  );
}
