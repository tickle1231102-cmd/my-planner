const RULES = [
  {
    slug: 'finance',
    keywords: [
      '돈', '지출', '수입', '투자', '저축', '세금', '대출', '월급', '연봉',
      '카드', '결제', '비용', '예산', '주식', '코인', '보험', '통장', '계좌',
      '이체', '송금', '할부', '금융', '자산', '부채', '적금', '펀드', '배당',
      'expense', 'income', 'salary', 'invest', 'budget', 'tax', 'loan', 'stock',
    ],
  },
  {
    slug: 'career',
    keywords: [
      '업무', '회사', '이직', '면접', '프로젝트', '회의', '보고', '성과', '팀',
      '직장', '출근', '야근', '상사', '동료', '승진', '퇴사', '입사', '채용',
      '포트폴리오', '이력서', '커리어', '일정', '데드라인', 'kpi', 'okr',
      'work', 'job', 'career', 'meeting', 'project', 'interview', 'office',
    ],
  },
  {
    slug: 'learning',
    keywords: [
      '공부', '학습', '강의', '독서', '책', '자격증', '스킬', '코딩', '프로그래밍',
      '수업', '시험', '노트', '복습', '강좌', '튜토리얼', '언어', '영어', '일본어',
      '개발', '배우', '연습', '성장', '지식', '학원', '과제',
      'study', 'learn', 'course', 'book', 'read', 'exam', 'skill', 'tutorial',
    ],
  },
  {
    slug: 'inner',
    keywords: [
      '일기', '감정', '명상', '성찰', '목표', '마음', '스트레스', '감사', '다짐',
      '자기', '회고', '반성', '동기', '의미', '가치', '습관', '루틴', '집중',
      '불안', '행복', '우울', '기분', '생각', '꿈', '비전', '자존감',
      'diary', 'journal', 'reflect', 'meditat', 'mood', 'gratitude', 'goal',
    ],
  },
  {
    slug: 'relationship',
    keywords: [
      '가족', '친구', '연인', '관계', '소통', '만남', '데이트', '부모', '엄마',
      '아빠', '형', '누나', '동생', '배우자', '남편', '아내', '아이', '육아',
      '선물', '축하', '약속', '전화', '대화', '갈등', '화해', '사랑',
      'family', 'friend', 'partner', 'relationship', 'date', 'love', 'parent',
    ],
  },
  {
    slug: 'health',
    keywords: [
      '운동', '헬스', '식단', '수면', '건강', '병원', '약', '컨디션', '다이어트',
      '요가', '런닝', '달리기', '걷기', '체중', '몸무게', '근육', '스트레칭',
      '영양', '비타민', '수분', '물', '아침', '점심', '저녁', '칼로리', '의사',
      'health', 'workout', 'exercise', 'sleep', 'diet', 'gym', 'run', 'doctor',
    ],
  },
]

function extractTitle(content) {
  const firstLine = content.trim().split('\n')[0]?.trim() ?? ''
  if (firstLine.length <= 40) return firstLine
  return `${firstLine.slice(0, 40)}…`
}

export function classifyByKeywords(content) {
  const normalized = content.toLowerCase().trim()

  if (!normalized) {
    return {
      slug: 'uncategorized',
      confidence: 0,
      title: '',
      matchedKeywords: [],
    }
  }

  const scores = []

  for (const rule of RULES) {
    const matched = rule.keywords.filter((kw) => normalized.includes(kw))
    if (matched.length > 0) {
      scores.push({ slug: rule.slug, score: matched.length, matched })
    }
  }

  if (scores.length === 0) {
    return {
      slug: 'uncategorized',
      confidence: 0.3,
      title: extractTitle(content),
      matchedKeywords: [],
    }
  }

  scores.sort((a, b) => b.score - a.score)
  const best = scores[0]
  const second = scores[1]

  let confidence = Math.min(0.5 + best.score * 0.15, 0.95)
  if (second && second.score === best.score) {
    confidence = 0.45
  }

  const slug = confidence < 0.5 ? 'uncategorized' : best.slug

  return {
    slug,
    confidence: Math.round(confidence * 100) / 100,
    title: extractTitle(content),
    matchedKeywords: best.matched,
  }
}
