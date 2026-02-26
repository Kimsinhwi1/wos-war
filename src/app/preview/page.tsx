'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStrategyStore } from '@/store/strategy-store';
import { getHeroName, getDeepDiveIcon, RALLY_COLORS, DEFAULT_STRATEGIES } from '@/lib/constants';
import { formatTroopRatio } from '@/lib/utils';
import { toast } from 'sonner';
import type { StrategyDocument } from '@/lib/types';

type Lang = 'ko' | 'en' | 'both';

export default function PreviewPage() {
  const router = useRouter();
  const {
    generateDocument,
    notionExportStatus,
    notionPageUrl,
    setExportStatus,
    setNotionPageUrl,
    setCurrentStep,
  } = useStrategyStore();

  const [lang, setLang] = useState<Lang>('ko');
  const [doc, setDoc] = useState<StrategyDocument | null>(null);

  useEffect(() => {
    setCurrentStep(5);
    setDoc(generateDocument());
  }, [setCurrentStep, generateDocument]);

  const handleExport = async () => {
    if (!doc) return;
    setExportStatus('exporting');
    try {
      const res = await fetch('/api/notion/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExportStatus('success');
      setNotionPageUrl(data.pageUrl);
      toast.success('Notion 페이지가 생성되었습니다!');
    } catch (err) {
      setExportStatus('error');
      toast.error('내보내기 실패: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  if (!doc) return <p className="text-gray-400 text-center py-20">문서 생성 중...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Step 5: 미리보기 & 내보내기</h2>
        <div className="flex gap-2">
          {(['ko', 'en', 'both'] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 text-sm rounded ${
                lang === l ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {l === 'ko' ? '한국어' : l === 'en' ? 'English' : '이중언어'}
            </button>
          ))}
        </div>
      </div>

      {/* Document Preview */}
      <div className="p-3 sm:p-6 bg-white text-gray-900 rounded-lg space-y-4 text-xs sm:text-sm leading-relaxed overflow-x-auto">
        {/* Title */}
        <h1 className="text-xl font-bold text-center">{doc.title}</h1>
        <p className="text-center text-gray-500 text-xs">
          Last Updated: {doc.lastUpdated}
        </p>
        <hr />

        {/* HAN Special Instructions */}
        {doc.hanSpecialInstructions.map((inst) => (
          <div key={inst.id} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <p className="font-bold text-yellow-800">
              {'\u26A0\uFE0F'} {lang !== 'en' ? inst.titleKo : inst.titleEn}
            </p>
            <p className="text-gray-700 whitespace-pre-line mt-1">
              {lang !== 'en' ? inst.contentKo : inst.contentEn}
            </p>
            {lang === 'both' && (
              <p className="text-gray-500 whitespace-pre-line mt-2 border-t pt-2">
                {inst.contentEn}
              </p>
            )}
          </div>
        ))}

        <hr />

        {/* Gen 4 Heroes */}
        <h2 className="text-lg font-bold">
          {lang !== 'en' ? '4세대 레전드(SSR) 영웅' : 'Gen 4 Legendary (SSR) Heroes'}
        </h2>
        <table className="w-full border-collapse border border-gray-300 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '병과' : 'Class'}</th>
              <th className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '영웅' : 'Hero'}</th>
              <th className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '역할' : 'Role'}</th>
              <th className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '스탯' : 'Stats'}</th>
            </tr>
          </thead>
          <tbody>
            {doc.gen4Heroes.map((h) => (
              <tr key={h.id}>
                <td className="border border-gray-300 px-2 py-1">
                  {lang !== 'en'
                    ? h.heroClass === 'infantry' ? '방패' : h.heroClass === 'lancer' ? '창병' : '궁병'
                    : h.heroClass.charAt(0).toUpperCase() + h.heroClass.slice(1)}
                </td>
                <td className="border border-gray-300 px-2 py-1">
                  {lang !== 'en' ? h.nameKo : h.nameEn}
                </td>
                <td className="border border-gray-300 px-2 py-1">
                  {lang !== 'en'
                    ? h.role === 'defense' ? '수성' : '집결(공성)'
                    : h.role === 'defense' ? 'Defense' : 'Rally (Offense)'}
                </td>
                <td className="border border-gray-300 px-2 py-1">{h.statPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr />

        {/* Rally Types */}
        <h2 className="text-lg font-bold">
          {lang !== 'en' ? '영웅 조합표' : 'Hero Composition'}
        </h2>
        {doc.rallyTypes.map((rally) => {
          const emoji = RALLY_COLORS[rally.color].emoji;
          return (
            <div key={rally.id} className="mb-3">
              <h3 className="font-semibold">
                {emoji} {lang !== 'en' ? rally.labelKo : rally.labelEn}
                {' - '}
                {lang !== 'en' ? '비율' : 'Ratio'}{' '}
                {formatTroopRatio(rally.troopRatio.infantry, rally.troopRatio.lancer, rally.troopRatio.marksman)}
              </h3>
              <p>
                <strong>{lang !== 'en' ? '집결장' : 'Rally Leader'}:</strong>{' '}
                {getHeroName(rally.leaderComposition.hero1Id, lang === 'en' ? 'en' : 'ko')} /{' '}
                {getHeroName(rally.leaderComposition.hero2Id, lang === 'en' ? 'en' : 'ko')} /{' '}
                {getHeroName(rally.leaderComposition.hero3Id, lang === 'en' ? 'en' : 'ko')}
              </p>
              <p>
                <strong>{lang !== 'en' ? '집결원' : 'Rally Joiner'}:</strong>{' '}
                {rally.joinerHeroes.length === 1
                  ? `${lang !== 'en' ? '전원' : 'All'} ${getHeroName(rally.joinerHeroes[0], lang === 'en' ? 'en' : 'ko')}`
                  : rally.joinerHeroes.map((h) => getHeroName(h, lang === 'en' ? 'en' : 'ko')).join(' / ') +
                    ` ${lang !== 'en' ? '분배' : '(distribute)'}`}
              </p>
            </div>
          );
        })}

        <hr />

        {/* Squads */}
        <h2 className="text-lg font-bold">
          {lang !== 'en' ? '분대 편성' : 'Squad Formation'}
        </h2>
        {doc.squads.map((squad) => (
          <div key={squad.id} className="mb-3">
            <h3 className="font-semibold">
              {squad.role === 'defense' ? '\uD83D\uDEE1\uFE0F' : '\u2694\uFE0F'} {squad.name}
              <span className="ml-2 text-gray-500 text-xs font-normal">
                ({getHeroName(squad.joinerHero, lang === 'en' ? 'en' : 'ko')})
              </span>
            </h3>
            <table className="w-full border-collapse border border-gray-300 text-xs mt-1">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '닉네임' : 'Name'}</th>
                  <th className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '전투력' : 'Power'}</th>
                  <th className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '지심탐험' : 'Deep Dive'}</th>
                </tr>
              </thead>
              <tbody>
                {squad.members.map((m) => (
                  <tr key={m.id}>
                    <td className="border border-gray-300 px-2 py-1">
                      {getDeepDiveIcon(m.deepDiveRank)} {m.nickname}
                    </td>
                    <td className="border border-gray-300 px-2 py-1">{m.combatPower}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{m.deepDiveRank ?? '-'}</td>
                  </tr>
                ))}
                {squad.substitutes.map((m, i) => (
                  <tr key={m.id} className="bg-gray-50 text-gray-500">
                    <td className="border border-gray-300 px-2 py-1">
                      {lang !== 'en' ? `대체 ${i + 1}순위` : `Sub ${i + 1}`}: {getDeepDiveIcon(m.deepDiveRank)} {m.nickname}
                    </td>
                    <td className="border border-gray-300 px-2 py-1">{m.combatPower}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{m.deepDiveRank ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <hr />

        {/* Rally Leaders */}
        <h2 className="text-lg font-bold">
          {lang !== 'en' ? '집결장' : 'Rally Leaders'}
        </h2>
        <table className="w-full border-collapse border border-gray-300 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '역할' : 'Role'}</th>
              <th className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '닉네임' : 'Name'}</th>
              <th className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '전투력' : 'Power'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '메인' : 'Main'}</td>
              <td className="border border-gray-300 px-2 py-1">{doc.rallyLeaders.main.nickname}</td>
              <td className="border border-gray-300 px-2 py-1">{doc.rallyLeaders.main.combatPower}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '서브' : 'Sub'}</td>
              <td className="border border-gray-300 px-2 py-1">{doc.rallyLeaders.sub.nickname}</td>
              <td className="border border-gray-300 px-2 py-1">{doc.rallyLeaders.sub.combatPower}</td>
            </tr>
            {doc.rallyLeaders.substitutes.map((sub, i) => (
              <tr key={i} className="bg-gray-50 text-gray-500">
                <td className="border border-gray-300 px-2 py-1">
                  {lang !== 'en' ? `대체 ${i + 1}순위` : `Sub ${i + 1}`}
                </td>
                <td className="border border-gray-300 px-2 py-1">{sub.nickname}</td>
                <td className="border border-gray-300 px-2 py-1">{sub.combatPower}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr />

        {/* Strategies */}
        {doc.strategies.map((strategy) => (
          <div key={strategy.id} className="mb-4">
            <h3 className="font-semibold">
              {strategy.icon} {lang !== 'en' ? strategy.nameKo : strategy.nameEn}
              <span className="ml-2 text-gray-500 text-xs">({lang !== 'en' ? strategy.conditionKo : strategy.conditionEn})</span>
            </h3>
            <ol className="list-decimal ml-5 mt-1 space-y-1">
              {strategy.steps.map((step) => (
                <li key={step.order} className="text-gray-700">
                  {lang !== 'en' ? step.descriptionKo : step.descriptionEn}
                  {step.subSteps && (
                    <ul className="list-disc ml-4 text-gray-500 text-xs">
                      {step.subSteps.map((sub) => (
                        <li key={sub.order}>{lang !== 'en' ? sub.descriptionKo : sub.descriptionEn}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}

        <hr />

        {/* Call Signs */}
        <h2 className="text-lg font-bold">{lang !== 'en' ? '콜 정리' : 'Call Signs'}</h2>
        <table className="w-full border-collapse border border-gray-300 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '상황' : 'Situation'}</th>
              <th className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '콜 담당' : 'Caller'}</th>
              <th className="border border-gray-300 px-2 py-1">{lang !== 'en' ? '내용' : 'Message'}</th>
            </tr>
          </thead>
          <tbody>
            {doc.callSigns.map((cs) => (
              <tr key={cs.id}>
                <td className="border border-gray-300 px-2 py-1">{lang !== 'en' ? cs.situationKo : cs.situationEn}</td>
                <td className="border border-gray-300 px-2 py-1">{cs.caller}</td>
                <td className="border border-gray-300 px-2 py-1">{lang !== 'en' ? cs.messageKo : cs.messageEn}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr />

        {/* Checklist */}
        <h2 className="text-lg font-bold">{lang !== 'en' ? '체크리스트' : 'Checklist'}</h2>
        <ul className="space-y-1">
          {doc.checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input type="checkbox" readOnly checked={item.checked} className="w-3 h-3" />
              <span className="text-gray-700">{lang !== 'en' ? item.textKo : item.textEn}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Export Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setCurrentStep(4); router.push('/strategy'); }}
          className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
        >
          &larr; 이전
        </button>
        <div className="flex items-center gap-4">
          {notionPageUrl && (
            <a
              href={notionPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline text-sm"
            >
              Notion 페이지 열기 &rarr;
            </a>
          )}
          <button
            onClick={handleExport}
            disabled={notionExportStatus === 'exporting'}
            className={`px-6 py-2 rounded-lg font-medium ${
              notionExportStatus === 'exporting'
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : notionExportStatus === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {notionExportStatus === 'exporting'
              ? '내보내는 중...'
              : notionExportStatus === 'success'
                ? '내보내기 완료!'
                : 'Notion으로 내보내기'}
          </button>
        </div>
      </div>
    </div>
  );
}
