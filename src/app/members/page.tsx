'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStrategyStore } from '@/store/strategy-store';
import { getDeepDiveIcon } from '@/lib/constants';
import { formatCombatPower } from '@/lib/utils';
import { toast } from 'sonner';
import type { AllianceMember } from '@/lib/types';

type UploadTab = 'excel' | 'screenshot';

export default function MembersPage() {
  const router = useRouter();
  const { allMembers, importMembers, clearMembers, setCurrentStep } = useStrategyStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<'deepDiveRank' | 'combatPower' | 'fcLevel'>('deepDiveRank');
  const [uploadTab, setUploadTab] = useState<UploadTab>('excel');

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
        importMembers(data.members);
        toast.success(`${data.members.length}명 멤버를 불러왔습니다 (FC5: ${data.summary.fc5Count}명)`);
      } catch (err) {
        toast.error('파일 파싱 실패: ' + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    },
    [importMembers],
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
      // Generate previews
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

    const allMembers: AllianceMember[] = [];
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
          allMembers.push(...data.members);
        }
      } catch (err) {
        console.error(`Screenshot ${i + 1} fetch error:`, err);
        errorCount++;
      }
    }

    // Merge duplicates by nickname
    const memberMap = new Map<string, AllianceMember>();
    for (const m of allMembers) {
      const existing = memberMap.get(m.nickname);
      if (existing) {
        // Merge: keep higher values, fill nulls
        memberMap.set(m.nickname, {
          ...existing,
          combatPower: m.combatPowerNumeric > existing.combatPowerNumeric ? m.combatPower : existing.combatPower,
          combatPowerNumeric: Math.max(m.combatPowerNumeric, existing.combatPowerNumeric),
          fcLevel: Math.max(m.fcLevel, existing.fcLevel),
          deepDiveRank: m.deepDiveRank ?? existing.deepDiveRank,
          stage: m.stage ?? existing.stage,
          isFC5: Math.max(m.fcLevel, existing.fcLevel) >= 5,
        });
      } else {
        memberMap.set(m.nickname, m);
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

    importMembers(merged);
    clearScreenshots();
    const fc5 = merged.filter((m) => m.isFC5).length;
    toast.success(
      `${merged.length}명 추출 완료 (FC5: ${fc5}명)${errorCount > 0 ? ` / ${errorCount}장 실패` : ''}`,
    );
  }, [screenshotFiles, importMembers, clearScreenshots]);

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

  const fc5Count = allMembers.filter((m) => m.isFC5).length;
  const top40 = allMembers
    .filter((m) => m.deepDiveRank !== null)
    .sort((a, b) => (a.deepDiveRank ?? 999) - (b.deepDiveRank ?? 999))
    .slice(0, 40);
  const top40Ids = new Set(top40.map((m) => m.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Step 1: 멤버 관리</h2>
        {allMembers.length > 0 && (
          <button
            onClick={clearMembers}
            className="px-3 py-1.5 text-sm bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
          >
            초기화
          </button>
        )}
      </div>

      {/* Upload Area */}
      {allMembers.length === 0 && (
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
                  <p className="text-lg text-gray-300 mb-2">엑셀 파일을 드래그하거나 클릭하여 업로드</p>
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
      {allMembers.length > 0 && (
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

function MemberRow({ member, index, isTop40 }: { member: AllianceMember; index: number; isTop40: boolean }) {
  const icon = getDeepDiveIcon(member.deepDiveRank);
  return (
    <tr className={`border-t border-gray-800 ${isTop40 ? 'bg-blue-600/5' : ''} ${!member.isFC5 ? 'opacity-50' : ''}`}>
      <td className="px-2 sm:px-3 py-2 text-gray-500 hidden sm:table-cell">{index + 1}</td>
      <td className="px-2 sm:px-3 py-2 font-medium text-xs sm:text-sm">
        {icon && <span className="mr-1">{icon}</span>}
        {member.nickname}
        {member.isFC5 && <span className="ml-1 text-xs text-blue-400">FC{member.fcLevel}</span>}
      </td>
      <td className="px-2 sm:px-3 py-2 text-right text-gray-300 text-xs sm:text-sm">{member.combatPower}</td>
      <td className="px-2 sm:px-3 py-2 text-center">
        <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs ${member.isFC5 ? 'bg-green-600/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
          {member.fcLevel}
        </span>
      </td>
      <td className="px-2 sm:px-3 py-2 text-center text-gray-300 text-xs sm:text-sm">
        {member.deepDiveRank ?? '-'}
      </td>
      <td className="px-2 sm:px-3 py-2 text-center text-gray-400 hidden sm:table-cell">{member.stage ?? '-'}</td>
    </tr>
  );
}
