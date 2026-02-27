'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStrategyStore } from '@/store/strategy-store';
import { toast } from 'sonner';
import type { StrategyTemplate, StrategyTemplateId, SpecialInstruction } from '@/lib/types';

export default function StrategyPage() {
  const router = useRouter();
  const {
    allianceSettings,
    strategies,
    activeStrategies,
    toggleStrategy,
    updateStrategy,
    updateStrategyStep,
    addStrategy,
    removeStrategy,
    hanSpecialInstructions,
    updateInstruction,
    addInstruction,
    removeInstruction,
    callSigns,
    updateCallSign,
    addCallSign,
    removeCallSign,
    checklist,
    toggleChecklistItem,
    addChecklistItem,
    removeChecklistItem,
    swapAlliances,
    setCurrentStep,
  } = useStrategyStore();

  const [newItemKo, setNewItemKo] = useState('');
  const [newItemEn, setNewItemEn] = useState('');
  const [newInstructionTitle, setNewInstructionTitle] = useState('');

  useEffect(() => {
    setCurrentStep(4);
  }, [setCurrentStep]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Step 4: 전략 편집</h2>
        <button
          onClick={() => {
            swapAlliances();
            toast.success(`연맹 스왑 완료: ${allianceSettings.allianceName} ↔ ${allianceSettings.partnerAlliance}`);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
        >
          🔄 {allianceSettings.allianceName} ↔ {allianceSettings.partnerAlliance}
        </button>
      </div>

      {/* Special Instructions */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg text-yellow-600 dark:text-yellow-400">
            {'\u26A0\uFE0F'} 특별 지침
          </h3>
        </div>
        {hanSpecialInstructions.map((inst) => (
          <SpecialInstructionCard
            key={inst.id}
            instruction={inst}
            onUpdate={(updates) => updateInstruction(inst.id, updates)}
            onRemove={() => {
              removeInstruction(inst.id);
              toast.success('특별 지침을 삭제했습니다');
            }}
          />
        ))}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newInstructionTitle}
            onChange={(e) => setNewInstructionTitle(e.target.value)}
            placeholder="새 특별 지침 제목"
            className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newInstructionTitle.trim()) {
                addInstruction(newInstructionTitle.trim());
                setNewInstructionTitle('');
                toast.success('특별 지침을 추가했습니다');
              }
            }}
          />
          <button
            onClick={() => {
              if (newInstructionTitle.trim()) {
                addInstruction(newInstructionTitle.trim());
                setNewInstructionTitle('');
                toast.success('특별 지침을 추가했습니다');
              }
            }}
            className="px-3 py-1.5 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
          >
            + 지침 추가
          </button>
        </div>
      </section>

      {/* Strategy Templates */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">캐슬전 전략</h3>
          <button
            onClick={() => {
              addStrategy();
              toast.success('새 전략을 추가했습니다');
            }}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            + 전략 추가
          </button>
        </div>
        {strategies.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            isActive={activeStrategies.includes(strategy.id)}
            onToggle={() => toggleStrategy(strategy.id)}
            onUpdateStrategy={(updates) => updateStrategy(strategy.id, updates)}
            onUpdateStep={(stepOrder, field, value) =>
              updateStrategyStep(strategy.id, stepOrder, field, value)
            }
            onRemove={() => {
              removeStrategy(strategy.id);
              toast.success('전략을 삭제했습니다');
            }}
          />
        ))}
      </section>

      {/* Call Signs */}
      <section className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">콜 정리</h3>
          <button
            onClick={() => {
              addCallSign();
              toast.success('콜을 추가했습니다');
            }}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            + 콜 추가
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-left">
                <th className="pb-2 pr-2">상황</th>
                <th className="pb-2 pr-2">콜 담당</th>
                <th className="pb-2 pr-2">내용</th>
                <th className="pb-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {callSigns.map((cs) => (
                <tr key={cs.id} className="border-t border-gray-200 dark:border-gray-800">
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={cs.situationKo}
                      onChange={(e) => updateCallSign(cs.id, { situationKo: e.target.value })}
                      className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs sm:text-sm w-full text-gray-900 dark:text-gray-100"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={cs.caller}
                      onChange={(e) => updateCallSign(cs.id, { caller: e.target.value })}
                      className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs sm:text-sm w-full text-gray-900 dark:text-gray-100"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={cs.messageKo}
                      onChange={(e) => updateCallSign(cs.id, { messageKo: e.target.value })}
                      className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs sm:text-sm w-full text-gray-900 dark:text-gray-100"
                    />
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => {
                        removeCallSign(cs.id);
                        toast.success('콜을 삭제했습니다');
                      }}
                      className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-xs px-1"
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Checklist */}
      <section className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">체크리스트</h3>
        <div className="space-y-2">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleChecklistItem(item.id)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className={`flex-1 text-xs sm:text-sm ${item.checked ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                {item.textKo}
              </span>
              <button
                onClick={() => removeChecklistItem(item.id)}
                className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-xs px-2"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newItemKo}
            onChange={(e) => setNewItemKo(e.target.value)}
            placeholder="새 항목 (한국어)"
            className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100"
          />
          <input
            type="text"
            value={newItemEn}
            onChange={(e) => setNewItemEn(e.target.value)}
            placeholder="English"
            className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={() => {
              if (newItemKo.trim()) {
                addChecklistItem(newItemKo.trim(), newItemEn.trim() || newItemKo.trim());
                setNewItemKo('');
                setNewItemEn('');
              }
            }}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            추가
          </button>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => { setCurrentStep(3); router.push('/rally'); }}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
        >
          &larr; 이전
        </button>
        <button
          onClick={() => { setCurrentStep(5); router.push('/preview'); }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          다음: 미리보기 &rarr;
        </button>
      </div>
    </div>
  );
}

function SpecialInstructionCard({
  instruction,
  onUpdate,
  onRemove,
}: {
  instruction: SpecialInstruction;
  onUpdate: (updates: Partial<SpecialInstruction>) => void;
  onRemove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-300 dark:border-yellow-800">
      <div className="flex items-center justify-between mb-2">
        {isEditing ? (
          <input
            type="text"
            value={instruction.titleKo}
            onChange={(e) => onUpdate({ titleKo: e.target.value })}
            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm font-medium text-yellow-700 dark:text-yellow-300 flex-1 mr-2"
          />
        ) : (
          <h4 className="font-medium text-yellow-700 dark:text-yellow-300">{instruction.titleKo}</h4>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {isEditing ? '완료' : '편집'}
          </button>
          <button
            onClick={onRemove}
            className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
          >
            삭제
          </button>
        </div>
      </div>
      {isEditing ? (
        <textarea
          value={instruction.contentKo}
          onChange={(e) => onUpdate({ contentKo: e.target.value })}
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm min-h-[80px] text-gray-900 dark:text-gray-100"
        />
      ) : (
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{instruction.contentKo}</p>
      )}
    </div>
  );
}

function StrategyCard({
  strategy,
  isActive,
  onToggle,
  onUpdateStrategy,
  onUpdateStep,
  onRemove,
}: {
  strategy: StrategyTemplate;
  isActive: boolean;
  onToggle: () => void;
  onUpdateStrategy: (updates: Partial<StrategyTemplate>) => void;
  onUpdateStep: (stepOrder: number, field: 'descriptionKo' | 'descriptionEn', value: string) => void;
  onRemove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className={`p-4 rounded-lg border transition-opacity ${
      isActive
        ? 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900'
        : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-50'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={strategy.nameKo}
                onChange={(e) => onUpdateStrategy({ nameKo: e.target.value })}
                className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm font-medium w-full text-gray-900 dark:text-gray-100"
              />
              <input
                type="text"
                value={strategy.conditionKo}
                onChange={(e) => onUpdateStrategy({ conditionKo: e.target.value })}
                className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-500 dark:text-gray-400 w-full"
                placeholder="발동 조건"
              />
            </div>
          ) : (
            <h4 className="font-medium text-gray-900 dark:text-white">
              {strategy.icon} {strategy.nameKo}
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({strategy.conditionKo})</span>
            </h4>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          {isActive && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {isEditing ? '완료' : '편집'}
            </button>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={onToggle}
              className="w-4 h-4 accent-blue-500"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">{isActive ? '활성' : '비활성'}</span>
          </label>
          <button
            onClick={onRemove}
            className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
          >
            삭제
          </button>
        </div>
      </div>
      {isActive && (
        <ol className="space-y-1 ml-4">
          {strategy.steps.map((step) => (
            <li key={step.order} className="text-sm text-gray-700 dark:text-gray-300 list-decimal">
              {isEditing ? (
                <input
                  type="text"
                  value={step.descriptionKo}
                  onChange={(e) => onUpdateStep(step.order, 'descriptionKo', e.target.value)}
                  className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm w-full text-gray-900 dark:text-gray-100"
                />
              ) : (
                step.descriptionKo
              )}
              {step.subSteps && (
                <ul className="ml-4 mt-1">
                  {step.subSteps.map((sub) => (
                    <li key={sub.order} className="text-gray-500 dark:text-gray-400 text-xs list-disc">
                      {sub.descriptionKo}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
