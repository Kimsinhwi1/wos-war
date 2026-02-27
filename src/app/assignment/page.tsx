'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStrategyStore } from '@/store/strategy-store';
import { getDeepDiveIcon, HEROES } from '@/lib/constants';
import { toast } from 'sonner';
import type { AllianceMember, RallyLeaderInfo, AssignedMember, Squad, SquadRole } from '@/lib/types';

// Epic joiner heroes for selection
const JOINER_HEROES = HEROES.filter((h) => h.generation === 0);
const DEFENSE_JOINERS = JOINER_HEROES.filter((h) => h.role === 'defense');
const OFFENSE_JOINERS = JOINER_HEROES.filter((h) => h.role === 'offense');

export default function AssignmentPage() {
  const router = useRouter();
  const {
    allMembers,
    assignedMembers,
    rallyLeaders,
    squads,
    setCurrentStep,
    runAutoAssign,
    setRallyLeaders,
    moveSquadMember,
    updateSquadRole,
    updateSquadJoinerHero,
  } = useStrategyStore();

  const [dragMemberId, setDragMemberId] = useState<string | null>(null);
  const [dragOverSquadId, setDragOverSquadId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentStep(2);
  }, [setCurrentStep]);

  const fc5Members = allMembers
    .filter((m) => m.isFC5)
    .sort((a, b) => {
      if (a.deepDiveRank === null && b.deepDiveRank === null) return 0;
      if (a.deepDiveRank === null) return 1;
      if (b.deepDiveRank === null) return -1;
      return a.deepDiveRank - b.deepDiveRank;
    });

  const handleDragStart = useCallback((e: React.DragEvent, memberId: string) => {
    setDragMemberId(memberId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', memberId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, squadId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSquadId(squadId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverSquadId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toSquadId: string) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData('text/plain');
    if (memberId) {
      moveSquadMember(memberId, toSquadId);
      toast.success('멤버를 이동했습니다');
    }
    setDragMemberId(null);
    setDragOverSquadId(null);
  }, [moveSquadMember]);

  const handleDragEnd = useCallback(() => {
    setDragMemberId(null);
    setDragOverSquadId(null);
  }, []);

  if (allMembers.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400 mb-4">먼저 멤버를 불러와주세요</p>
        <button
          onClick={() => router.push('/members')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          &larr; Step 1로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Step 2: 역할 배정</h2>
        <button
          onClick={() => {
            runAutoAssign();
            toast.success('자동 배정 완료!');
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          자동 배정
        </button>
      </div>

      {/* FC5 안내 */}
      <div className="p-3 bg-blue-100 dark:bg-blue-600/10 border border-blue-300 dark:border-blue-600/30 rounded-lg text-sm text-blue-700 dark:text-blue-300">
        캐슬(수성/공성 랠리)에는 <span className="font-bold text-blue-800 dark:text-blue-200">FC5 이상</span>만 배정됩니다. FC5 미만 멤버는 자동으로 포탑/대기에 배정됩니다.
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">FC5+ 인원</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{fc5Members.length}명</p>
        </div>
        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">랠리조</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{squads.length}개</p>
        </div>
        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">랠리 참여</p>
          <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
            {squads.reduce((sum, s) => sum + s.members.length, 0)}명
          </p>
        </div>
        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">포탑/대기</p>
          <p className="text-xl font-bold text-gray-500 dark:text-gray-400">
            {assignedMembers.filter((m) => m.group === 'turret').length}명
          </p>
        </div>
      </div>

      {/* Rally Leaders */}
      <section className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 space-y-4">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">집결장 지정</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LeaderPicker
            label="메인 집결장"
            current={rallyLeaders?.main}
            members={fc5Members}
            onSelect={(info) => {
              const base = rallyLeaders ?? {
                main: info,
                sub: { memberId: '', nickname: '', combatPower: '' },
                substitutes: [],
              };
              setRallyLeaders({ ...base, main: info });
            }}
          />
          <LeaderPicker
            label="서브 집결장"
            current={rallyLeaders?.sub}
            members={fc5Members}
            onSelect={(info) => {
              const base = rallyLeaders ?? {
                main: { memberId: '', nickname: '', combatPower: '' },
                sub: info,
                substitutes: [],
              };
              setRallyLeaders({ ...base, sub: info });
            }}
          />
        </div>
        {/* Substitute Leaders */}
        <div>
          <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-2">대체 집결장 (최대 2순위)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LeaderPicker
              label="대체 1순위"
              current={rallyLeaders?.substitutes?.[0]}
              members={fc5Members}
              onSelect={(info) => {
                const base = rallyLeaders ?? {
                  main: { memberId: '', nickname: '', combatPower: '' },
                  sub: { memberId: '', nickname: '', combatPower: '' },
                  substitutes: [],
                };
                const subs = [...(base.substitutes || [])];
                subs[0] = info;
                setRallyLeaders({ ...base, substitutes: subs });
              }}
            />
            <LeaderPicker
              label="대체 2순위"
              current={rallyLeaders?.substitutes?.[1]}
              members={fc5Members}
              onSelect={(info) => {
                const base = rallyLeaders ?? {
                  main: { memberId: '', nickname: '', combatPower: '' },
                  sub: { memberId: '', nickname: '', combatPower: '' },
                  substitutes: [],
                };
                const subs = [...(base.substitutes || [])];
                subs[1] = info;
                setRallyLeaders({ ...base, substitutes: subs });
              }}
            />
          </div>
        </div>
      </section>

      {/* Rally Groups with Drag & Drop */}
      {squads.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              랠리조 편성 ({squads.length}개, 조당 {squads[0]?.members.length}~{squads[squads.length - 1]?.members.length}명)
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">닉네임을 드래그하여 다른 조로 이동</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
            {squads.map((squad) => (
              <div
                key={squad.id}
                onDragOver={(e) => handleDragOver(e, squad.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, squad.id)}
                className={`p-3 sm:p-4 rounded-lg border transition-colors ${
                  dragOverSquadId === squad.id
                    ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 ring-2 ring-yellow-400/30'
                    : squad.role === 'defense'
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30'
                }`}
              >
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">
                      {squad.role === 'defense' ? '\uD83D\uDEE1\uFE0F' : '\u2694\uFE0F'} {squad.name}
                    </h4>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {squad.members.length}명
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Role selector */}
                    <select
                      value={squad.role}
                      onChange={(e) => {
                        const newRole = e.target.value as SquadRole;
                        updateSquadRole(squad.id, newRole);
                        // Auto-switch joiner hero when role changes
                        if (newRole === 'defense' && squad.joinerHero === 'jessie') {
                          updateSquadJoinerHero(squad.id, 'patrick');
                        } else if (newRole === 'counter' && squad.joinerHero !== 'jessie') {
                          updateSquadJoinerHero(squad.id, 'jessie');
                        }
                        toast.success(`${newRole === 'defense' ? '수성' : '공성'}으로 변경`);
                      }}
                      className="text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-gray-100"
                    >
                      <option value="defense">수성</option>
                      <option value="counter">공성</option>
                    </select>
                    {/* Joiner hero selector */}
                    <select
                      value={squad.joinerHero}
                      onChange={(e) => {
                        updateSquadJoinerHero(squad.id, e.target.value);
                        toast.success(`조이너 영웅: ${HEROES.find((h) => h.id === e.target.value)?.nameKo}`);
                      }}
                      className="text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-gray-100"
                    >
                      <optgroup label="수성 영웅">
                        {DEFENSE_JOINERS.map((h) => (
                          <option key={h.id} value={h.id}>{h.nameKo} - {h.joinerEffect?.descriptionKo}</option>
                        ))}
                      </optgroup>
                      <optgroup label="공성 영웅">
                        {OFFENSE_JOINERS.map((h) => (
                          <option key={h.id} value={h.id}>{h.nameKo} - {h.joinerEffect?.descriptionKo}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                {/* Members - Draggable */}
                <div className="space-y-1">
                  {squad.members.map((m, idx) => (
                    <div
                      key={m.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, m.id)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between text-xs sm:text-sm py-1 px-2 rounded cursor-grab active:cursor-grabbing select-none transition-opacity ${
                        dragMemberId === m.id
                          ? 'opacity-30 bg-gray-200/30 dark:bg-gray-800/30'
                          : 'bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <span className="text-gray-900 dark:text-gray-100">
                        <span className="text-gray-400 dark:text-gray-500 text-xs mr-1">{idx + 1}.</span>
                        {getDeepDiveIcon(m.deepDiveRank)} {m.nickname}
                      </span>
                      <div className="flex items-center gap-2">
                        {m.deepDiveRank && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">지심 {m.deepDiveRank}위</span>
                        )}
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{m.combatPower}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Substitutes */}
                {squad.substitutes.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-700">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">대체 인원</p>
                    {squad.substitutes.map((m, i) => (
                      <div
                        key={m.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, m.id)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between text-xs sm:text-sm py-1 px-2 text-yellow-600/70 dark:text-yellow-400/70 cursor-grab active:cursor-grabbing select-none ${
                          dragMemberId === m.id ? 'opacity-30' : ''
                        }`}
                      >
                        <span>
                          {i + 1}순위: {getDeepDiveIcon(m.deepDiveRank)} {m.nickname}
                        </span>
                        <div className="flex items-center gap-2">
                          {m.deepDiveRank && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">지심 {m.deepDiveRank}위</span>
                          )}
                          <span className="text-xs">{m.combatPower}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Turret Members */}
      {assignedMembers.filter((m) => m.group === 'turret').length > 0 && (
        <section className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">
            포탑 / 대기 멤버 ({assignedMembers.filter((m) => m.group === 'turret').length}명)
          </h3>
          {(() => {
            const turretMembers = assignedMembers.filter((m) => m.group === 'turret');
            const fc5Turret = turretMembers.filter((m) => m.isFC5);
            const nonFc5Turret = turretMembers.filter((m) => !m.isFC5);
            return (
              <div className="space-y-3">
                {fc5Turret.length > 0 && (
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">FC5+ 대기 ({fc5Turret.length}명)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1 sm:gap-2">
                      {fc5Turret.map((m) => (
                        <div key={m.id} className="text-xs sm:text-sm py-1.5 px-2 sm:px-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded text-gray-700 dark:text-gray-300">
                          {m.nickname} <span className="text-gray-400 dark:text-gray-500 text-xs">{m.combatPower}</span>
                          <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">FC{m.fcLevel}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {nonFc5Turret.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">FC5 미만 ({nonFc5Turret.length}명) - 캐슬 배정 불가</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1 sm:gap-2">
                      {nonFc5Turret.map((m) => (
                        <div key={m.id} className="text-xs sm:text-sm py-1.5 px-2 sm:px-3 bg-gray-100 dark:bg-gray-800 rounded text-gray-400 dark:text-gray-500">
                          {m.nickname} <span className="text-gray-400 dark:text-gray-600 text-xs">{m.combatPower}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-600 ml-1">FC{m.fcLevel}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </section>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => {
            setCurrentStep(1);
            router.push('/members');
          }}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
        >
          &larr; 이전
        </button>
        <button
          onClick={() => {
            if (!rallyLeaders) {
              toast.error('먼저 자동 배정을 실행해주세요');
              return;
            }
            setCurrentStep(3);
            router.push('/rally');
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          다음: 집결 설정 &rarr;
        </button>
      </div>
    </div>
  );
}

function LeaderPicker({
  label,
  current,
  members,
  onSelect,
}: {
  label: string;
  current?: RallyLeaderInfo;
  members: AllianceMember[];
  onSelect: (info: RallyLeaderInfo) => void;
}) {
  return (
    <div>
      <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{label}</label>
      <select
        value={current?.memberId ?? ''}
        onChange={(e) => {
          const m = members.find((m) => m.id === e.target.value);
          if (m) onSelect({ memberId: m.id, nickname: m.nickname, combatPower: m.combatPower });
        }}
        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
      >
        <option value="">선택...</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {getDeepDiveIcon(m.deepDiveRank)} {m.nickname} ({m.combatPower})
          </option>
        ))}
      </select>
      {current && current.memberId && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {current.nickname} - {current.combatPower}
        </p>
      )}
    </div>
  );
}
