import type {
  Hero,
  RallyType,
  StrategyTemplate,
  CallSign,
  ChecklistItem,
  CounterEntry,
  JoinerEffectEntry,
  SpecialInstruction,
} from './types';

// ============================================================
// HEROES
// ============================================================

export const HEROES: Hero[] = [
  // ── 에픽 영웅 (조이너 전용) ──
  {
    id: 'jessie',
    nameKo: '제시',
    nameEn: 'Jessie',
    heroClass: 'infantry',
    role: 'offense',
    generation: 0,
    joinerEffect: {
      descriptionKo: '공격력 증가 (중복O)',
      descriptionEn: 'ATK increase (stackable)',
      stackable: true,
    },
  },
  {
    id: 'sergey',
    nameKo: '세르게이',
    nameEn: 'Sergey',
    heroClass: 'infantry',
    role: 'defense',
    generation: 0,
    joinerEffect: {
      descriptionKo: '피해 감소',
      descriptionEn: 'Damage reduction',
      stackable: false,
    },
  },
  {
    id: 'patrick',
    nameKo: '패트릭',
    nameEn: 'Patrick',
    heroClass: 'infantry',
    role: 'defense',
    generation: 0,
    joinerEffect: {
      descriptionKo: 'HP 25% 상승',
      descriptionEn: 'HP +25%',
      stackable: false,
    },
  },
  {
    id: 'bahiti',
    nameKo: '바히티',
    nameEn: 'Bahiti',
    heroClass: 'infantry',
    role: 'defense',
    generation: 0,
    joinerEffect: {
      descriptionKo: '피해 감소',
      descriptionEn: 'Damage reduction',
      stackable: false,
    },
  },
  // ── 1세대 레전드 ──
  {
    id: 'geronimo',
    nameKo: '제로니모',
    nameEn: 'Geronimo',
    heroClass: 'infantry',
    role: 'offense',
    generation: 1,
  },
  {
    id: 'natalia',
    nameKo: '나탈리아',
    nameEn: 'Natalia',
    heroClass: 'infantry',
    role: 'defense',
    generation: 1,
  },
  {
    id: 'molly',
    nameKo: '몰리',
    nameEn: 'Molly',
    heroClass: 'lancer',
    role: 'defense',
    generation: 1,
  },
  {
    id: 'zinman',
    nameKo: '진먼',
    nameEn: 'Zinman',
    heroClass: 'marksman',
    role: 'defense',
    generation: 1,
  },
  // ── 2세대 ──
  {
    id: 'flint',
    nameKo: '플린트',
    nameEn: 'Flint',
    heroClass: 'infantry',
    role: 'offense',
    generation: 2,
  },
  {
    id: 'philly',
    nameKo: '필리',
    nameEn: 'Philly',
    heroClass: 'lancer',
    role: 'defense',
    generation: 2,
  },
  {
    id: 'alonso',
    nameKo: '알론소',
    nameEn: 'Alonso',
    heroClass: 'marksman',
    role: 'offense',
    generation: 2,
  },
  // ── 3세대 ──
  {
    id: 'logan',
    nameKo: '로건',
    nameEn: 'Logan',
    heroClass: 'infantry',
    role: 'defense',
    generation: 3,
  },
  {
    id: 'mia',
    nameKo: '미야',
    nameEn: 'Mia',
    heroClass: 'lancer',
    role: 'offense',
    generation: 3,
  },
  {
    id: 'greg',
    nameKo: '그렉',
    nameEn: 'Greg',
    heroClass: 'marksman',
    role: 'offense',
    generation: 3,
  },
  // ── 4세대 ──
  {
    id: 'ahmose',
    nameKo: '아모세',
    nameEn: 'Ahmose',
    heroClass: 'infantry',
    role: 'defense',
    generation: 4,
    statPercent: 370,
  },
  {
    id: 'reina',
    nameKo: '레이나',
    nameEn: 'Reina',
    heroClass: 'lancer',
    role: 'offense',
    generation: 4,
    statPercent: 370,
  },
  {
    id: 'lyn',
    nameKo: '린',
    nameEn: 'Lyn',
    heroClass: 'marksman',
    role: 'defense',
    generation: 4,
    statPercent: 370,
  },
  // ── 5세대 ──
  {
    id: 'hector',
    nameKo: '헥터',
    nameEn: 'Hector',
    heroClass: 'infantry',
    role: 'defense',
    generation: 5,
  },
  {
    id: 'norah',
    nameKo: '노라',
    nameEn: 'Norah',
    heroClass: 'lancer',
    role: 'offense',
    generation: 5,
  },
  {
    id: 'gwen',
    nameKo: '그웬',
    nameEn: 'Gwen',
    heroClass: 'marksman',
    role: 'offense',
    generation: 5,
  },
  // ── 6세대 ──
  {
    id: 'wuming',
    nameKo: '무명',
    nameEn: 'Wu Ming',
    heroClass: 'infantry',
    role: 'offense',
    generation: 6,
  },
  {
    id: 'renee',
    nameKo: '레니',
    nameEn: 'Renee',
    heroClass: 'lancer',
    role: 'defense',
    generation: 6,
  },
  {
    id: 'wayne',
    nameKo: '웨인',
    nameEn: 'Wayne',
    heroClass: 'marksman',
    role: 'offense',
    generation: 6,
  },
  // ── 7세대 ──
  {
    id: 'edith',
    nameKo: '에디스',
    nameEn: 'Edith',
    heroClass: 'infantry',
    role: 'defense',
    generation: 7,
  },
  {
    id: 'gordon',
    nameKo: '고든',
    nameEn: 'Gordon',
    heroClass: 'lancer',
    role: 'offense',
    generation: 7,
  },
  {
    id: 'bradley',
    nameKo: '브레들리',
    nameEn: 'Bradley',
    heroClass: 'marksman',
    role: 'offense',
    generation: 7,
  },
  // ── 8세대 ──
  {
    id: 'gatot',
    nameKo: '가토',
    nameEn: 'Gatot',
    heroClass: 'infantry',
    role: 'defense',
    generation: 8,
  },
  {
    id: 'sonya',
    nameKo: '소냐',
    nameEn: 'Sonya',
    heroClass: 'lancer',
    role: 'offense',
    generation: 8,
  },
  {
    id: 'hendrik',
    nameKo: '헨드릭',
    nameEn: 'Hendrik',
    heroClass: 'marksman',
    role: 'defense',
    generation: 8,
  },
  // ── 9세대 ──
  {
    id: 'magnus',
    nameKo: '마그누스',
    nameEn: 'Magnus',
    heroClass: 'infantry',
    role: 'defense',
    generation: 9,
  },
  {
    id: 'fred',
    nameKo: '프레드',
    nameEn: 'Fred',
    heroClass: 'lancer',
    role: 'offense',
    generation: 9,
  },
  {
    id: 'xura',
    nameKo: '쇠라',
    nameEn: 'Xura',
    heroClass: 'marksman',
    role: 'offense',
    generation: 9,
  },
  // ── 10세대 ──
  {
    id: 'gregory',
    nameKo: '그레고리',
    nameEn: 'Gregory',
    heroClass: 'infantry',
    role: 'defense',
    generation: 10,
  },
  {
    id: 'freya',
    nameKo: '프레야',
    nameEn: 'Freya',
    heroClass: 'lancer',
    role: 'offense',
    generation: 10,
  },
  {
    id: 'blanchette',
    nameKo: '블랑쉬',
    nameEn: 'Blanchette',
    heroClass: 'marksman',
    role: 'offense',
    generation: 10,
  },
];

export function getHeroById(id: string): Hero | undefined {
  return HEROES.find((h) => h.id === id);
}

export function getHeroName(id: string, lang: 'ko' | 'en'): string {
  const hero = getHeroById(id);
  if (!hero) return id;
  return lang === 'ko' ? hero.nameKo : hero.nameEn;
}

// ============================================================
// DEFAULT RALLY TYPES
// ============================================================

export const DEFAULT_RALLY_TYPES: RallyType[] = [
  {
    id: 'offense_default',
    labelKo: '공성 (기본)',
    labelEn: 'Offense (Default)',
    color: 'red',
    troopRatio: { infantry: 2, lancer: 1, marksman: 1 },
    leaderComposition: { hero1Id: 'geronimo', hero2Id: 'reina', hero3Id: 'greg' },
    joinerHeroes: ['jessie'],
  },
  {
    id: 'offense_anti_spear',
    labelKo: '방궁 공성 (상대 방창 수성 6:4:0 카운터)',
    labelEn: 'Infantry-Marksman Offense (Counter to 6:4:0 Defense)',
    color: 'yellow',
    troopRatio: { infantry: 5, lancer: 0, marksman: 5 },
    leaderComposition: { hero1Id: 'geronimo', hero2Id: 'mia', hero3Id: 'lyn' },
    joinerHeroes: ['jessie'],
    counterTo: 'defense_anti_archer',
  },
  {
    id: 'defense_default',
    labelKo: '수성 (기본)',
    labelEn: 'Defense (Default)',
    color: 'blue',
    troopRatio: { infantry: 5, lancer: 2, marksman: 3 },
    leaderComposition: { hero1Id: 'ahmose', hero2Id: 'philly', hero3Id: 'lyn' },
    joinerHeroes: ['patrick', 'sergey', 'bahiti'],
  },
  {
    id: 'defense_anti_archer',
    labelKo: '방창 수성 (상대 방궁 공성 5:0:5 카운터)',
    labelEn: 'Infantry-Lancer Defense (Counter to 5:0:5 Offense)',
    color: 'green',
    troopRatio: { infantry: 6, lancer: 4, marksman: 0 },
    leaderComposition: { hero1Id: 'ahmose', hero2Id: 'reina', hero3Id: 'zinman' },
    joinerHeroes: ['patrick', 'sergey', 'bahiti'],
    counterTo: 'offense_anti_spear',
  },
];

// ============================================================
// COUNTER MATRIX
// ============================================================

export const DEFAULT_COUNTER_MATRIX: CounterEntry[] = [
  {
    enemyCompKo: '방창 수성',
    enemyCompEn: 'Infantry-Lancer Defense',
    enemyRatio: '6:4:0',
    ourResponseKo: '방궁 공성',
    ourResponseEn: 'Infantry-Marksman Offense',
    ourRatio: '5:0:5',
  },
  {
    enemyCompKo: '방궁 공성',
    enemyCompEn: 'Infantry-Marksman Offense',
    enemyRatio: '5:0:5',
    ourResponseKo: '방창 수성',
    ourResponseEn: 'Infantry-Lancer Defense',
    ourRatio: '6:4:0',
  },
];

// ============================================================
// JOINER EFFECTS
// ============================================================

export const DEFAULT_JOINER_EFFECTS: JoinerEffectEntry[] = [
  {
    situationKo: '공성',
    situationEn: 'Offense',
    heroId: 'jessie',
    effectKo: '공격력 증가 (중복O)',
    effectEn: 'ATK increase (stackable)',
  },
  {
    situationKo: '수성',
    situationEn: 'Defense',
    heroId: 'sergey',
    effectKo: '피해 감소',
    effectEn: 'Damage reduction',
  },
  {
    situationKo: '수성',
    situationEn: 'Defense',
    heroId: 'patrick',
    effectKo: 'HP 25% 상승',
    effectEn: 'HP +25%',
  },
  {
    situationKo: '수성',
    situationEn: 'Defense',
    heroId: 'bahiti',
    effectKo: '피해 감소',
    effectEn: 'Damage reduction',
  },
];

// ============================================================
// STRATEGY TEMPLATES
// ============================================================

export const DEFAULT_STRATEGIES: StrategyTemplate[] = [
  {
    id: 'A',
    nameKo: '전략 A: 기본 카운터',
    nameEn: 'Strategy A: Basic Counter',
    icon: '\uD83C\uDD70\uFE0F',
    conditionKo: 'KOR 점령 상태',
    conditionEn: 'KOR holding castle',
    steps: [
      { order: 1, descriptionKo: 'KOR 캐슬 우선 점령', descriptionEn: 'KOR captures castle first' },
      {
        order: 2,
        descriptionKo: '상대 메인 집결 오픈',
        descriptionEn: 'Enemy opens main rally',
        subSteps: [
          { order: 1, descriptionKo: 'KOR에서 "상대 집결 열림" 콜', descriptionEn: 'KOR calls "Enemy rally open"' },
        ],
      },
      {
        order: 3,
        descriptionKo: 'HAN 카운터 집결 오픈',
        descriptionEn: 'HAN opens counter rally',
        subSteps: [
          {
            order: 1,
            descriptionKo: '여유시 상대 카운터 연맹에 추가 카운터 준비',
            descriptionEn: 'If possible, prepare additional counter against enemy counter alliance',
          },
        ],
      },
      {
        order: 4,
        descriptionKo: 'HAN 카운터 성공 (캐슬 점령)',
        descriptionEn: 'HAN counter success (castle captured)',
        subSteps: [
          {
            order: 1,
            descriptionKo: 'KOR 전 인원 개인 공격 출발',
            descriptionEn: 'KOR all members start solo attacks',
          },
        ],
      },
      {
        order: 5,
        descriptionKo: '타이밍 맞춰 HAN 전원 철수',
        descriptionEn: 'HAN full retreat on timing',
      },
    ],
  },
  {
    id: 'B',
    nameKo: '전략 B: 역카운터',
    nameEn: 'Strategy B: Reverse Counter',
    icon: '\uD83C\uDD71\uFE0F',
    conditionKo: '상대 점령 상태',
    conditionEn: 'Enemy holding castle',
    steps: [
      { order: 1, descriptionKo: 'HAN 메인 집결 오픈', descriptionEn: 'HAN opens main rally' },
      { order: 2, descriptionKo: '상대 메인 도시 주시', descriptionEn: 'Watch enemy main city' },
      {
        order: 3,
        descriptionKo: '상대 도시에 병력 지원 라인 확인',
        descriptionEn: 'Check reinforcement line to enemy city',
        subSteps: [
          { order: 1, descriptionKo: '상대 랠리 오픈 판단', descriptionEn: 'Judge as enemy rally open' },
        ],
      },
      { order: 4, descriptionKo: 'KOR 카운터 집결 오픈', descriptionEn: 'KOR opens counter rally' },
      {
        order: 5,
        descriptionKo: '예비 랠리 대기 (역카운터 대비)',
        descriptionEn: 'Reserve rally standby (for reverse counter)',
      },
    ],
  },
  {
    id: 'C',
    nameKo: '전략 C: 상대 카운터 없을 때',
    nameEn: 'Strategy C: No Enemy Counter',
    icon: '\uD83C\uDD72\uFE0F',
    conditionKo: '상대 카운터 연맹 없음',
    conditionEn: 'No enemy counter alliance',
    steps: [
      {
        order: 1,
        descriptionKo: '속공: 전략 A 그대로 → 상대에게 시간 안 줌',
        descriptionEn: 'Rush: Use Strategy A as-is → Don\'t give enemy time',
      },
      {
        order: 2,
        descriptionKo: '안정: 1랠리만 단순 운영',
        descriptionEn: 'Safe: Simple 1 rally operation',
      },
    ],
  },
];

// ============================================================
// CALL SIGNS
// ============================================================

export const DEFAULT_CALL_SIGNS: CallSign[] = [
  {
    id: 'cs1',
    situationKo: '상대 집결 오픈',
    situationEn: 'Enemy rally open',
    caller: 'KOR → HAN',
    messageKo: '"상대 집결 열림"',
    messageEn: '"Enemy rally open"',
  },
  {
    id: 'cs2',
    situationKo: '카운터 성공',
    situationEn: 'Counter success',
    caller: 'HAN → KOR',
    messageKo: '"카운터 성공, 개인공격 출발"',
    messageEn: '"Counter success, start solo attacks"',
  },
  {
    id: 'cs3',
    situationKo: '철수 타이밍',
    situationEn: 'Retreat timing',
    caller: 'HAN 집결장',
    messageKo: '"전원 철수"',
    messageEn: '"Full retreat"',
  },
  {
    id: 'cs4',
    situationKo: '상대 지원라인 확인',
    situationEn: 'Enemy reinforcement line spotted',
    caller: 'HAN',
    messageKo: '"상대 랠리 오픈, KOR 카운터"',
    messageEn: '"Enemy rally open, KOR counter"',
  },
];

// ============================================================
// CHECKLIST
// ============================================================

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    id: 'cl1',
    textKo: '상대 편성 확인 후 비율 조정',
    textEn: 'Adjust ratio after checking enemy composition',
    checked: false,
  },
  {
    id: 'cl2',
    textKo: 'KOR-HAN 디스코드 콜 연동',
    textEn: 'KOR-HAN Discord call connected',
    checked: false,
  },
  {
    id: 'cl3',
    textKo: '예비 랠리 집결장 대기',
    textEn: 'Reserve rally leader on standby',
    checked: false,
  },
  {
    id: 'cl4',
    textKo: '철수 타이밍 사전 협의',
    textEn: 'Pre-agree retreat timing',
    checked: false,
  },
];

// ============================================================
// HAN SPECIAL INSTRUCTIONS
// ============================================================

export const DEFAULT_HAN_INSTRUCTIONS: SpecialInstruction[] = [
  {
    id: 'hi1',
    titleKo: '0초 철수',
    titleEn: 'Zero-Second Retreat',
    contentKo:
      '카운터 성공 직후 집결장이 "전원 철수" 콜을 하면, 모든 집결원은 즉시 병력을 철수합니다.\n' +
      '집결 해제 버튼을 미리 준비해 두고, 콜과 동시에 클릭합니다.\n' +
      '0초 철수의 핵심은 상대가 역카운터를 준비하기 전에 병력을 빼는 것입니다.',
    contentEn:
      'As soon as the rally leader calls "Full retreat" after a successful counter, all joiners withdraw immediately.\n' +
      'Keep the disband button ready and click the moment the call is made.\n' +
      'The key to zero-second retreat is pulling troops before the enemy can prepare a reverse counter.',
  },
];

// ============================================================
// DEEP DIVE RANK ICONS
// ============================================================

export function getDeepDiveIcon(rank: number | null): string {
  if (rank === null) return '';
  if (rank === 1) return '\uD83E\uDD47';
  if (rank === 2) return '\uD83E\uDD48';
  if (rank === 3) return '\uD83E\uDD49';
  if (rank <= 10) return '\u2B50';
  if (rank <= 40) return '\uD83D\uDD39';
  return '';
}

// ============================================================
// RALLY COLOR CONFIG
// ============================================================

export const RALLY_COLORS = {
  red: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-300 dark:border-red-700', text: 'text-red-600 dark:text-red-400', badge: 'bg-red-500', emoji: '\uD83D\uDD34' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-600 dark:text-yellow-400', badge: 'bg-yellow-500', emoji: '\uD83D\uDFE1' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-500', emoji: '\uD83D\uDD35' },
  green: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-300 dark:border-green-700', text: 'text-green-600 dark:text-green-400', badge: 'bg-green-500', emoji: '\uD83D\uDFE2' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-600 dark:text-purple-400', badge: 'bg-purple-500', emoji: '\uD83D\uDFE3' },
} as const;

// Defense joiner hero rotation (Patrick only)
export const DEFENSE_JOINER_ROTATION = ['patrick'] as const;

// Default alliance settings
export const DEFAULT_ALLIANCE_SETTINGS = {
  allianceName: 'HAN',
  serverNumber: '#3074',
  leaderNickname: '집냥이',
  partnerAlliance: 'KOR',
} as const;
