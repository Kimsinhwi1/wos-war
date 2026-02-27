'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AllianceMember,
  AllianceSettings,
  AssignedMember,
  Squad,
  RallyType,
  RallyLeaderAssignment,
  StrategyTemplate,
  StrategyTemplateId,
  StrategyStep,
  SpecialInstruction,
  CallSign,
  ChecklistItem,
  MemberGroup,
  StrategyDocument,
  RallyTypeId,
} from '@/lib/types';
import {
  DEFAULT_RALLY_TYPES,
  DEFAULT_STRATEGIES,
  DEFAULT_CALL_SIGNS,
  DEFAULT_CHECKLIST,
  DEFAULT_HAN_INSTRUCTIONS,
  DEFAULT_COUNTER_MATRIX,
  DEFAULT_JOINER_EFFECTS,
  DEFAULT_ALLIANCE_SETTINGS,
  HEROES,
} from '@/lib/constants';
import { autoAssignMembers } from '@/lib/auto-assign';
import { generateId, parseCombatPower, normalizeNickname, normalizeForMatch } from '@/lib/utils';

interface StrategyStore {
  // Alliance Settings
  allianceSettings: AllianceSettings;
  updateAllianceSettings: (updates: Partial<AllianceSettings>) => void;
  renameAllianceInTexts: (oldName: string, newName: string) => void;

  // Step 1: Members
  allMembers: AllianceMember[];
  importedAt: string | null;
  importMembers: (members: AllianceMember[]) => void;
  updateMember: (id: string, fields: Partial<Pick<AllianceMember, 'nickname' | 'combatPower' | 'fcLevel'>>) => void;
  mergeMembers: (newMembers: AllianceMember[]) => void;
  manualMerge: (keepId: string, removeId: string) => void;
  clearMembers: () => void;

  // Step 2: Assignment
  assignedMembers: AssignedMember[];
  rallyLeaders: RallyLeaderAssignment | null;
  squads: Squad[];
  turretRallyCount: number;
  setTurretRallyCount: (count: number) => void;
  setRallyLeaders: (leaders: RallyLeaderAssignment) => void;
  assignMemberToGroup: (memberId: string, group: MemberGroup) => void;
  setMemberHero: (memberId: string, type: 'offense' | 'defense', heroId: string) => void;
  runAutoAssign: () => void;
  moveToSquad: (memberId: string, squadId: string) => void;
  removeFromSquad: (memberId: string) => void;
  moveSquadMember: (memberId: string, toSquadId: string) => void;
  updateSquadJoinerHero: (squadId: string, type: 'defense' | 'offense', heroId: string) => void;
  updateSquadRallyLeader: (squadId: string, leaderId: string | undefined) => void;

  // Step 3: Rally Config
  rallyConfigs: RallyType[];
  updateRallyConfig: (rallyId: RallyTypeId, updates: Partial<RallyType>) => void;
  resetRallyDefaults: () => void;

  // Step 4: Strategy
  strategies: StrategyTemplate[];
  activeStrategies: StrategyTemplateId[];
  toggleStrategy: (id: StrategyTemplateId) => void;
  updateStrategy: (id: StrategyTemplateId, updates: Partial<StrategyTemplate>) => void;
  updateStrategyStep: (strategyId: StrategyTemplateId, stepOrder: number, field: 'descriptionKo' | 'descriptionEn', value: string) => void;
  addStrategy: () => void;
  removeStrategy: (id: StrategyTemplateId) => void;
  hanSpecialInstructions: SpecialInstruction[];
  updateInstruction: (id: string, updates: Partial<SpecialInstruction>) => void;
  addInstruction: (titleKo: string) => void;
  removeInstruction: (id: string) => void;
  callSigns: CallSign[];
  updateCallSign: (id: string, updates: Partial<CallSign>) => void;
  addCallSign: () => void;
  removeCallSign: (id: string) => void;
  checklist: ChecklistItem[];
  toggleChecklistItem: (id: string) => void;
  addChecklistItem: (textKo: string, textEn: string) => void;
  removeChecklistItem: (id: string) => void;

  // Alliance Swap
  swapAlliances: () => void;

  // Step 5: Export
  generateDocument: () => StrategyDocument;
  notionExportStatus: 'idle' | 'exporting' | 'success' | 'error';
  notionPageUrl: string | null;
  setExportStatus: (status: 'idle' | 'exporting' | 'success' | 'error') => void;
  setNotionPageUrl: (url: string | null) => void;

  // Navigation
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

export const useStrategyStore = create<StrategyStore>()(
  persist(
    (set, get) => ({
      // Alliance Settings
      allianceSettings: { ...DEFAULT_ALLIANCE_SETTINGS },
      updateAllianceSettings: (updates) =>
        set((state) => ({
          allianceSettings: { ...state.allianceSettings, ...updates },
        })),
      renameAllianceInTexts: (oldName, newName) =>
        set((state) => {
          if (!oldName || !newName || oldName === newName) return state;

          const r = (text: string): string => text.split(oldName).join(newName);

          const rStep = (step: StrategyStep): StrategyStep => ({
            ...step,
            descriptionKo: r(step.descriptionKo),
            descriptionEn: r(step.descriptionEn),
            subSteps: step.subSteps?.map(rStep),
          });

          return {
            strategies: state.strategies.map((s) => ({
              ...s,
              nameKo: r(s.nameKo),
              nameEn: r(s.nameEn),
              conditionKo: r(s.conditionKo),
              conditionEn: r(s.conditionEn),
              steps: s.steps.map(rStep),
            })),
            callSigns: state.callSigns.map((cs) => ({
              ...cs,
              situationKo: r(cs.situationKo),
              situationEn: r(cs.situationEn),
              caller: r(cs.caller),
              messageKo: r(cs.messageKo),
              messageEn: r(cs.messageEn),
            })),
            hanSpecialInstructions: state.hanSpecialInstructions.map((inst) => ({
              ...inst,
              titleKo: r(inst.titleKo),
              titleEn: r(inst.titleEn),
              contentKo: r(inst.contentKo),
              contentEn: r(inst.contentEn),
            })),
            checklist: state.checklist.map((ci) => ({
              ...ci,
              textKo: r(ci.textKo),
              textEn: r(ci.textEn),
            })),
          };
        }),

      // Step 1
      allMembers: [],
      importedAt: null,
      importMembers: (members) =>
        set({ allMembers: members, importedAt: new Date().toISOString() }),
      updateMember: (id, fields) =>
        set((state) => ({
          allMembers: state.allMembers.map((m) => {
            if (m.id !== id) return m;
            const updated = { ...m };
            if (fields.nickname !== undefined && fields.nickname.trim() !== '') {
              updated.nickname = fields.nickname.trim();
            }
            if (fields.combatPower !== undefined) {
              updated.combatPower = fields.combatPower;
              updated.combatPowerNumeric = parseCombatPower(fields.combatPower);
            }
            if (fields.fcLevel !== undefined) {
              updated.fcLevel = Math.max(0, Math.min(10, fields.fcLevel));
              updated.isFC5 = updated.fcLevel >= 5;
            }
            return updated;
          }),
        })),
      mergeMembers: (newMembers) =>
        set((state) => {
          // normalizeForMatch로 매칭 (특수문자/공백 모두 제거, 소문자화)
          const memberMap = new Map<string, AllianceMember>();

          // Existing members first
          for (const m of state.allMembers) {
            const key = normalizeForMatch(m.nickname);
            memberMap.set(key, m);
          }
          // Merge new members
          for (const m of newMembers) {
            const key = normalizeForMatch(m.nickname);
            const existing = memberMap.get(key);
            if (existing) {
              const bestNickname = existing.nickname.length >= m.nickname.length
                ? existing.nickname : m.nickname;
              memberMap.set(key, {
                ...existing,
                nickname: normalizeNickname(bestNickname),
                combatPower: m.combatPowerNumeric > existing.combatPowerNumeric ? m.combatPower : existing.combatPower,
                combatPowerNumeric: Math.max(m.combatPowerNumeric, existing.combatPowerNumeric),
                fcLevel: Math.max(m.fcLevel, existing.fcLevel),
                deepDiveRank: m.deepDiveRank ?? existing.deepDiveRank,
                stage: m.stage ?? existing.stage,
                isFC5: Math.max(m.fcLevel, existing.fcLevel) >= 5,
              });
            } else {
              memberMap.set(key, { ...m, nickname: normalizeNickname(m.nickname) });
            }
          }
          const merged = Array.from(memberMap.values()).map((m, i) => ({ ...m, rank: i + 1 }));
          return { allMembers: merged, importedAt: new Date().toISOString() };
        }),
      manualMerge: (keepId, removeId) =>
        set((state) => {
          const keep = state.allMembers.find((m) => m.id === keepId);
          const remove = state.allMembers.find((m) => m.id === removeId);
          if (!keep || !remove) return state;
          const merged: AllianceMember = {
            ...keep,
            combatPower: remove.combatPowerNumeric > keep.combatPowerNumeric ? remove.combatPower : keep.combatPower,
            combatPowerNumeric: Math.max(keep.combatPowerNumeric, remove.combatPowerNumeric),
            fcLevel: Math.max(keep.fcLevel, remove.fcLevel),
            isFC5: Math.max(keep.fcLevel, remove.fcLevel) >= 5,
            deepDiveRank: keep.deepDiveRank ?? remove.deepDiveRank,
            stage: keep.stage ?? remove.stage,
          };
          const updated = state.allMembers
            .filter((m) => m.id !== removeId)
            .map((m) => (m.id === keepId ? merged : m));
          return { allMembers: updated };
        }),
      clearMembers: () =>
        set({
          allMembers: [],
          importedAt: null,
          assignedMembers: [],
          rallyLeaders: null,
          squads: [],
        }),

      // Step 2
      assignedMembers: [],
      rallyLeaders: null,
      squads: [],
      turretRallyCount: 0,
      setTurretRallyCount: (count) => set({ turretRallyCount: Math.max(0, count) }),
      setRallyLeaders: (leaders) => set({ rallyLeaders: leaders }),
      assignMemberToGroup: (memberId, group) =>
        set((state) => ({
          assignedMembers: state.assignedMembers.map((m) =>
            m.id === memberId ? { ...m, group } : m,
          ),
        })),
      setMemberHero: (memberId, type, heroId) =>
        set((state) => ({
          assignedMembers: state.assignedMembers.map((m) =>
            m.id === memberId
              ? {
                  ...m,
                  ...(type === 'offense' ? { offenseHero: heroId } : { defenseHero: heroId }),
                }
              : m,
          ),
        })),
      runAutoAssign: () => {
        const { allMembers, allianceSettings, turretRallyCount } = get();
        const result = autoAssignMembers(allMembers, allianceSettings.allianceName, turretRallyCount);
        set({
          rallyLeaders: result.rallyLeaders,
          squads: result.squads,
          assignedMembers: result.assignedMembers,
        });
      },
      moveToSquad: (memberId, squadId) =>
        set((state) => {
          const squad = state.squads.find((s) => s.id === squadId);
          if (!squad) return state;
          return {
            assignedMembers: state.assignedMembers.map((m) =>
              m.id === memberId ? { ...m, squadId, group: 'castle' } : m,
            ),
          };
        }),
      removeFromSquad: (memberId) =>
        set((state) => ({
          assignedMembers: state.assignedMembers.map((m) =>
            m.id === memberId ? { ...m, squadId: undefined, group: 'turret' } : m,
          ),
        })),
      updateSquadJoinerHero: (squadId, type, heroId) =>
        set((state) => ({
          squads: state.squads.map((s) =>
            s.id === squadId
              ? { ...s, ...(type === 'defense' ? { defenseJoinerHero: heroId } : { offenseJoinerHero: heroId }) }
              : s,
          ),
        })),
      updateSquadRallyLeader: (squadId, leaderId) =>
        set((state) => ({
          squads: state.squads.map((s) =>
            s.id === squadId ? { ...s, rallyLeaderId: leaderId } : s,
          ),
        })),
      moveSquadMember: (memberId, toSquadId) =>
        set((state) => {
          // Find source squad containing the member
          const sourceSquad = state.squads.find(
            (s) => s.members.some((m) => m.id === memberId) || s.substitutes.some((m) => m.id === memberId),
          );
          const targetSquad = state.squads.find((s) => s.id === toSquadId);
          if (!sourceSquad || !targetSquad || sourceSquad.id === targetSquad.id) return state;

          // Find the member in source (could be in members or substitutes)
          const member =
            sourceSquad.members.find((m) => m.id === memberId) ??
            sourceSquad.substitutes.find((m) => m.id === memberId);
          if (!member) return state;

          const isInSubs = sourceSquad.substitutes.some((m) => m.id === memberId);

          return {
            squads: state.squads.map((s) => {
              if (s.id === sourceSquad.id) {
                return {
                  ...s,
                  members: isInSubs ? s.members : s.members.filter((m) => m.id !== memberId),
                  substitutes: isInSubs ? s.substitutes.filter((m) => m.id !== memberId) : s.substitutes,
                };
              }
              if (s.id === toSquadId) {
                return { ...s, members: [...s.members, { ...member, squadId: toSquadId }] };
              }
              return s;
            }),
            assignedMembers: state.assignedMembers.map((m) =>
              m.id === memberId ? { ...m, squadId: toSquadId } : m,
            ),
          };
        }),

      // Step 3
      rallyConfigs: DEFAULT_RALLY_TYPES,
      updateRallyConfig: (rallyId, updates) =>
        set((state) => ({
          rallyConfigs: state.rallyConfigs.map((r) =>
            r.id === rallyId ? { ...r, ...updates } : r,
          ),
        })),
      resetRallyDefaults: () => set({ rallyConfigs: DEFAULT_RALLY_TYPES }),

      // Step 4
      strategies: DEFAULT_STRATEGIES.map((s) => ({ ...s })),
      activeStrategies: ['A', 'B', 'C'],
      toggleStrategy: (id) =>
        set((state) => ({
          activeStrategies: state.activeStrategies.includes(id)
            ? state.activeStrategies.filter((s) => s !== id)
            : [...state.activeStrategies, id],
        })),
      updateStrategy: (id, updates) =>
        set((state) => ({
          strategies: state.strategies.map((s) =>
            s.id === id ? { ...s, ...updates } : s,
          ),
        })),
      updateStrategyStep: (strategyId, stepOrder, field, value) =>
        set((state) => ({
          strategies: state.strategies.map((s) =>
            s.id === strategyId
              ? {
                  ...s,
                  steps: s.steps.map((step) =>
                    step.order === stepOrder ? { ...step, [field]: value } : step,
                  ),
                }
              : s,
          ),
        })),
      addStrategy: () =>
        set((state) => {
          const newId = generateId();
          const newStrategy: StrategyTemplate = {
            id: newId,
            nameKo: '새 전략',
            nameEn: 'New Strategy',
            icon: '\u{1F4CB}',
            conditionKo: '조건을 입력하세요',
            conditionEn: 'Enter condition',
            steps: [
              { order: 1, descriptionKo: '단계 1', descriptionEn: 'Step 1' },
            ],
          };
          return {
            strategies: [...state.strategies, newStrategy],
            activeStrategies: [...state.activeStrategies, newId],
          };
        }),
      removeStrategy: (id) =>
        set((state) => ({
          strategies: state.strategies.filter((s) => s.id !== id),
          activeStrategies: state.activeStrategies.filter((s) => s !== id),
        })),
      hanSpecialInstructions: DEFAULT_HAN_INSTRUCTIONS,
      updateInstruction: (id, updates) =>
        set((state) => ({
          hanSpecialInstructions: state.hanSpecialInstructions.map((inst) =>
            inst.id === id ? { ...inst, ...updates } : inst,
          ),
        })),
      addInstruction: (titleKo) =>
        set((state) => ({
          hanSpecialInstructions: [
            ...state.hanSpecialInstructions,
            {
              id: generateId(),
              titleKo,
              titleEn: titleKo,
              contentKo: '',
              contentEn: '',
            },
          ],
        })),
      removeInstruction: (id) =>
        set((state) => ({
          hanSpecialInstructions: state.hanSpecialInstructions.filter((inst) => inst.id !== id),
        })),
      callSigns: DEFAULT_CALL_SIGNS,
      updateCallSign: (id, updates) =>
        set((state) => ({
          callSigns: state.callSigns.map((cs) =>
            cs.id === id ? { ...cs, ...updates } : cs,
          ),
        })),
      addCallSign: () =>
        set((state) => ({
          callSigns: [
            ...state.callSigns,
            {
              id: generateId(),
              situationKo: '',
              situationEn: '',
              caller: '',
              messageKo: '',
              messageEn: '',
            },
          ],
        })),
      removeCallSign: (id) =>
        set((state) => ({
          callSigns: state.callSigns.filter((cs) => cs.id !== id),
        })),
      checklist: DEFAULT_CHECKLIST,
      toggleChecklistItem: (id) =>
        set((state) => ({
          checklist: state.checklist.map((ci) =>
            ci.id === id ? { ...ci, checked: !ci.checked } : ci,
          ),
        })),
      addChecklistItem: (textKo, textEn) =>
        set((state) => ({
          checklist: [
            ...state.checklist,
            { id: generateId(), textKo, textEn, checked: false },
          ],
        })),
      removeChecklistItem: (id) =>
        set((state) => ({
          checklist: state.checklist.filter((ci) => ci.id !== id),
        })),

      // Alliance Swap
      swapAlliances: () =>
        set((state) => {
          const a = state.allianceSettings.allianceName;
          const b = state.allianceSettings.partnerAlliance;
          if (!a || !b || a === b) return state;

          const PLACEHOLDER = '__SWAP__';
          const swap = (text: string): string => {
            return text.split(a).join(PLACEHOLDER).split(b).join(a).split(PLACEHOLDER).join(b);
          };

          const swapStep = (step: StrategyStep): StrategyStep => ({
            ...step,
            descriptionKo: swap(step.descriptionKo),
            descriptionEn: swap(step.descriptionEn),
            subSteps: step.subSteps?.map(swapStep),
          });

          return {
            allianceSettings: {
              ...state.allianceSettings,
              allianceName: b,
              partnerAlliance: a,
            },
            strategies: state.strategies.map((s) => ({
              ...s,
              nameKo: swap(s.nameKo),
              nameEn: swap(s.nameEn),
              conditionKo: swap(s.conditionKo),
              conditionEn: swap(s.conditionEn),
              steps: s.steps.map(swapStep),
            })),
            callSigns: state.callSigns.map((cs) => ({
              ...cs,
              situationKo: swap(cs.situationKo),
              situationEn: swap(cs.situationEn),
              caller: swap(cs.caller),
              messageKo: swap(cs.messageKo),
              messageEn: swap(cs.messageEn),
            })),
            hanSpecialInstructions: state.hanSpecialInstructions.map((inst) => ({
              ...inst,
              titleKo: swap(inst.titleKo),
              titleEn: swap(inst.titleEn),
              contentKo: swap(inst.contentKo),
              contentEn: swap(inst.contentEn),
            })),
            checklist: state.checklist.map((ci) => ({
              ...ci,
              textKo: swap(ci.textKo),
              textEn: swap(ci.textEn),
            })),
          };
        }),

      // Step 5
      notionExportStatus: 'idle',
      notionPageUrl: null,
      setExportStatus: (status) => set({ notionExportStatus: status }),
      setNotionPageUrl: (url) => set({ notionPageUrl: url }),
      generateDocument: () => {
        const state = get();
        // 랠리 설정에서 실제 사용 중인 영웅만 추출
        const usedHeroIds = new Set<string>();
        state.rallyConfigs.forEach((r) => {
          usedHeroIds.add(r.leaderComposition.hero1Id);
          usedHeroIds.add(r.leaderComposition.hero2Id);
          usedHeroIds.add(r.leaderComposition.hero3Id);
          r.joinerHeroes.forEach((id) => usedHeroIds.add(id));
        });
        const legendaryHeroes = HEROES.filter((h) => usedHeroIds.has(h.id));

        const { allianceName } = state.allianceSettings;
        return {
          title: `SVS 캐슬전투 최종 전략서 (${allianceName})`,
          lastUpdated: new Date().toISOString().split('T')[0],
          discordLink: state.allianceSettings.discordLink,
          legendaryHeroes,
          rallyTypes: state.rallyConfigs,
          counterMatrix: DEFAULT_COUNTER_MATRIX,
          joinerEffects: DEFAULT_JOINER_EFFECTS,
          participationRequirement: 'FC5',
          rallyLeaders: state.rallyLeaders!,
          squads: state.squads,
          hanSpecialInstructions: state.hanSpecialInstructions,
          strategies: state.strategies.filter((s) =>
            state.activeStrategies.includes(s.id),
          ),
          callSigns: state.callSigns,
          checklist: state.checklist,
        };
      },

      // Navigation
      currentStep: 1,
      setCurrentStep: (step) => set({ currentStep: step }),
    }),
    {
      name: 'wos-strategy-store',
      version: 6,
      migrate: () => {
        // v6: Rally system refactor - no defense/counter distinction, dual joiner heroes
        return {
          allMembers: [],
          importedAt: null,
          allianceSettings: { ...DEFAULT_ALLIANCE_SETTINGS },
          assignedMembers: [],
          rallyLeaders: null,
          squads: [],
          turretRallyCount: 0,
          rallyConfigs: DEFAULT_RALLY_TYPES,
          strategies: DEFAULT_STRATEGIES.map((s) => ({ ...s })),
          activeStrategies: ['A', 'B', 'C'] as StrategyTemplateId[],
          hanSpecialInstructions: DEFAULT_HAN_INSTRUCTIONS,
          callSigns: DEFAULT_CALL_SIGNS,
          checklist: DEFAULT_CHECKLIST,
          notionExportStatus: 'idle' as const,
          notionPageUrl: null,
          currentStep: 1,
        };
      },
    },
  ),
);
