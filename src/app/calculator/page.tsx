'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────
interface TroopStats {
  atk: number;
  def: number;
  destruction: number;
  hp: number;
}

interface AllStats {
  infantry: TroopStats;
  lancer: TroopStats;
  marksman: TroopStats;
}

interface TroopCounts {
  infantry: number;
  lancer: number;
  marksman: number;
}

type Side = 'attack' | 'defense';
type TroopType = 'infantry' | 'lancer' | 'marksman';

const TROOP_LABELS: Record<TroopType, { ko: string; emoji: string; color: string }> = {
  infantry: { ko: '방패병', emoji: '🛡️', color: 'red' },
  lancer: { ko: '창병', emoji: '🔱', color: 'green' },
  marksman: { ko: '궁병', emoji: '🏹', color: 'blue' },
};

const STAT_LABELS = [
  { key: 'atk' as const, ko: '공격력' },
  { key: 'def' as const, ko: '방어력' },
  { key: 'destruction' as const, ko: '파괴력' },
  { key: 'hp' as const, ko: 'HP' },
];

const DEFAULT_TROOP_STATS: TroopStats = { atk: 100, def: 100, destruction: 100, hp: 100 };
const DEFAULT_TROOP_COUNTS: TroopCounts = { infantry: 60000, lancer: 20000, marksman: 20000 };
const DEFAULT_ALL_STATS: AllStats = {
  infantry: { ...DEFAULT_TROOP_STATS },
  lancer: { ...DEFAULT_TROOP_STATS },
  marksman: { ...DEFAULT_TROOP_STATS },
};

// ── Tactical Recommendation Data ──────────────────────
const TACTICAL_TIERS = [
  {
    id: 'dominant',
    minRatio: 1.3,
    color: 'green' as const,
    emoji: '🟢',
    titleKo: '압승! (단독 타격으로 적 방어선 붕괴)',
    titleEn: 'Dominant Victory - Solo Rally Breakthrough',
    whyKo:
      '아군의 유효 타격량과 병력 체급이 적의 방어를 압도합니다. 적의 1열(방패병)이 초반에 전멸하면서 아군의 피해는 최소화되고 일방적인 학살(스노우볼)이 발생합니다.',
    tacticKo:
      '추가 랠리 없이 현재 단일 집결만으로도 확정적인 승리가 가능합니다.',
  },
  {
    id: 'even',
    minRatio: 0.8,
    color: 'yellow' as const,
    emoji: '🟡',
    titleKo: '호각/백중세 (소모전 양상)',
    titleEn: 'Even Match - War of Attrition',
    whyKo:
      '양측의 공방 체급이 비슷하여 1열이 끈질기게 버티는 양상입니다. 전투가 장기전으로 흐르며, 영웅 스킬 발동 확률이나 방패병의 미세한 유지력 차이로 승패가 갈립니다.',
    tacticKo:
      '승리하더라도 큰 피해가 예상됩니다. 1열 유지력을 위해 방패병 비율을 60% 이상 확보하세요.',
  },
  {
    id: 'disadvantage',
    minRatio: 0.5,
    color: 'orange' as const,
    emoji: '🟠',
    titleKo: '불리함 (정면 돌파 실패)',
    titleEn: 'Disadvantage - Frontal Assault Failure',
    whyKo:
      '적의 방어선이 견고하여 아군의 방패병이 먼저 전멸하게 됩니다. 단일 집결로는 돌파가 불가능하지만, 적의 방패병을 소모시키는 성과는 거둘 수 있습니다.',
    tacticKo:
      "1차 서브 집결로 적의 방패병을 깎은 뒤, 5초 이내에 메인 집결을 꽂는 '연속 타격' 전술을 권장합니다.",
  },
  {
    id: 'critical',
    minRatio: 0,
    color: 'red' as const,
    emoji: '🔴',
    titleKo: '매우 불리 (참패 확정)',
    titleEn: 'Critical - Defeat Guaranteed',
    whyKo:
      '체급 차이가 절망적입니다. 아군의 공격은 적에게 생채기만 낼 뿐이며, 아군 1열은 시작과 동시에 삭제당합니다. 정면 승부는 무의미한 손실만 초래합니다.',
    tacticKo:
      "정면 대결을 피하고, 적이 건물을 점령한 직후 수성 버프가 꺼진 틈을 노리는 '카운터 랠리'를 설계하세요.",
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

// ── Helpers ───────────────────────────────────────────
function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ── Stat Input Component ──────────────────────────────
function StatInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [display, setDisplay] = useState(String(value));

  useEffect(() => {
    const parsed = parseFloat(display);
    if (isNaN(parsed) ? value !== 0 : parsed !== value) {
      setDisplay(String(value));
    }
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 w-16 shrink-0">
        {label}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(e) => {
          let raw = e.target.value;
          if (!/^\d*\.?\d*$/.test(raw)) return;
          if (raw.length > 1 && raw[0] === '0' && raw[1] !== '.') {
            raw = raw.replace(/^0+/, '') || '0';
          }
          setDisplay(raw);
          const num = parseFloat(raw);
          onChange(isNaN(num) ? 0 : num);
        }}
        onBlur={() => setDisplay(String(value))}
        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-white text-right"
      />
      <span className="text-xs text-gray-400 shrink-0">%</span>
    </div>
  );
}

// ── Troop Stats Tab Panel ─────────────────────────────
function TroopStatsPanel({
  allStats,
  setAllStats,
  activeTab,
  setActiveTab,
}: {
  allStats: AllStats;
  setAllStats: (s: AllStats) => void;
  activeTab: TroopType;
  setActiveTab: (t: TroopType) => void;
}) {
  const TABS: TroopType[] = ['infantry', 'lancer', 'marksman'];
  const tabColors: Record<TroopType, { active: string; inactive: string }> = {
    infantry: {
      active: 'bg-red-500 text-white',
      inactive: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
    },
    lancer: {
      active: 'bg-green-500 text-white',
      inactive: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
    },
    marksman: {
      active: 'bg-blue-500 text-white',
      inactive: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
    },
  };

  const currentStats = allStats[activeTab];

  const updateStat = (key: keyof TroopStats, value: number) => {
    setAllStats({
      ...allStats,
      [activeTab]: { ...currentStats, [key]: value },
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        병종별 스탯
      </p>

      {/* Tabs */}
      <div className="flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === tab ? tabColors[tab].active : tabColors[tab].inactive
            }`}
          >
            {TROOP_LABELS[tab].emoji} {TROOP_LABELS[tab].ko}
          </button>
        ))}
      </div>

      {/* Stats for active tab */}
      <div className="space-y-2 bg-white/50 dark:bg-gray-800/30 rounded-lg p-3">
        {STAT_LABELS.map((stat) => (
          <StatInput
            key={stat.key}
            label={stat.ko}
            value={currentStats[stat.key]}
            onChange={(v) => updateStat(stat.key, v)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Troop Count Input Component ──────────────────────
function TroopCountInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [display, setDisplay] = useState(String(value));

  useEffect(() => {
    const parsed = parseInt(display, 10);
    if (isNaN(parsed) ? value !== 0 : parsed !== value) {
      setDisplay(String(value));
    }
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => {
        let raw = e.target.value;
        if (!/^\d*$/.test(raw)) return;
        if (raw.length > 1 && raw[0] === '0') {
          raw = raw.replace(/^0+/, '') || '0';
        }
        setDisplay(raw);
        const num = parseInt(raw, 10);
        onChange(isNaN(num) ? 0 : Math.max(0, num));
      }}
      onBlur={() => setDisplay(String(value))}
      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-white text-right"
    />
  );
}

// ── Side Panel Component ──────────────────────────────
function SidePanel({
  title,
  theme,
  allStats,
  setAllStats,
  troopCounts,
  setTroopCounts,
  side,
  setSide,
}: {
  title: string;
  theme: 'blue' | 'red';
  allStats: AllStats;
  setAllStats: (s: AllStats) => void;
  troopCounts: TroopCounts;
  setTroopCounts: (c: TroopCounts) => void;
  side: Side;
  setSide: (s: Side) => void;
}) {
  const borderColor = theme === 'blue' ? 'border-blue-300 dark:border-blue-700' : 'border-red-300 dark:border-red-700';
  const bgColor = theme === 'blue' ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-red-50 dark:bg-red-950/30';
  const headerColor = theme === 'blue' ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400';
  const dot = theme === 'blue' ? '🔵' : '🔴';

  const [activeTab, setActiveTab] = useState<TroopType>('infantry');

  // 비율 자동 계산
  const totalCount = troopCounts.infantry + troopCounts.lancer + troopCounts.marksman;
  const ratioPercent = {
    infantry: totalCount > 0 ? Math.round((troopCounts.infantry / totalCount) * 100) : 0,
    lancer: totalCount > 0 ? Math.round((troopCounts.lancer / totalCount) * 100) : 0,
    marksman: totalCount > 0 ? Math.round((troopCounts.marksman / totalCount) * 100) : 0,
  };

  const handleCountChange = (troop: TroopType, value: number) => {
    setTroopCounts({ ...troopCounts, [troop]: Math.max(0, value) });
  };

  const TROOP_INPUT_CONFIG: { key: TroopType; label: string; emoji: string }[] = [
    { key: 'infantry', label: '방패병', emoji: '🛡️' },
    { key: 'lancer', label: '창병', emoji: '🔱' },
    { key: 'marksman', label: '궁병', emoji: '🏹' },
  ];

  return (
    <div className={`rounded-lg border-2 ${borderColor} ${bgColor} p-4 space-y-4`}>
      <h3 className={`text-base font-bold ${headerColor} flex items-center gap-2`}>
        {dot} {title}
      </h3>

      {/* Troop Stats Tabs */}
      <TroopStatsPanel
        allStats={allStats}
        setAllStats={setAllStats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Troop Count Inputs */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          병종별 투입 수 (총 {totalCount.toLocaleString()}명)
        </p>
        {TROOP_INPUT_CONFIG.map((troop) => (
          <div key={troop.key} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400 w-16 shrink-0">
              {troop.emoji} {troop.label}
            </span>
            <TroopCountInput
              value={troopCounts[troop.key]}
              onChange={(v) => handleCountChange(troop.key, v)}
            />
            <span className="text-xs text-gray-400 shrink-0 w-8 text-right font-mono">
              {ratioPercent[troop.key]}%
            </span>
          </div>
        ))}
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          현재 비율 — 방패: {ratioPercent.infantry}% / 창: {ratioPercent.lancer}% / 궁: {ratioPercent.marksman}%
        </p>
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

// ── Calculation Helper ────────────────────────────────
// 순수 스탯 배율 × 병력 수 기반 전투력 산출 (인위적 가중치 없음)
// 배율 변환: 100% → (1 + 100/100) = 2.0배, 250% → 3.5배
function calcTotalIndex(stats: AllStats, counts: TroopCounts, type: 'strike' | 'defense') {
  const troops: TroopType[] = ['infantry', 'lancer', 'marksman'];
  let total = 0;
  for (const troop of troops) {
    const s = stats[troop];
    const multiplier = type === 'strike'
      ? (1 + s.atk / 100) * (1 + s.destruction / 100)
      : (1 + s.def / 100) * (1 + s.hp / 100);
    total += counts[troop] * multiplier;
  }
  return total;
}

// ── Main Calculator Page ──────────────────────────────
export default function CalculatorPage() {
  const router = useRouter();

  const [allyStats, setAllyStats] = useState<AllStats>(() => ({
    infantry: { ...DEFAULT_TROOP_STATS },
    lancer: { ...DEFAULT_TROOP_STATS },
    marksman: { ...DEFAULT_TROOP_STATS },
  }));
  const [allyCounts, setAllyCounts] = useState<TroopCounts>({ ...DEFAULT_TROOP_COUNTS });
  const [allySide, setAllySide] = useState<Side>('attack');

  const [enemyStats, setEnemyStats] = useState<AllStats>(() => ({
    infantry: { ...DEFAULT_TROOP_STATS },
    lancer: { ...DEFAULT_TROOP_STATS },
    marksman: { ...DEFAULT_TROOP_STATS },
  }));
  const [enemyCounts, setEnemyCounts] = useState<TroopCounts>({ ...DEFAULT_TROOP_COUNTS });
  const [enemySide, setEnemySide] = useState<Side>('defense');

  const handleAllySideChange = useCallback((s: Side) => {
    setAllySide(s);
    setEnemySide(s === 'attack' ? 'defense' : 'attack');
  }, []);

  const handleEnemySideChange = useCallback((s: Side) => {
    setEnemySide(s);
    setAllySide(s === 'attack' ? 'defense' : 'attack');
  }, []);

  // ── 동적 조언 생성 ──────────────────────────────────
  const getDynamicAdvice = useCallback(
    (stats: AllStats, counts: TroopCounts, finalRatio: number) => {
      const total = counts.infantry + counts.lancer + counts.marksman;
      const infantryRatio = total > 0 ? Math.round((counts.infantry / total) * 100) : 0;

      // 분기 진단
      let diagnosis: string;
      let advice: string;

      if (finalRatio >= 1.0) {
        // CASE C: 유리
        diagnosis = '안정적인 스펙 차이로 승리가 예상됩니다.';
        advice =
          "현재의 병종 비율과 스탯 균형이 좋습니다. 다만 상대가 '카운터 랠리'를 시도할 수 있으니 도착 시간을 엄격히 통제하세요.";
      } else if (infantryRatio >= 60) {
        // CASE A: 방패병 충분하나 체급 열세
        diagnosis = `방패병 비율(${infantryRatio}%)은 이상적이지만, 체급 차이로 인해 앞열이 버티지 못합니다.`;
        advice =
          "현재 문제는 병사 숫자가 아니라 '스탯 격차'입니다. 집결장의 [방어력/HP] 스탯을 높여 방패병의 생존 시간을 벌거나, 적의 방패병을 더 빨리 녹일 수 있도록 [공격력/파괴력]이 높은 딜러형 집결장으로 교체하세요.";
      } else {
        // CASE B: 방패병 부족 + 열세
        diagnosis = '방패병 비율이 낮아 적의 공격에 1열이 너무 빨리 노출됩니다.';
        advice = `방패병 비율을 60% 이상으로 높여 아군 딜러들이 공격할 시간을 확보해야 합니다. 현재 비율(${infantryRatio}%)에서는 딜러들이 제 성능을 내기 전에 전멸할 위험이 큽니다.`;
      }

      // 딜러 최적화 팁: 창병 vs 궁병 타격 배율 비교
      const lancerStrike = (1 + stats.lancer.atk / 100) * (1 + stats.lancer.destruction / 100);
      const marksmanStrike =
        (1 + stats.marksman.atk / 100) * (1 + stats.marksman.destruction / 100);

      let dealerTip: string;
      if (lancerStrike > marksmanStrike) {
        dealerTip = '현재 아군은 창병의 타격 효율이 더 좋습니다. 해당 병종의 비중을 높이는 것이 유리합니다.';
      } else if (marksmanStrike > lancerStrike) {
        dealerTip = '현재 아군은 궁병의 타격 효율이 더 좋습니다. 해당 병종의 비중을 높이는 것이 유리합니다.';
      } else {
        dealerTip = '창병과 궁병의 타격 효율이 동일합니다. 상황에 맞게 자유롭게 배분하세요.';
      }

      return { diagnosis, advice, dealerTip };
    },
    [],
  );

  // 순수 스탯 × 병력 수 기반 교환비 계산 (스노우볼 효과 포함)
  const result = useMemo(() => {
    const myStrike = calcTotalIndex(allyStats, allyCounts, 'strike');
    const myDefense = calcTotalIndex(allyStats, allyCounts, 'defense');
    const enemyStrike = calcTotalIndex(enemyStats, enemyCounts, 'strike');
    const enemyDefense = calcTotalIndex(enemyStats, enemyCounts, 'defense');

    // 기본 교환비
    const baseRatio =
      allySide === 'attack'
        ? enemyDefense > 0 ? myStrike / enemyDefense : 99
        : enemyStrike > 0 ? myDefense / enemyStrike : 99;

    // 병력 체급 비 (스노우볼 보정)
    const allyTotal = allyCounts.infantry + allyCounts.lancer + allyCounts.marksman;
    const enemyTotal = enemyCounts.infantry + enemyCounts.lancer + enemyCounts.marksman;
    const troopWeightRatio = enemyTotal > 0 ? allyTotal / enemyTotal : 1;

    // 최종 교환비 = 기본교환비 × (체급비)^1.5
    const ratio = baseRatio * Math.pow(troopWeightRatio, 1.5);

    const tier = TACTICAL_TIERS.find((t) => ratio >= t.minRatio) ?? TACTICAL_TIERS[TACTICAL_TIERS.length - 1];

    const dynamicAdvice = getDynamicAdvice(allyStats, allyCounts, ratio);

    return { myStrike, myDefense, enemyStrike, enemyDefense, ratio, tier, baseRatio, troopWeightRatio, dynamicAdvice };
  }, [allyStats, allyCounts, enemyStats, enemyCounts, allySide, getDynamicAdvice]);

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
          allStats={allyStats}
          setAllStats={setAllyStats}
          troopCounts={allyCounts}
          setTroopCounts={setAllyCounts}
          side={allySide}
          setSide={handleAllySideChange}
        />
        <SidePanel
          title="적군 (Enemy)"
          theme="red"
          allStats={enemyStats}
          setAllStats={setEnemyStats}
          troopCounts={enemyCounts}
          setTroopCounts={setEnemyCounts}
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
              {allySide === 'attack' ? '아군 총 타격 지수' : '아군 총 방어 지수'}
            </p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {allySide === 'attack'
                ? Math.round(result.myStrike).toLocaleString()
                : Math.round(result.myDefense).toLocaleString()}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 text-center">
            <p className="text-xs text-red-500 dark:text-red-400 mb-1">
              {allySide === 'attack' ? '적군 총 방어 지수' : '적군 총 타격 지수'}
            </p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">
              {allySide === 'attack'
                ? Math.round(result.enemyDefense).toLocaleString()
                : Math.round(result.enemyStrike).toLocaleString()}
            </p>
          </div>
        </div>

        {/* 상세 비율 */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>기본 교환비: {result.baseRatio.toFixed(2)}</span>
          <span>{'×'}</span>
          <span>체급비^1.5: {Math.pow(result.troopWeightRatio, 1.5).toFixed(2)}</span>
          <span>{'='}</span>
          <span className="font-bold text-gray-700 dark:text-gray-200">최종: {result.ratio.toFixed(2)}</span>
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
              {'📋'} 판정 이유
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              {result.tier.whyKo}
            </p>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
              {'🔍'} 상세 진단
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              {result.dynamicAdvice.diagnosis}
            </p>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
              {'🎯'} 전술
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              {result.dynamicAdvice.advice}
            </p>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
              {'💡'} 딜러 최적화
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              {result.dynamicAdvice.dealerTip}
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
          <p className="font-semibold text-gray-600 dark:text-gray-300">1. 스탯 배율 변환 (100% = 기본 1.0배):</p>
          <p>  타격 배율 = (1 + 공격력/100) × (1 + 파괴력/100)</p>
          <p>  방어 배율 = (1 + 방어력/100) × (1 + HP/100)</p>
          <p>  예: 250% → (1 + 250/100) = 3.5배</p>
          <p className="mt-1 font-semibold text-gray-600 dark:text-gray-300">2. 총 전투력 지수 (병력 수 반영):</p>
          <p>  총 지수 = {'Σ'}(병종별 병력 수 × 해당 배율)</p>
          <p className="mt-1 font-semibold text-gray-600 dark:text-gray-300">3. 최종 교환비 (스노우볼 효과):</p>
          <p>  기본 교환비 = 아군 타격 지수 / 적군 방어 지수</p>
          <p>  병력 체급 비 = 아군 총 병력 / 적군 총 병력</p>
          <p>  최종 = 기본교환비 × (체급비)^1.5</p>
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <p>{'🟢'} {'>'} 1.3 : 압승 (단독 돌파)</p>
            <p>{'🟡'} 0.8 ~ 1.3 : 호각 (소모전)</p>
            <p>{'🟠'} 0.5 ~ 0.8 : 불리 (다중 랠리)</p>
            <p>{'🔴'} {'<'} 0.5 : 매우 불리 (카운터 랠리)</p>
          </div>
        </div>
      </details>
    </div>
  );
}
