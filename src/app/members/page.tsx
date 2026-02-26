'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStrategyStore } from '@/store/strategy-store';
import { getDeepDiveIcon } from '@/lib/constants';
import { formatCombatPower, normalizeNickname, normalizeForMatch, levenshteinSimilarity } from '@/lib/utils';
import { toast } from 'sonner';
import type { AllianceMember } from '@/lib/types';

type UploadTab = 'excel' | 'screenshot';

export default function MembersPage() {
  const router = useRouter();
  const {
    allMembers,
    importMembers,
    mergeMembers,
    updateMember,
    manualMerge,
    clearMembers,
    setCurrentStep,
  } = useStrategyStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<'deepDiveRank' | 'combatPower' | 'fcLevel'>('deepDiveRank');
  const [uploadTab, setUploadTab] = useState<UploadTab>('excel');
  const [mergeMode, setMergeMode] = useState(false);

  // Screenshot state
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [parseProgress, setParseProgress] = useState({ current: 0, total: 0 });
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentStep(1);
  }, [setCurrentStep]);

  // Excel upload handler
  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('엑셀 파일(.xlsx)만 업로드 가능합니다');
        return;
      }
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/parse-excel', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (mergeMode) {
          mergeMembers(data.members);
          setMergeMode(false);
          toast.success(`${data.members.length}명 데이터를 병합했습니다`);
        } else {
          importMembers(data.members);
          toast.success(`${data.members.length}명 멤버를 불러왔습니다 (FC5: ${data.summary.fc5Count}명)`);
        }
      } catch (err) {
        toast.error('파일 파싱 실패: ' + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    },
    [importMembers, mergeMembers, mergeMode],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (uploadTab === 'screenshot') {
        const files = Array.from(e.dataTransfer.files).filter((f) =>
          f.type.startsWith('image/'),
        );
        if (files.length === 0) {
          toast.error('이미지 파일만 업로드 가능합니다');
          return;
        }
        addScreenshotFiles(files);
        return;
      }

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, uploadTab],
  );

  // Screenshot handlers
  const addScreenshotFiles = useCallback((files: File[]) => {
    const maxFiles = 20;
    setScreenshotFiles((prev) => {
      const combined = [...prev, ...files].slice(0, maxFiles);
      if (prev.length + files.length > maxFiles) {
        toast.error(`최대 ${maxFiles}장까지 업로드 가능합니다`);
      }
      const newPreviews: string[] = [];
      combined.forEach((file) => {
        const url = URL.createObjectURL(file);
        newPreviews.push(url);
      });
      setScreenshotPreviews((oldPreviews) => {
        oldPreviews.forEach((url) => URL.revokeObjectURL(url));
        return newPreviews;
      });
      return combined;
    });
  }, []);

  const removeScreenshot = useCallback((index: number) => {
    setScreenshotFiles((prev) => prev.filter((_, i) => i !== index));
    setScreenshotPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearScreenshots = useCallback(() => {
    screenshotPreviews.forEach((url) => URL.revokeObjectURL(url));
    setScreenshotFiles([]);
    setScreenshotPreviews([]);
  }, [screenshotPreviews]);

  const parseScreenshots = useCallback(async () => {
    if (screenshotFiles.length === 0) {
      toast.error('스크린샷을 먼저 업로드하세요');
      return;
    }

    setIsParsing(true);
    setParseProgress({ current: 0, total: screenshotFiles.length });

    const parsedMembers: AllianceMember[] = [];
    let errorCount = 0;

    for (let i = 0; i < screenshotFiles.length; i++) {
      setParseProgress({ current: i + 1, total: screenshotFiles.length });

      try {
        const formData = new FormData();
        formData.append('file', screenshotFiles[i]);
        const res = await fetch('/api/parse-screenshots', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          console.error(`Screenshot ${i + 1} error:`, data.error);
          errorCount++;
          continue;
        }
        if (data.members?.length > 0) {
          parsedMembers.push(...data.members);
        }
      } catch (err) {
        console.error(`Screenshot ${i + 1} fetch error:`, err);
        errorCount++;
      }
    }

    // Merge duplicates by aggressively normalized nickname
    // normalizeForMatch strips ALL special chars/spaces for robust matching
    const memberMap = new Map<string, AllianceMember>();
    for (const m of parsedMembers) {
      const matchKey = normalizeForMatch(m.nickname);
      const displayName = normalizeNickname(m.nickname);
      const existing = memberMap.get(matchKey);
      if (existing) {
        memberMap.set(matchKey, {
          ...existing,
          nickname: existing.nickname.length >= displayName.length ? existing.nickname : displayName,
          combatPower: m.combatPowerNumeric > existing.combatPowerNumeric ? m.combatPower : existing.combatPower,
          combatPowerNumeric: Math.max(m.combatPowerNumeric, existing.combatPowerNumeric),
          fcLevel: Math.max(m.fcLevel, existing.fcLevel),
          deepDiveRank: m.deepDiveRank ?? existing.deepDiveRank,
          stage: m.stage ?? existing.stage,
          isFC5: Math.max(m.fcLevel, existing.fcLevel) >= 5,
        });
      } else {
        memberMap.set(matchKey, { ...m, nickname: displayName });
      }
    }

    const merged = Array.from(memberMap.values()).map((m, i) => ({
      ...m,
      id: `ss-${Date.now()}-${i}`,
      rank: i + 1,
    }));

    setIsParsing(false);

    if (merged.length === 0) {
      toast.error('멤버 정보를 추출하지 못했습니다. 스크린샷을 확인해주세요.');
      return;
    }

    if (mergeMode) {
      mergeMembers(merged);
      setMergeMode(false);
      clearScreenshots();
      toast.success(
        `${merged.length}명 데이터를 병합했습니다${errorCount > 0 ? ` / ${errorCount}장 실패` : ''}`,
      );
    } else {
      importMembers(merged);
      clearScreenshots();
      const fc5 = merged.filter((m) => m.isFC5).length;
      toast.success(
        `${merged.length}명 추출 완료 (FC5: ${fc5}명)${errorCount > 0 ? ` / ${errorCount}장 실패` : ''}`,
      );
    }
  }, [screenshotFiles, importMembers, mergeMembers, mergeMode, clearScreenshots]);

  // Excel download (Blob 방식 — 브라우저 호환)
  const downloadExcel = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const data = allMembers.map((m, i) => ({
        '#': i + 1,
        '\uC774\uB984': m.nickname,
        '\uC804\uD22C\uB825': m.combatPower,
        '\uBD88\uC758\uC218\uC815': m.fcLevel,
        '\uC9C0\uC2EC\uD0D0\uD5D8': m.deepDiveRank ?? '',
        '\uC2A4\uD14C\uC774\uC9C0': m.stage ?? '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '\uBA64\uBC84\uBAA9\uB85D');
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      // writeFile 대신 Blob으로 직접 다운로드 (Node.js 의존성 제거)
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WOS_\uBA64\uBC84\uBAA9\uB85D_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('엑셀 파일을 다운로드했습니다');
    } catch (err) {
      console.error('Excel download error:', err);
      toast.error('엑셀 다운로드 실패');
    }
  }, [allMembers]);

  const sortedMembers = [...allMembers].sort((a, b) => {
    if (sortField === 'deepDiveRank') {
      if (a.deepDiveRank === null && b.deepDiveRank === null) return 0;
      if (a.deepDiveRank === null) return 1;
      if (b.deepDiveRank === null) return -1;
      return a.deepDiveRank - b.deepDiveRank;
    }
    if (sortField === 'combatPower') return b.combatPowerNumeric - a.combatPowerNumeric;
    return b.fcLevel - a.fcLevel;
  });

  // 매칭 제안: 전투력 없는 멤버 ↔ 지심 없는 멤버 간 유사도 계산
  const matchSuggestions = useMemo(() => {
    // 전투력 0인 멤버 (연맹원 목록에서만 온 멤버)
    const noCP = allMembers.filter((m) => m.combatPowerNumeric === 0 && m.deepDiveRank !== null);
    // 지심순위 없는 멤버 (FC/전투력 스크린샷에서만 온 멤버)
    const noRank = allMembers.filter((m) => m.deepDiveRank === null && m.combatPowerNumeric > 0);

    if (noCP.length === 0 || noRank.length === 0) return [];

    const suggestions: { member: AllianceMember; candidate: AllianceMember; similarity: number }[] = [];

    for (const m of noCP) {
      let bestMatch: AllianceMember | null = null;
      let bestScore = 0;
      for (const c of noRank) {
        const score = levenshteinSimilarity(m.nickname, c.nickname);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = c;
        }
      }
      if (bestMatch && bestScore >= 0.3) {
        suggestions.push({ member: m, candidate: bestMatch, similarity: bestScore });
      }
    }
    return suggestions.sort((a, b) => b.similarity - a.similarity);
  }, [allMembers]);

  const fc5Count = allMembers.filter((m) => m.isFC5).length;
  const top40 = allMembers
    .filter((m) => m.deepDiveRank !== null)
    .sort((a, b) => (a.deepDiveRank ?? 999) - (b.deepDiveRank ?? 999))
    .slice(0, 40);
  const top40Ids = new Set(top40.map((m) => m.id));

  const showUploadArea = allMembers.length === 0 || mergeMode;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Step 1: 멤버 관리</h2>
        {allMembers.length > 0 && !mergeMode && (
          <div className="flex gap-2">
            <button
              onClick={downloadExcel}
              className="px-3 py-1.5 text-sm bg-green-600/20 text-green-400 rounded hover:bg-green-600/30"
            >
              엑셀 다운로드
            </button>
            <button
              onClick={() => setMergeMode(true)}
              className="px-3 py-1.5 text-sm bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30"
            >
              추가 가져오기
            </button>
            <button
              onClick={clearMembers}
              className="px-3 py-1.5 text-sm bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
            >
              초기화
            </button>
          </div>
        )}
      </div>

      {/* Merge Mode Banner */}
      {mergeMode && (
        <div className="p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg flex items-center justify-between">
          <p className="text-sm text-blue-300">
            추가 가져오기 모드: 기존 {allMembers.length}명 데이터에 새 데이터를 병합합니다.
            (닉네임 기준 중복 병합, 더 높은 값 유지)
          </p>
          <button
            onClick={() => { setMergeMode(false); clearScreenshots(); }}
            className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            취소
          </button>
        </div>
      )}

      {/* Upload Area */}
      {showUploadArea && (
        <div className="space-y-4">
          {/* Tab Selector */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setUploadTab('excel')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                uploadTab === 'excel'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              엑셀 업로드
            </button>
            <button
              onClick={() => setUploadTab('screenshot')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                uploadTab === 'screenshot'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              스크린샷 OCR
            </button>
          </div>

          {/* Excel Upload */}
          {uploadTab === 'excel' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-xl p-6 sm:p-12 text-center transition-colors ${
                isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              {isLoading ? (
                <p className="text-gray-400">파싱 중...</p>
              ) : (
                <>
                  <p className="text-lg text-gray-300 mb-2">
                    엑셀 파일을 드래그하거나 클릭하여 업로드
                  </p>
                  <p className="text-sm text-gray-500">연맹_멤버_통합.xlsx</p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                  >
                    파일 선택
                  </label>
                </>
              )}
            </div>
          )}

          {/* Screenshot Upload */}
          {uploadTab === 'screenshot' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-xl p-6 sm:p-10 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <p className="text-lg text-gray-300 mb-2">
                  게임 스크린샷을 드래그하거나 클릭하여 업로드
                </p>
                <p className="text-sm text-gray-500 mb-1">
                  멤버목록, 지심탐험 순위 스크린샷 (최대 20장)
                </p>
                <p className="text-xs text-gray-600 mb-4">
                  GPT-4o Vision으로 닉네임, 전투력, FC레벨, 지심순위를 자동 추출합니다
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) addScreenshotFiles(files);
                    e.target.value = '';
                  }}
                  className="hidden"
                  id="screenshot-upload"
                />
                <label
                  htmlFor="screenshot-upload"
                  className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                >
                  이미지 선택
                </label>
              </div>

              {/* Screenshot Previews */}
              {screenshotFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">
                      {screenshotFiles.length}장 선택됨
                    </p>
                    <button
                      onClick={clearScreenshots}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      전체 삭제
                    </button>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {screenshotPreviews.map((url, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={url}
                          alt={`Screenshot ${i + 1}`}
                          className="w-full h-16 sm:h-20 object-cover rounded border border-gray-700"
                        />
                        <button
                          onClick={() => removeScreenshot(i)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          X
                        </button>
                        <span className="absolute bottom-0 left-0 right-0 text-center text-xs bg-black/60 text-gray-300 py-0.5">
                          {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Parse Button */}
                  <button
                    onClick={parseScreenshots}
                    disabled={isParsing}
                    className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${
                      isParsing
                        ? 'bg-gray-700 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {isParsing
                      ? `추출 중... (${parseProgress.current}/${parseProgress.total})`
                      : mergeMode
                        ? `${screenshotFiles.length}장에서 추출하여 병합`
                        : `${screenshotFiles.length}장 스크린샷에서 멤버 추출`}
                  </button>

                  {isParsing && (
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${parseProgress.total > 0 ? (parseProgress.current / parseProgress.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {allMembers.length > 0 && !mergeMode && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <SummaryCard label="총 인원" value={allMembers.length} />
            <SummaryCard label="FC5 인원" value={fc5Count} highlight />
            <SummaryCard label="핵심 전력 (상위40)" value={top40.length} highlight />
            <SummaryCard
              label="평균 전투력"
              value={formatCombatPower(
                allMembers.reduce((s, m) => s + m.combatPowerNumeric, 0) / allMembers.length,
              )}
            />
          </div>

          {/* 매칭 제안 섹션 */}
          {matchSuggestions.length > 0 && (
            <div className="p-4 bg-yellow-600/10 border border-yellow-600/30 rounded-lg space-y-3">
              <p className="text-sm font-medium text-yellow-300">
                닉네임 유사 매칭 제안 ({matchSuggestions.length}건)
              </p>
              <p className="text-xs text-yellow-400/70">
                OCR 인식 차이로 매칭되지 않은 멤버를 합칠 수 있습니다
              </p>
              <div className="space-y-2">
                {matchSuggestions.map(({ member, candidate, similarity }) => (
                  <div
                    key={member.id + candidate.id}
                    className="flex items-center gap-2 text-sm bg-gray-900/50 rounded px-3 py-2"
                  >
                    <span className="text-gray-300 min-w-0 truncate flex-1" title={member.nickname}>
                      {member.nickname}
                      <span className="text-xs text-gray-500 ml-1">
                        (지심{member.deepDiveRank}, CP 0)
                      </span>
                    </span>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                      similarity >= 0.7 ? 'bg-green-600/20 text-green-400' :
                      similarity >= 0.5 ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-red-600/20 text-red-400'
                    }`}>
                      {Math.round(similarity * 100)}%
                    </span>
                    <span className="text-gray-300 min-w-0 truncate flex-1 text-right" title={candidate.nickname}>
                      {candidate.nickname}
                      <span className="text-xs text-gray-500 ml-1">
                        ({candidate.combatPower}, FC{candidate.fcLevel})
                      </span>
                    </span>
                    <button
                      onClick={() => {
                        manualMerge(member.id, candidate.id);
                        toast.success(`${member.nickname} + ${candidate.nickname} 병합 완료`);
                      }}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 shrink-0"
                    >
                      합치기
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500">
            닉네임, 전투력, FC레벨을 클릭하면 수정할 수 있습니다
          </p>

          {/* Sort Controls */}
          <div className="flex gap-2">
            {(['deepDiveRank', 'combatPower', 'fcLevel'] as const).map((field) => (
              <button
                key={field}
                onClick={() => setSortField(field)}
                className={`px-3 py-1 text-sm rounded ${
                  sortField === field ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {field === 'deepDiveRank' ? '지심탐험순' : field === 'combatPower' ? '전투력순' : 'FC레벨순'}
              </button>
            ))}
          </div>

          {/* Member Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-2 sm:px-3 py-2 text-left text-gray-400 hidden sm:table-cell">#</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-gray-400">닉네임</th>
                  <th className="px-2 sm:px-3 py-2 text-right text-gray-400">전투력</th>
                  <th className="px-2 sm:px-3 py-2 text-center text-gray-400">FC</th>
                  <th className="px-2 sm:px-3 py-2 text-center text-gray-400">지심</th>
                  <th className="px-2 sm:px-3 py-2 text-center text-gray-400 hidden sm:table-cell">스테이지</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((member, i) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    index={i}
                    isTop40={top40Ids.has(member.id)}
                    onUpdate={updateMember}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Next Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setCurrentStep(2);
                router.push('/assignment');
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              다음: 역할 배정 &rarr;
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-lg border ${highlight ? 'border-blue-600 bg-blue-600/10' : 'border-gray-800 bg-gray-900'}`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-blue-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function MemberRow({
  member,
  index,
  isTop40,
  onUpdate,
}: {
  member: AllianceMember;
  index: number;
  isTop40: boolean;
  onUpdate: (id: string, fields: Partial<Pick<AllianceMember, 'nickname' | 'combatPower' | 'fcLevel'>>) => void;
}) {
  const icon = getDeepDiveIcon(member.deepDiveRank);
  const [editField, setEditField] = useState<'nickname' | 'combatPower' | 'fcLevel' | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editField === 'fcLevel' && selectRef.current) {
      selectRef.current.focus();
    } else if (editField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editField]);

  const startEdit = (field: 'nickname' | 'combatPower' | 'fcLevel') => {
    setEditField(field);
    if (field === 'nickname') setEditValue(member.nickname);
    else if (field === 'combatPower') setEditValue(member.combatPower);
    else setEditValue(String(member.fcLevel));
  };

  const saveEdit = () => {
    if (!editField) return;
    if (editField === 'nickname') {
      if (editValue.trim()) {
        onUpdate(member.id, { nickname: editValue });
      }
    } else if (editField === 'combatPower') {
      if (editValue.trim()) {
        onUpdate(member.id, { combatPower: editValue.trim() });
      }
    } else if (editField === 'fcLevel') {
      onUpdate(member.id, { fcLevel: parseInt(editValue, 10) || 0 });
    }
    setEditField(null);
  };

  const cancelEdit = () => {
    setEditField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <tr className={`border-t border-gray-800 ${isTop40 ? 'bg-blue-600/5' : ''} ${!member.isFC5 ? 'opacity-50' : ''}`}>
      <td className="px-2 sm:px-3 py-2 text-gray-500 hidden sm:table-cell">{index + 1}</td>

      {/* Nickname - editable */}
      <td className="px-2 sm:px-3 py-2 font-medium text-xs sm:text-sm">
        {editField === 'nickname' ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-800 border border-blue-500 rounded px-1.5 py-0.5 text-white text-xs sm:text-sm outline-none"
          />
        ) : (
          <span
            onClick={() => startEdit('nickname')}
            className="cursor-pointer hover:text-blue-400 transition-colors"
            title="클릭하여 수정"
          >
            {icon && <span className="mr-1">{icon}</span>}
            {member.nickname}
            {member.isFC5 && <span className="ml-1 text-xs text-blue-400">FC{member.fcLevel}</span>}
          </span>
        )}
      </td>

      {/* Combat Power - editable */}
      <td className="px-2 sm:px-3 py-2 text-right text-xs sm:text-sm">
        {editField === 'combatPower' ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            placeholder="예: 375.7M"
            className="w-24 bg-gray-800 border border-blue-500 rounded px-1.5 py-0.5 text-white text-xs sm:text-sm text-right outline-none"
          />
        ) : (
          <span
            onClick={() => startEdit('combatPower')}
            className="cursor-pointer text-gray-300 hover:text-blue-400 transition-colors"
            title="클릭하여 수정"
          >
            {member.combatPower || '0'}
          </span>
        )}
      </td>

      {/* FC Level - editable dropdown */}
      <td className="px-2 sm:px-3 py-2 text-center">
        {editField === 'fcLevel' ? (
          <select
            ref={selectRef}
            value={editValue}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onUpdate(member.id, { fcLevel: val });
              setEditField(null);
            }}
            onBlur={() => setEditField(null)}
            className="bg-gray-800 border border-blue-500 rounded px-1 py-0.5 text-white text-xs outline-none"
          >
            {Array.from({ length: 11 }, (_, i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        ) : (
          <span
            onClick={() => startEdit('fcLevel')}
            className={`inline-block px-1.5 sm:px-2 py-0.5 rounded text-xs cursor-pointer hover:ring-1 hover:ring-blue-500 transition-all ${
              member.isFC5 ? 'bg-green-600/20 text-green-400' : 'bg-gray-700 text-gray-400'
            }`}
            title="클릭하여 수정"
          >
            {member.fcLevel}
          </span>
        )}
      </td>

      <td className="px-2 sm:px-3 py-2 text-center text-gray-300 text-xs sm:text-sm">
        {member.deepDiveRank ?? '-'}
      </td>
      <td className="px-2 sm:px-3 py-2 text-center text-gray-400 hidden sm:table-cell">{member.stage ?? '-'}</td>
    </tr>
  );
}
