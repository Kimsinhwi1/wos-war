import { NextRequest, NextResponse } from 'next/server';

interface ParsedMember {
  nickname: string;
  combatPower: string;
  fcLevel: number;
  deepDiveRank: number | null;
  stage: number | null;
}

const SYSTEM_PROMPT = `당신은 WOS(Whiteout Survival) 게임 스크린샷에서 멤버 정보를 추출하는 전문가입니다.
이미지에서 다음 정보를 JSON 배열로 추출하세요:
- nickname: 플레이어 닉네임 (순수 닉네임만!)
- combatPower: 전투력 (예: "375.7M", "1.2B" 등 원본 그대로)
- fcLevel: 불의수정(FC) 레벨 (숫자만, 보이지 않으면 0)
- deepDiveRank: 지심탐험 순위 (숫자만, 보이지 않으면 null)
- stage: 스테이지 (숫자만, 보이지 않으면 null)

규칙:
1. 반드시 JSON 배열만 반환하세요. 마크다운이나 다른 텍스트를 포함하지 마세요.
2. 전투력은 화면에 표시된 그대로 문자열로 반환하세요 (예: "375.7M").
3. 닉네임 정제 (매우 중요!):
   - 연맹 태그 제거: [HAN], [KOR] 등 대괄호([])로 감싼 태그는 모두 제거
   - 순위 아이콘 제거: 🥇🥈🥉⭐🔹🔸 등 메달/순위 이모지는 닉네임에 포함하지 마세요
   - 예시: "🥇[HAN]Moon광" → "Moon광", "[KOR]🥈player1" → "player1"
   - 닉네임 자체에 포함된 이모지(♡, ꕥ 등)는 유지하세요
4. 스크린샷 종류를 자동 감지하세요:
   - 연맹원 목록: 순위 번호 + 메달 아이콘 + 닉네임 + 지심탐험 점수가 표시됨
     → deepDiveRank를 순위 번호(1, 2, 3...)로 채우세요
     → 전투력/FC가 없으므로 combatPower="0", fcLevel=0
   - FC/전투력 순위: 닉네임 + "FC5" 등 FC레벨 + 전투력(283.8M 등)이 표시됨
     → combatPower, fcLevel을 채우세요
     → deepDiveRank=null
   - 해당 스크린샷에 없는 정보는 "0" 또는 null로 설정하세요
5. FC레벨은 "FC5", "FC 5", "FC10" 등의 표시에서 숫자만 추출하세요 (1~10 범위).
6. 이미지에서 멤버 정보가 보이지 않으면 빈 배열 []을 반환하세요.`;

function parseCombatPowerNumeric(cp: string): number {
  const cleaned = cp.replace(/,/g, '').trim();
  const match = cleaned.match(/^([\d.]+)\s*(B|M|K)?$/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = (match[2] || '').toUpperCase();
  if (unit === 'B') return num * 1_000_000_000;
  if (unit === 'M') return num * 1_000_000;
  if (unit === 'K') return num * 1_000;
  return num;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인하세요.' },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = file.type || 'image/png';

    // Call GPT-4o Vision
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: '이 WOS 게임 스크린샷에서 멤버 정보를 추출해주세요.',
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI API error:', err);
      return NextResponse.json(
        { error: `OpenAI API 오류: ${response.status}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? '[]';

    // Parse JSON response (handle markdown code blocks)
    let jsonStr = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    let parsed: ParsedMember[];
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse GPT response:', content);
      return NextResponse.json(
        { error: 'GPT 응답을 파싱할 수 없습니다', raw: content },
        { status: 422 },
      );
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        { error: 'GPT 응답이 배열이 아닙니다', raw: content },
        { status: 422 },
      );
    }

    // Strip alliance tags and rank medal emojis from nicknames (fallback in case GPT didn't)
    const cleanNickname = (name: string): string =>
      name.trim()
        .replace(/^\[.*?\]\s*/, '')       // [HAN], [KOR] 등 연맹 태그
        .replace(/^[\u{1F947}\u{1F948}\u{1F949}\u{2B50}\u{1F539}\u{1F538}\u{1F3C5}\u{1F451}\u{1F48E}]+\s*/u, '') // 메달 이모지
        .trim();

    // Convert to AllianceMember format
    const members = parsed.map((m, i) => ({
      id: `screenshot-${Date.now()}-${i}`,
      rank: i + 1,
      nickname: cleanNickname(m.nickname || `Unknown_${i}`),
      combatPower: m.combatPower || '0',
      combatPowerNumeric: parseCombatPowerNumeric(m.combatPower || '0'),
      fcLevel: Math.min(Math.max(m.fcLevel || 0, 0), 10),
      deepDiveRank: m.deepDiveRank ?? null,
      stage: m.stage ?? null,
      isFC5: (m.fcLevel || 0) >= 5,
    }));

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Screenshot parse error:', error);
    return NextResponse.json(
      { error: '스크린샷 파싱 실패' },
      { status: 500 },
    );
  }
}
