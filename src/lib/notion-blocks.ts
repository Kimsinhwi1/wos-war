import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
import type { StrategyDocument } from './types';
import { getHeroName, getDeepDiveIcon, RALLY_COLORS } from './constants';
import { formatTroopRatio } from './utils';

type RichText = { type: 'text'; text: { content: string; link?: { url: string } | null }; annotations?: Record<string, boolean> };

function text(content: string, bold = false, link?: string): RichText {
  return {
    type: 'text',
    text: { content, link: link ? { url: link } : null },
    ...(bold ? { annotations: { bold: true } } : {}),
  };
}

function heading1(content: string): BlockObjectRequest {
  return { object: 'block', type: 'heading_1', heading_1: { rich_text: [text(content)] } } as BlockObjectRequest;
}

function heading2(content: string): BlockObjectRequest {
  return { object: 'block', type: 'heading_2', heading_2: { rich_text: [text(content)] } } as BlockObjectRequest;
}

function heading3(content: string): BlockObjectRequest {
  return { object: 'block', type: 'heading_3', heading_3: { rich_text: [text(content)] } } as BlockObjectRequest;
}

function paragraph(...parts: RichText[]): BlockObjectRequest {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: parts } } as BlockObjectRequest;
}

function divider(): BlockObjectRequest {
  return { object: 'block', type: 'divider', divider: {} } as BlockObjectRequest;
}

function callout(emoji: string, content: string): BlockObjectRequest {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      icon: { type: 'emoji', emoji },
      rich_text: [text(content)],
    },
  } as unknown as BlockObjectRequest;
}

function quote(content: string): BlockObjectRequest {
  return { object: 'block', type: 'quote', quote: { rich_text: [text(content)] } } as BlockObjectRequest;
}

function todo(content: string, checked = false): BlockObjectRequest {
  return {
    object: 'block',
    type: 'to_do',
    to_do: { rich_text: [text(content)], checked },
  } as BlockObjectRequest;
}

function numberedItem(content: string): BlockObjectRequest {
  return {
    object: 'block',
    type: 'numbered_list_item',
    numbered_list_item: { rich_text: [text(content)] },
  } as BlockObjectRequest;
}

function bulletItem(content: string): BlockObjectRequest {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [text(content)] },
  } as BlockObjectRequest;
}

function tableRow(cells: string[]): BlockObjectRequest {
  return {
    object: 'block',
    type: 'table_row',
    table_row: {
      cells: cells.map((c) => [text(c)]),
    },
  } as BlockObjectRequest;
}

function table(width: number, headerRow: string[], rows: string[][]): BlockObjectRequest {
  return {
    object: 'block',
    type: 'table',
    table: {
      table_width: width,
      has_column_header: true,
      has_row_header: false,
      children: [tableRow(headerRow), ...rows.map(tableRow)],
    },
  } as unknown as BlockObjectRequest;
}

// ============================================================
// MAIN BUILDER
// ============================================================

export function buildNotionBlocks(doc: StrategyDocument): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [];

  // Warning callout
  blocks.push(
    callout('\u26A0\uFE0F', '주의: 기본 전술은 상황에 따라 실시간으로 변경될 수 있습니다.\nNotice: Basic tactics may change in real-time depending on the situation.'),
  );

  // Date + Discord
  blocks.push(paragraph(text(`\uD83D\uDCC5 최종 수정 / Last Updated: ${doc.lastUpdated}`)));
  blocks.push(paragraph(text('HAN 디스코드: ', true), text(doc.discordLink, false, doc.discordLink)));
  blocks.push(divider());

  // HAN Special Instructions (top placement)
  for (const inst of doc.hanSpecialInstructions) {
    blocks.push(callout('\u26A0\uFE0F', `${inst.titleKo}\n${inst.contentKo}`));
  }
  blocks.push(divider());

  // Legendary Heroes
  blocks.push(heading2('레전드 영웅 목록'));
  if (doc.legendaryHeroes.length > 0) {
    blocks.push(
      table(4, ['세대', '영웅', '병과', '역할'],
        doc.legendaryHeroes.map((h) => [
          `${h.generation}세대`,
          h.nameKo,
          h.heroClass === 'infantry' ? '방패' : h.heroClass === 'lancer' ? '창병' : '궁병',
          h.role === 'defense' ? '수성' : '집결(공성)',
        ]),
      ),
    );
  } else {
    blocks.push(paragraph(text('랠리 설정에서 영웅을 선택하면 표시됩니다.')));
  }
  blocks.push(divider());

  // Hero Composition
  blocks.push(heading2('영웅 조합표'));
  for (const rally of doc.rallyTypes) {
    const emoji = RALLY_COLORS[rally.color].emoji;
    const ratio = formatTroopRatio(rally.troopRatio.infantry, rally.troopRatio.lancer, rally.troopRatio.marksman);
    blocks.push(heading3(`${emoji} ${rally.labelKo} - 비율 ${ratio}`));
    blocks.push(
      paragraph(
        text('집결장: ', true),
        text(
          `${getHeroName(rally.leaderComposition.hero1Id, 'ko')} / ${getHeroName(rally.leaderComposition.hero2Id, 'ko')} / ${getHeroName(rally.leaderComposition.hero3Id, 'ko')}`,
        ),
      ),
    );
    const joinerText =
      rally.joinerHeroes.length === 1
        ? `전원 ${getHeroName(rally.joinerHeroes[0], 'ko')}`
        : rally.joinerHeroes.map((h) => getHeroName(h, 'ko')).join(' / ') + ' 분배';
    blocks.push(paragraph(text('집결원: ', true), text(joinerText)));
  }
  blocks.push(divider());

  // Counter
  blocks.push(heading2('병종 상성 카운터'));
  blocks.push(quote('방패 → 궁병 → 창병 → 방패'));
  blocks.push(
    table(4, ['상대 편성', '상대 비율', '우리 대응', '우리 비율'],
      doc.counterMatrix.map((e) => [e.enemyCompKo, e.enemyRatio, e.ourResponseKo, e.ourRatio]),
    ),
  );
  blocks.push(divider());

  // Joiner Effects
  blocks.push(heading2('집결원 영웅 효과'));
  blocks.push(
    table(3, ['상황', '영웅', '효과'],
      doc.joinerEffects.map((e) => [e.situationKo, getHeroName(e.heroId, 'ko'), e.effectKo]),
    ),
  );
  blocks.push(divider());

  // Participation
  blocks.push(callout('\u26A0\uFE0F', `${doc.participationRequirement} 이상만 캐슬 집결 참여 가능`));
  blocks.push(divider());

  // Rally Leaders
  blocks.push(heading2('집결장'));
  const leaderRows = [
    ['메인', doc.rallyLeaders.main.nickname, doc.rallyLeaders.main.combatPower],
    ['서브', doc.rallyLeaders.sub.nickname, doc.rallyLeaders.sub.combatPower],
    ...doc.rallyLeaders.substitutes.map((s, i) => [`대체 ${i + 1}순위`, s.nickname, s.combatPower]),
  ];
  blocks.push(table(3, ['역할', '닉네임', '전투력'], leaderRows));
  blocks.push(divider());

  // Squads
  blocks.push(heading2('분대 편성'));
  for (const squad of doc.squads) {
    const icon = squad.role === 'defense' ? '\uD83D\uDEE1\uFE0F' : '\u2694\uFE0F';
    blocks.push(heading3(`${icon} ${squad.name} (${getHeroName(squad.joinerHero, 'ko')})`));
    const memberRows = squad.members.map((m) => [
      `${getDeepDiveIcon(m.deepDiveRank)} ${m.nickname}`,
      m.combatPower,
      m.deepDiveRank?.toString() ?? '-',
    ]);
    const subRows = squad.substitutes.map((m, i) => [
      `대체 ${i + 1}순위: ${getDeepDiveIcon(m.deepDiveRank)} ${m.nickname}`,
      m.combatPower,
      m.deepDiveRank?.toString() ?? '-',
    ]);
    blocks.push(table(3, ['닉네임', '전투력', '지심탐험'], [...memberRows, ...subRows]));
  }
  blocks.push(divider());

  // Strategies
  blocks.push(heading2('캐슬전 전략'));
  blocks.push(heading3('\uD83D\uDCCC 기본 원칙'));
  blocks.push(bulletItem('캐슬 점령 및 수성 유지'));
  blocks.push(bulletItem('카운터 집결 담당'));
  blocks.push(bulletItem('첫 랠리: 수성 성공/실패 여부 확인'));
  blocks.push(divider());

  for (const strategy of doc.strategies) {
    blocks.push(heading3(`${strategy.icon} ${strategy.nameKo} (${strategy.conditionKo})`));
    for (const step of strategy.steps) {
      blocks.push(numberedItem(step.descriptionKo));
      if (step.subSteps) {
        for (const sub of step.subSteps) {
          blocks.push(bulletItem(`→ ${sub.descriptionKo}`));
        }
      }
    }
    blocks.push(divider());
  }

  // Call Signs
  blocks.push(heading2('콜 정리'));
  blocks.push(
    table(3, ['상황', '콜 담당', '내용'],
      doc.callSigns.map((cs) => [cs.situationKo, cs.caller, cs.messageKo]),
    ),
  );
  blocks.push(divider());

  // Checklist
  blocks.push(heading2('체크리스트'));
  for (const item of doc.checklist) {
    blocks.push(todo(item.textKo, item.checked));
  }

  // ============================================================
  // ENGLISH VERSION
  // ============================================================
  blocks.push(divider());
  blocks.push(heading1('English Version'));
  blocks.push(divider());

  // Legendary Heroes (EN)
  blocks.push(heading2('Legendary Heroes'));
  if (doc.legendaryHeroes.length > 0) {
    blocks.push(
      table(4, ['Gen', 'Hero', 'Class', 'Role'],
        doc.legendaryHeroes.map((h) => [
          `Gen ${h.generation}`,
          h.nameEn,
          h.heroClass.charAt(0).toUpperCase() + h.heroClass.slice(1),
          h.role === 'defense' ? 'Defense' : 'Rally (Offense)',
        ]),
      ),
    );
  } else {
    blocks.push(paragraph(text('Heroes will be displayed once rally settings are configured.')));
  }
  blocks.push(divider());

  // Hero Composition (EN)
  blocks.push(heading2('Hero Composition'));
  for (const rally of doc.rallyTypes) {
    const ratio = formatTroopRatio(rally.troopRatio.infantry, rally.troopRatio.lancer, rally.troopRatio.marksman);
    blocks.push(heading3(`${RALLY_COLORS[rally.color].emoji} ${rally.labelEn} - Ratio ${ratio}`));
    blocks.push(
      paragraph(
        text('Rally Leader: ', true),
        text(
          `${getHeroName(rally.leaderComposition.hero1Id, 'en')} / ${getHeroName(rally.leaderComposition.hero2Id, 'en')} / ${getHeroName(rally.leaderComposition.hero3Id, 'en')}`,
        ),
      ),
    );
    const joinerText =
      rally.joinerHeroes.length === 1
        ? `All ${getHeroName(rally.joinerHeroes[0], 'en')}`
        : rally.joinerHeroes.map((h) => getHeroName(h, 'en')).join(' / ') + ' (distribute)';
    blocks.push(paragraph(text('Rally Joiner: ', true), text(joinerText)));
  }
  blocks.push(divider());

  // Strategies (EN)
  for (const strategy of doc.strategies) {
    blocks.push(heading3(`${strategy.icon} ${strategy.nameEn} (${strategy.conditionEn})`));
    for (const step of strategy.steps) {
      blocks.push(numberedItem(step.descriptionEn));
      if (step.subSteps) {
        for (const sub of step.subSteps) {
          blocks.push(bulletItem(`→ ${sub.descriptionEn}`));
        }
      }
    }
    blocks.push(divider());
  }

  // Checklist (EN)
  blocks.push(heading2('Checklist'));
  for (const item of doc.checklist) {
    blocks.push(todo(item.textEn, item.checked));
  }

  return blocks;
}
