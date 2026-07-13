import {
  CATEGORY_META,
  MAIN_CATEGORY_SLUGS,
  resolveCategorySlug,
} from '../src/lib/memoryCategories.js'

const VALID_SLUGS = new Set([...MAIN_CATEGORY_SLUGS, 'uncategorized'])

const DEFAULT_MODEL = 'gemini-2.0-flash-lite'

const FEW_SHOT_EXAMPLES = [
  {
    user_memo:
      '오늘 헬스장 가서 인클라인 15 놓고 속도 5로 30분 뛰었다. 땀 대박 남. 내일도 꼭 가기.',
    analysis:
      '물리적인 운동 기록 및 건강 루틴 지속 다짐이므로 건강에 해당함.',
    category: '건강',
  },
  {
    user_memo:
      'TouchDesigner로 미디어 파사드 인터랙션 구현할 때 컴포넌트 최적화하는 법 정리: 1. 클론 사용 줄이기 2. 텍스처 해상도 조절.',
    analysis:
      '새로운 기술적 지식을 습득하고 정리한 내용이므로 학습&성장에 해당함.',
    category: '학습&성장',
  },
  {
    user_memo:
      '하반기 대학원 진학용 포트폴리오 웹사이트 UI 레이아웃 수정 필요. HCI 연구실 교수님께 보낼 메일 드래프트 작성하기.',
    analysis:
      '학업 연장선이지만 진로 성취, 프로젝트 성과, 대외적 커리어 준비에 직결되므로 커리어에 해당함.',
    category: '커리어',
  },
  {
    user_memo:
      '요즘 자꾸 조급해지는 이유를 생각해봤다. 남들과 비교하기보다 어제의 나보다 얼마나 성장했는지에 집중하자. 마음 가라앉히기.',
    analysis:
      '내면의 감정을 돌아보고 멘탈을 관리하기 위한 성찰 일기이므로 내부 향상에 해당함.',
    category: '내부 향상',
  },
  {
    user_memo:
      '이번 달 청년도약계좌 만기되면 바로 Cma 통장으로 옮기고 주식 예수금으로 50% 쪼개기. 충동소비 금지.',
    analysis:
      '자산 관리, 저축, 투자 및 소비 통제에 대한 내용이므로 재무에 해당함.',
    category: '재무',
  },
  {
    user_memo:
      '엄마 생신 때 드릴 꽃바구니 예약하고, 주말에 오랜만에 고등학교 친구들 만나서 저녁 먹기로 한 거 장소 정해야 함.',
    analysis:
      '가족 및 지인과의 교류, 약속 관리이므로 관계에 해당함.',
    category: '관계',
  },
]

function buildFewShotBlock() {
  return FEW_SHOT_EXAMPLES.map(
    (example, index) => `예시 ${index + 1}
메모: ${example.user_memo}
분석: ${example.analysis}
정답 category: ${example.category}`,
  ).join('\n\n')
}

function buildPrompt(content) {
  return `너는 사용자의 일상·업무·생각 메모를 분석하여 가장 적절한 라이프 카테고리로 분류하는 지능형 메모 분류 엔진이다.
메모를 단 하나의 카테고리로만 매핑하라. 여러 카테고리에 걸쳐 있으면 '핵심 의도'가 어디에 있는지 판단하라.

# 분류 카테고리 정의 및 기준

1. 재무 (Finance)
- 기준: 돈, 자산, 지출, 저축, 투자, 예산, 소비 습관과 직접적으로 관련된 내용.
- 예시 키워드: 가계부, 주식, 적금, 대출, 환율, 소비 반성, 연봉 협상(금액 초점).

2. 커리어 (Career)
- 기준: 직무 성과, 포트폴리오, 프로젝트 진행 상황, 이력서, 회사 업무, 비즈니스 네트워킹 등 실질적인 '일'과 '경력'에 관한 내용.
- 예시 키워드: 전시 기획, 프론트엔드 개발, 회의록, 피드백, 협업, 이직 준비, 포트폴리오.

3. 학습&성장 (Learning & Growth)
- 기준: 외부로부터 새로운 지식, 기술, 학문을 습득하거나 공부하는 행위.
- 예시 키워드: 터치디자이너 강의, 영어 회화, 논문 스터디, 책 요약, 전공 시험, 자격증.

4. 내부 향상 (Inner Improvement)
- 기준: 내면의 성찰, 멘탈 관리, 감정 기록, 가치관 정립, 일기 등 나 자신과의 깊은 대화 및 인격적 성숙을 위한 내용.
- 예시 키워드: 성찰 일기, 감정 회고, 번아웃 극복 다짐, 명상, 가치관 생각, 나에 대한 질문.

5. 관계 (Relationships)
- 기준: 가족, 친구, 연인, 동료 등 타인과의 교류, 연락, 감정 공유, 약속, 네트워크 관리.
- 예시 키워드: 부모님 생신 선물, 친구 약속, 감사 메시지 보내기, 팀원 갈등 해결, 안부 연락.

6. 건강 (Health)
- 기준: 신체 및 정신의 물리적 건강 관리, 루틴, 운동, 수면, 식단, 병원 진료.
- 예시 키워드: 인클라인 러닝(경사도 15/속도 5), 수면 패턴, 영양제, 물 8잔, 식단 기록, 치과 예약.

# 분류 규칙 (Constraints)
- 애매한 경우의 우선순위 가이드:
  - "영어 공부를 해서 이직해야지" -> 이직(커리어)보다 '영어 공부'라는 구체적 행동에 방점이 있다면 [학습&성장]으로 분류.
  - "업무 스트레스로 마음이 힘들다" -> 업무(커리어)보다 '마음 상태와 성찰'에 초점이 있다면 [내부 향상]으로 분류.
  - "친구와 만나서 코딩 스터디했다" -> 스터디 내용이 주라면 [학습&성장], 친구와의 추억이나 약속 기록이 주라면 [관계]로 분류.
- category 값은 반드시 다음 중 하나만 사용하라: 재무, 커리어, 학습&성장, 내부 향상, 관계, 건강
- 어느 카테고리에도 명확히 속하지 않으면 category를 "미분류"로 두고 confidence_score를 낮게 줘라.
- 답변은 반드시 지정된 JSON 형식으로만 출력하라. Markdown 코드 블록을 포함하지 말고 순수 JSON 문자열만 출력하라.

# Few-shot 예시
${buildFewShotBlock()}

# 분류할 메모
${content}

# 출력 JSON 형식
{"category":"6대 카테고리 중 하나 (재무, 커리어, 학습&성장, 내부 향상, 관계, 건강) 또는 미분류","confidence_score":0.0에서 1.0 사이의 숫자,"reason":"이 카테고리로 분류한 간결한 이유 (1문장)"}`
}

function extractTitle(content) {
  const firstLine = content.trim().split('\n')[0]?.trim() ?? ''
  if (!firstLine) return ''
  if (firstLine.length <= 40) return firstLine
  return `${firstLine.slice(0, 40)}…`
}

function parseGeminiJson(text) {
  const trimmed = text.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('no JSON in Gemini response')
  return JSON.parse(jsonMatch[0])
}

function readConfidence(raw) {
  const value =
    typeof raw.confidence_score === 'number'
      ? raw.confidence_score
      : typeof raw.confidence === 'number'
        ? raw.confidence
        : Number(raw.confidence_score ?? raw.confidence)

  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

function normalizeGeminiResult(raw, content) {
  const categoryValue =
    typeof raw.category === 'string'
      ? raw.category
      : typeof raw.slug === 'string'
        ? raw.slug
        : ''

  const resolved = resolveCategorySlug(categoryValue)
  const slug = VALID_SLUGS.has(resolved) ? resolved : 'uncategorized'
  const confidence = readConfidence(raw)
  const reason =
    typeof raw.reason === 'string'
      ? raw.reason.trim()
      : typeof raw.analysis === 'string'
        ? raw.analysis.trim()
        : ''
  const title =
    typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim().slice(0, 60)
      : extractTitle(content)

  return {
    slug,
    confidence,
    title,
    reason,
    category: CATEGORY_META[slug]?.nameKo || '미분류',
  }
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
}

export async function classifyWithGemini(content) {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const model = getGeminiModel()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(content) }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Gemini HTTP ${response.status}: ${detail.slice(0, 200)}`)
  }

  const payload = await response.json()
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('empty Gemini response')
  }

  return normalizeGeminiResult(parseGeminiJson(text), content)
}
