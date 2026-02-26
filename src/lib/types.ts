// ============================================================
// CORE DOMAIN TYPES
// ============================================================

export type TroopType = 'infantry' | 'lancer' | 'marksman';
export type HeroClass = TroopType;
export type HeroRole = 'offense' | 'defense';
export type FCLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// ============================================================
// HERO DEFINITIONS
// ============================================================

export interface JoinerEffect {
  descriptionKo: string;
  descriptionEn: string;
  stackable: boolean;
}

export interface Hero {
  id: string;
  nameKo: string;
  nameEn: string;
  heroClass: HeroClass;
  role: HeroRole;
  generation: number;
  statPercent?: number;
  joinerEffect?: JoinerEffect;
}

// ============================================================
// MEMBER DATA (from Excel)
// ============================================================

export interface AllianceMember {
  id: string;
  rank: number;
  nickname: string;
  combatPower: string;
  combatPowerNumeric: number;
  fcLevel: number;
  deepDiveRank: number | null;
  stage: number | null;
  isFC5: boolean;
}

export type MemberGroup =
  | 'castle'
  | 'turret'
  | 'counter_standby'
  | 'substitute';

export interface AssignedMember extends AllianceMember {
  group: MemberGroup;
  squadId?: string;
  offenseHero?: string;
  defenseHero?: string;
  substituteFor?: string;
}

// ============================================================
// SQUAD (분대)
// ============================================================

export type SquadAlliance = 'KOR' | 'HAN';
export type SquadRole = 'defense' | 'counter';

export interface Squad {
  id: string;
  name: string;
  alliance: SquadAlliance;
  role: SquadRole;
  members: AssignedMember[];
  substitutes: AssignedMember[];
  joinerHero: string;
}

// ============================================================
// RALLY CONFIGURATION
// ============================================================

export type RallyTypeId =
  | 'offense_default'
  | 'offense_anti_spear'
  | 'defense_default'
  | 'defense_anti_archer';

export interface TroopRatio {
  infantry: number;
  lancer: number;
  marksman: number;
}

export interface RallyLeaderSlot {
  hero1Id: string;
  hero2Id: string;
  hero3Id: string;
}

export interface RallyType {
  id: RallyTypeId;
  labelKo: string;
  labelEn: string;
  color: 'red' | 'yellow' | 'blue' | 'green';
  troopRatio: TroopRatio;
  leaderComposition: RallyLeaderSlot;
  joinerHeroes: string[];
  counterTo?: RallyTypeId;
}

export interface RallyLeaderInfo {
  memberId: string;
  nickname: string;
  combatPower: string;
}

export interface RallyLeaderAssignment {
  main: RallyLeaderInfo;
  sub: RallyLeaderInfo;
  substitutes: RallyLeaderInfo[];  // 대체 집결장 목록
}

// ============================================================
// STRATEGY TEMPLATES
// ============================================================

export type StrategyTemplateId = string;

export interface StrategyStep {
  order: number;
  descriptionKo: string;
  descriptionEn: string;
  subSteps?: StrategyStep[];
}

export interface StrategyTemplate {
  id: StrategyTemplateId;
  nameKo: string;
  nameEn: string;
  icon: string;
  conditionKo: string;
  conditionEn: string;
  steps: StrategyStep[];
}

// ============================================================
// CALL SIGNS & CHECKLIST
// ============================================================

export interface CallSign {
  id: string;
  situationKo: string;
  situationEn: string;
  caller: string;
  messageKo: string;
  messageEn: string;
}

export interface ChecklistItem {
  id: string;
  textKo: string;
  textEn: string;
  checked: boolean;
}

// ============================================================
// HAN SPECIAL INSTRUCTIONS
// ============================================================

export interface SpecialInstruction {
  id: string;
  titleKo: string;
  titleEn: string;
  contentKo: string;
  contentEn: string;
}

// ============================================================
// FULL STRATEGY DOCUMENT
// ============================================================

export interface StrategyDocument {
  title: string;
  lastUpdated: string;
  discordLink: string;
  legendaryHeroes: Hero[];
  rallyTypes: RallyType[];
  counterMatrix: CounterEntry[];
  joinerEffects: JoinerEffectEntry[];
  participationRequirement: string;
  rallyLeaders: RallyLeaderAssignment;
  squads: Squad[];
  hanSpecialInstructions: SpecialInstruction[];
  strategies: StrategyTemplate[];
  callSigns: CallSign[];
  checklist: ChecklistItem[];
}

export interface CounterEntry {
  enemyCompKo: string;
  enemyCompEn: string;
  enemyRatio: string;
  ourResponseKo: string;
  ourResponseEn: string;
  ourRatio: string;
}

export interface JoinerEffectEntry {
  situationKo: string;
  situationEn: string;
  heroId: string;
  effectKo: string;
  effectEn: string;
}

// ============================================================
// APP STATE
// ============================================================

export interface AppState {
  allMembers: AllianceMember[];
  importedAt: string | null;

  assignedMembers: AssignedMember[];
  rallyLeaders: RallyLeaderAssignment | null;
  squads: Squad[];

  rallyConfigs: RallyType[];

  activeStrategies: StrategyTemplateId[];
  hanSpecialInstructions: SpecialInstruction[];
  callSigns: CallSign[];
  checklist: ChecklistItem[];

  generatedDocument: StrategyDocument | null;
  notionExportStatus: 'idle' | 'exporting' | 'success' | 'error';
  notionPageUrl: string | null;

  currentStep: number;
}
