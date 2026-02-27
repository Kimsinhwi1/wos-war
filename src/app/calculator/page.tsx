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
  infantry: number; // 방패(보병)
  lancer: number;   // 창병
  marksman: number;  // 궁병
}

type Side = 'attack' | 'defense';

// ── Tactical Recommendation Data ──────────────────────
const TACTICAL_TIERS = [
  {
    id: 'dominant',
    minRatio: 1.2,
    color: 'green' as const,
    emoji: '\uD83D\uDFE2',
    titleKo: '\uB2E8\uB3C5 \uC9D1\uACB0 \uB3CC\uD30C \uAC00\uB2A5',
    titleEn: 'Solo Rally Breakthrough',
    guideKo:
      '\uC801\uACFC \uCCB4\uAE09 \uCC28\uC774\uAC00 \uB0A9\uB2C8\uB2E4. \uB2E8\uC77C \uC9D1\uACB0\uB9CC\uC73C\uB85C\uB3C4 \uD655\uC815\uC801\uC73C\uB85C \uC801\uC758 \uBC29\uC5B4\uC120\uC744 \uBD95\uAD34\uC2DC\uD0AC \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
    setupKo:
      '\uACF5\uACA9 \uB300\uC7A5\uC758 \uCCAB \uCE78 \uC601\uC6C5\uC744 \u2018\uC81C\uC2DC\u2019 \uB610\uB294 \u2018\uC11C\uC724\u2019\uC73C\uB85C \uACE0\uC815\uD558\uC138\uC694. \uD0C0\uACA9 \uADF9\uB300\uD654\uB97C \uC704\uD574 \uBC29\uD328:\uCC3D:\uAD81 \uBE44\uC728\uC744 1.5 : 1 : 1 \uC815\uB3C4\uB85C \uC138\uD305\uD574\uB3C4 \uBB34\uBC29\uD569\uB2C8\uB2E4.',
  },
  {
    id: 'even',
    minRatio: 0.8,
    color: 'yellow' as const,
    emoji: '\uD83D\uDFE1',
    titleKo: '\uC815\uBA74 \uC2B9\uBD80 - \uC9C4\uD615 \uC720\uC9C0\uC640 \uC601\uC6C5 \uC2A4\uC704\uCE6D',
    titleEn: 'Head-on Fight - Formation & Hero Switching',
    guideKo:
      '\uBE44\uC2B7\uD55C \uC2A4\uD399\uC785\uB2C8\uB2E4. \uC218\uC131 \uC2DC\uC5D0\uB294 \uBC29\uD328\uBCD1 \uC18C\uBAA8\uAC00 \uADF9\uC2EC\uD558\uBBC0\uB85C, \uBC29\uD328\uBCD1 \uBE44\uC728\uC744 \uCD5C\uC18C 50~60%(2:1:1 \uB610\uB294 3:1:1)\uB85C \uC138\uD305\uD558\uC5EC 1\uC5F4 \uC720\uC9C0\uB825\uC744 \uD655\uBCF4\uD558\uC138\uC694.',
    setupKo:
      '\uC218\uC131 \uC2DC \uCCAB \uCE78 \uC601\uC6C5\uC740 \uCCB4\uB825 \uBC84\uD504\uAC00 \uC788\uB294 \u2018\uD328\uD2B8\uB9AD\u2019\uC744 \uC801\uADF9 \uAE30\uC6A9\uD558\uC138\uC694 (\uD544\uB9AC\uB294 \uB370\uBBF8\uC9C0 \uAC10\uC18C \uBC84\uD504\uB97C \uB36E\uC5B4\uC50C\uC6B0\uBBC0\uB85C 1\uBA85 \uC774\uD558\uB85C \uD1B5\uC81C). \uC9D1\uACB0 \uCC38\uC5EC\uC790\uC758 \uBD88\uC758\uC218\uC815 \uB808\uBCA8\uC744 \uCD5C\uB300\uD55C \uB192\uAC8C \uD1B5\uC81C\uD574\uC57C \uD569\uB2C8\uB2E4.',
  },
  {
    id: 'disadvantage',
    minRatio: 0.5,
    color: 'orange' as const,
    emoji: '\uD83D\uDFE0',
    titleKo: '\uC815\uBA74 \uB3CC\uD30C \uBD88\uAC00 - \u2018\uC5F0\uC18D \uD0C0\uACA9(\uB2E4\uC911 \uB7A0\uB9AC)\u2019 \uC804\uC220 \uC694\uB9DD',
    titleEn: 'No Frontal Breakthrough - Multi-Rally Tactic Required',
    guideKo:
      '\uB2E8\uC77C \uD0C0\uACA9\uC73C\uB85C\uB294 \uC808\uB300 \uBB3B\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC0C1\uB300\uC758 \uBC29\uD328\uBCD1 \uBE44\uC728\uC744 \uAC15\uC81C\uB85C \uBB34\uB108\uB728\uB9AC\uB294 \u2018\uC5F0\uC18D \uD0C0\uACA9\u2019 \uC804\uC220\uC744 \uC0AC\uC6A9\uD558\uC138\uC694.',
    setupKo:
      '\uC11C\uBE0C \uC9D1\uACB0\uC7A5\uC774 \uBA3C\uC800 \uACF5\uACA9(1\uCC28 \uD0C0\uACA9)\uD558\uC5EC \uC801\uC758 \uBC29\uD328\uBCD1\uC744 \uC18C\uC9C4\uC2DC\uD0A8 \uC9C1\uD6C4, 5\uCD08 \uC774\uB0B4\uC758 \uC2DC\uCC28\uB85C \uAC00\uC7A5 \uAC15\uD55C \uBA54\uC778 \uC9D1\uACB0\uC7A5\uC774 \uBCF8\uB300(2\uCC28 \uD0C0\uACA9)\uB97C \uAF3D\uC544 \uB123\uC5B4 \uC9C4\uD615\uC744 \uD30C\uAD34\uD574\uC57C \uD569\uB2C8\uB2E4.',
  },
  {
    id: 'critical',
    minRatio: 0,
    color: 'red' as const,
    emoji: '\uD83D\uDD34',
    titleKo: '\uCCB4\uAE09 \uADF9\uBCF5 - 2\uAC1C \uC5F0\uB9F9 \uC5F0\uACC4 \u2018\uCE74\uC6B4\uD130 \uB7A0\uB9AC\u2019 \uD544\uC218',
    titleEn: 'Weight Class Gap - Dual Alliance Counter Rally Required',
    guideKo:
      '\uC2A4\uD399\uC774 \uB108\uBB34 \uBC00\uB824 \uC77C\uBC18\uC801\uC778 \uACF5\uC218 \uAD50\uB300\uAC00 \uBD88\uAC00\uB2A5\uD569\uB2C8\uB2E4. \uC11C\uBE0C \uC5F0\uB9F9\uC744 \uD65C\uC6A9\uD55C \u2018\uCE74\uC6B4\uD130 \uB7A0\uB9AC(\uAD50\uCC28 \uC9D1\uACB0)\u2019 \uC804\uC220\uC744 \uC900\uBE44\uD558\uC138\uC694.',
    setupKo:
      '\uC801\uC774 \uC6B0\uB9AC \uAC74\uBB3C\uC744 \uC810\uB839\uD558\uB3C4\uB85D \uC720\uB3C4\uD558\uC2ED\uC2DC\uC624. \uC810\uB839 \uC9C1\uD6C4\uB294 \uC218\uC131 \uC601\uC6C5\uC774 \uBBF8\uC801\uC6A9\uB418\uACE0 \uBC29\uD328\uBCD1\uC774 \uC18C\uC9C4\uB41C \uAC00\uC7A5 \uCDE8\uC57D\uD55C \uC0C1\uD0DC\uC785\uB2C8\uB2E4. \uC801 \uC9D1\uACB0\uC774 \uB3C4\uCC29\uD558\uAE30 \uC804\uC5D0 \uBBF8\uB9AC \uC2DC\uAC04\uC744 \uACC4\uC0B0\uD558\uC5EC, \uC801 \uB3C4\uCC29 \uD6C4 5\uCD08 \uB4A4\uC5D0 \uC6B0\uB9AC \uC11C\uBE0C \uC5F0\uB9F9\uC758 \uC9D1\uACB0 \uD0C0\uACA9\uC774 \uB4E4\uC5B4\uAC00\uB3C4\uB85D \uC124\uACC4\uD574 \uC989\uC2DC \uD0C8\uD658\uD574\uC57C \uD569\uB2C8\uB2E4.',
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
        className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-${color}-500`}
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
  const dotColor = theme === 'blue' ? '\uD83D\uDD35' : '\uD83D\uDD34';

  const handleRatioChange = useCallback(
    (field: keyof TroopRatio, newValue: number) => {
      newValue = clamp(newValue, 0, 100);
      const others = (Object.keys(ratio) as (keyof TroopRatio)[]).filter((k) => k !== field);
      const remaining = 100 - newValue;
      const otherSum = others.reduce((sum, k) => sum + ratio[k], 0);

      const updated = { ...ratio, [field]: newValue };

      if (otherSum === 0) {
        // Distribute remaining equally among others
        const each = Math.floor(remaining / others.length);
        const extra = remaining - each * others.length;
        others.forEach((k, i) => {
          updated[k] = each + (i === 0 ? extra : 0);
        });
      } else {
        // Distribute remaining proportionally
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

      // Ensure no negative values
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
        {dotColor} {title}
      </h3>

      {/* Stats */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Stats
        </p>
        <StatInput label="ATK" value={stats.atk} onChange={(v) => setStats({ ...stats, atk: v })} />
        <StatInput label="DEF" value={stats.def} onChange={(v) => setStats({ ...stats, def: v })} />
        <StatInput
          label="Lethality"
          value={stats.lethality}
          onChange={(v) => setStats({ ...stats, lethality: v })}
        />
        <StatInput label="HP" value={stats.hp} onChange={(v) => setStats({ ...stats, hp: v })} />
      </div>

      {/* Troop Ratio */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {'\uD83D\uDDE1\uFE0F'} Troop Ratio (Total: {ratio.infantry + ratio.lancer + ratio.marksman}%)
        </p>
        <TroopSlider
          label="\uBC29\uD328(\uBCF4\uBCD1)"
          emoji={'\uD83D\uDEE1\uFE0F'}
          value={ratio.infantry}
          color="red"
          onChange={(v) => handleRatioChange('infantry', v)}
        />
        <TroopSlider
          label="\uCC3D\uBCD1"
          emoji={'\uD83D\uDD31'}
          value={ratio.lancer}
          color="green"
          onChange={(v) => handleRatioChange('lancer', v)}
        />
        <TroopSlider
          label="\uAD81\uBCD1"
          emoji={'\uD83C\uDFF9'}
          value={ratio.marksman}
          color="blue"
          onChange={(v) => handleRatioChange('marksman', v)}
        />
      </div>

      {/* Attack/Defense Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setSide('attack')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            side === 'attack'
              ? 'bg-red-500 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          {'\uD83D\uDDE1\uFE0F'} \uACF5\uACA9
        </button>
        <button
          onClick={() => setSide('defense')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            side === 'defense'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          {'\uD83D\uDEE1\uFE0F'} \uC218\uBE44
        </button>
      </div>
    </div>
  );
}

// ── Main Calculator Page ──────────────────────────────
export default function CalculatorPage() {
  const router = useRouter();

  // Ally
  const [allyStats, setAllyStats] = useState<Stats>({ atk: 100, def: 100, lethality: 100, hp: 100 });
  const [allyRatio, setAllyRatio] = useState<TroopRatio>({ infantry: 40, lancer: 30, marksman: 30 });
  const [allySide, setAllySide] = useState<Side>('attack');

  // Enemy
  const [enemyStats, setEnemyStats] = useState<Stats>({ atk: 100, def: 100, lethality: 100, hp: 100 });
  const [enemyRatio, setEnemyRatio] = useState<TroopRatio>({ infantry: 40, lancer: 30, marksman: 30 });
  const [enemySide, setEnemySide] = useState<Side>('defense');

  // Sync attack/defense toggle
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

  // Calculate
  const result = useMemo(() => {
    const myStrike = (allyStats.atk / 100) * (allyStats.lethality / 100);
    const myDefense = (allyStats.def / 100) * (allyStats.hp / 100);
    const enemyStrike = (enemyStats.atk / 100) * (enemyStats.lethality / 100);
    const enemyDefense = (enemyStats.def / 100) * (enemyStats.hp / 100);

    // When ally is attacking: ratio = my strike / enemy defense
    // When ally is defending: ratio = my defense / enemy strike
    const ratio =
      allySide === 'attack'
        ? enemyDefense > 0 ? myStrike / enemyDefense : 99
        : enemyStrike > 0 ? myDefense / enemyStrike : 99;

    // Find tier
    const tier = TACTICAL_TIERS.find((t) => ratio >= t.minRatio) ?? TACTICAL_TIERS[TACTICAL_TIERS.length - 1];

    return {
      myStrike,
      myDefense,
      enemyStrike,
      enemyDefense,
      ratio,
      tier,
    };
  }, [allyStats, enemyStats, allySide]);

  const gaugePercent = clamp((result.ratio / (result.ratio + 1)) * 100, 5, 95);
  const style = TIER_STYLES[result.tier.color];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="text-2xl">{'\u2694\uFE0F'}</span>
          <span className="hidden sm:inline">\uC804\uD22C \uAD50\uD658\uBE44 \uC2DC\uBBAC\uB808\uC774\uD130</span>
          <span className="sm:hidden">Combat Calc</span>
        </h2>
        <button
          onClick={() => router.back()}
          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          {'\u2190'} \uB3CC\uC544\uAC00\uAE30
        </button>
      </div>

      {/* Input Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SidePanel
          title="\uC544\uAD70 (Ally)"
          theme="blue"
          stats={allyStats}
          setStats={setAllyStats}
          ratio={allyRatio}
          setRatio={setAllyRatio}
          side={allySide}
          setSide={handleAllySideChange}
        />
        <SidePanel
          title="\uC801\uAD70 (Enemy)"
          theme="red"
          stats={enemyStats}
          setStats={setEnemyStats}
          ratio={enemyRatio}
          setRatio={setEnemyRatio}
          side={enemySide}
          setSide={handleEnemySideChange}
        />
      </div>

      {/* Result Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 space-y-5">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          {'\uD83D\uDCCA'} \uC804\uD22C \uAD50\uD658\uBE44 \uACB0\uACFC
        </h3>

        {/* Gauge Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{'\uD83D\uDD35'} \uC544\uAD70</span>
            <span>{'\uD83D\uDD34'} \uC801\uAD70</span>
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

        {/* Effective Values */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-500 dark:text-blue-400 mb-1">
              {allySide === 'attack' ? 'My Effective Strike' : 'My Effective Defense'}
            </p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {allySide === 'attack'
                ? (result.myStrike * 100).toFixed(1)
                : (result.myDefense * 100).toFixed(1)}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 text-center">
            <p className="text-xs text-red-500 dark:text-red-400 mb-1">
              {allySide === 'attack' ? 'Enemy Effective Defense' : 'Enemy Effective Strike'}
            </p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">
              {allySide === 'attack'
                ? (result.enemyDefense * 100).toFixed(1)
                : (result.enemyStrike * 100).toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Tactical Recommendation Card */}
      <div className={`rounded-lg border-2 ${style.border} ${style.bg} p-5 space-y-4`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{result.tier.emoji}</span>
          <div>
            <h4 className={`text-base font-bold ${style.title}`}>{result.tier.titleKo}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{result.tier.titleEn}</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Tactical Guide */}
          <div className="bg-white/70 dark:bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
              {'\uD83D\uDCCB'} \uC804\uC220 \uAC00\uC774\uB4DC
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              {result.tier.guideKo}
            </p>
          </div>

          {/* Hero/Setup Guide */}
          <div className="bg-white/70 dark:bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
              {result.tier.id === 'disadvantage' || result.tier.id === 'critical'
                ? '\uD83C\uDFAF \uC2E4\uD589 \uBC29\uBC95'
                : '\uD83E\uDDB8 \uC601\uC6C5/\uBCD1\uC885 \uC138\uD305'}
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              {result.tier.setupKo}
            </p>
          </div>
        </div>

        {/* Ratio Badge */}
        <div className="flex justify-center">
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${style.badge}`}>
            \uAD50\uD658\uBE44 {result.ratio.toFixed(2)} : 1
          </span>
        </div>
      </div>

      {/* Formula Reference */}
      <details className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <summary className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
          {'\uD83D\uDCD6'} \uACC4\uC0B0 \uACF5\uC2DD \uCC38\uACE0
        </summary>
        <div className="mt-3 space-y-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
          <p>Effective Strike = ATK(%) {'\u00D7'} Lethality(%)</p>
          <p>Effective Defense = DEF(%) {'\u00D7'} HP(%)</p>
          <p>Damage Ratio = My Strike / Enemy Defense</p>
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <p>{'\uD83D\uDFE2'} {'>'} 1.2 : \uB2E8\uB3C5 \uB3CC\uD30C \uAC00\uB2A5</p>
            <p>{'\uD83D\uDFE1'} 0.8 ~ 1.2 : \uD638\uAC01 (\uC9C4\uD615 \uC720\uC9C0)</p>
            <p>{'\uD83D\uDFE0'} 0.5 ~ 0.8 : \uBD88\uB9AC (\uB2E4\uC911 \uB7A0\uB9AC)</p>
            <p>{'\uD83D\uDD34'} {'<'} 0.5 : \uB9E4\uC6B0 \uBD88\uB9AC (\uCE74\uC6B4\uD130 \uB7A0\uB9AC)</p>
          </div>
        </div>
      </details>
    </div>
  );
}
