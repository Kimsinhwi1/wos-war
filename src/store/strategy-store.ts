'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AllianceMember,
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
  HEROES,
} from '@/lib/constants';
import { autoAssignMembers } from '@/lib/auto-assign';
import { generateId } from '@/lib/utils';

interface StrategyStore {
  // Step 1: Members
  allMembers: AllianceMember[];
  importedAt: string | null;
  importMembers: (members: AllianceMember[]) => void;
  clearMembers: () => void;

  // Step 2: Assignment
  assignedMembers: AssignedMember[];
  rallyLeaders: RallyLeaderAssignment | null;
  squads: Squad[];
  setRallyLeaders: (leaders: RallyLeaderAssignment) => void;
  assignMemberToGroup: (memberId: string, group: MemberGroup) => void;
  setMemberHero: (memberId: string, type: 'offense' | 'defense', heroId: string) => void;
  runAutoAssign: () => void;
  moveToSquad: (memberId: string, squadId: string) => void;
  removeFromSquad: (memberId: string) => void;
  moveSquadMember: (memberId: string, toSquadId: string) => void;

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
      // Step 1
      allMembers: [],
      importedAt: null,
      importMembers: (members) =>
        set({ allMembers: members, importedAt: new Date().toISOString() }),
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
        const { allMembers } = get();
        const result = autoAssignMembers(allMembers);
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

      // Step 5
      notionExportStatus: 'idle',
      notionPageUrl: null,
      setExportStatus: (status) => set({ notionExportStatus: status }),
      setNotionPageUrl: (url) => set({ notionPageUrl: url }),
      generateDocument: () => {
        const state = get();
        const gen4Heroes = HEROES.filter((h) => h.generation === 4);

        return {
          title: '4세대 SVS 캐슬전투 최종 전략서 (HAN)',
          lastUpdated: new Date().toISOString().split('T')[0],
          discordLink: 'https://discord.gg/CXXAGgEgm7',
          gen4Heroes,
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
      version: 3,
      migrate: () => {
        // v3: Editable strategies + squad member movement
        return {
          allMembers: [],
          importedAt: null,
          assignedMembers: [],
          rallyLeaders: null,
          squads: [],
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
