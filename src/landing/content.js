export const APP_URL = '/app'
export const SIGNUP_URL = '/app?signup=1'

export const NAV_LINKS = [
  { href: '#features', label: '기능' },
  { href: '#how-it-works', label: '사용법' },
  { href: '#faq', label: 'FAQ' },
]

export const PROBLEMS = [
  {
    title: '앱마다 나뉜 계획',
    description: '캘린더, 메모, 습관 앱에 흩어진 일정과 목표. 어디에 적었는지 찾느라 시간을 씁니다.',
    icon: 'grid',
  },
  {
    title: '연간 목표와 주간 실행의 단절',
    description: '1월에 세운 목표가 3월 Weekly에는 흔적도 없어집니다. 큰 그림과 일상이 연결되지 않습니다.',
    icon: 'link',
  },
  {
    title: '종이 플래너의 한계',
    description: '손으로 쓰는 감성은 좋지만, 검색·동기화·리마인더가 필요할 때는 디지털이 필요합니다.',
    icon: 'book',
  },
]

export const PILLARS = [
  {
    step: '01',
    title: '시간 축 연결',
    description: 'Year → Month → Week가 끊기지 않는 하나의 흐름. 연간 그리드에서 날짜를 누르면 바로 Weekly로.',
    align: 'left',
  },
  {
    step: '02',
    title: '목표 중심 설계',
    description: '만다라트로 방향을 잡고, 연·월·주 목표로 실행을 연결합니다. 계획이 실행으로 이어지도록.',
    align: 'right',
  },
  {
    step: '03',
    title: '습관 실행',
    description: '주차별 습관 트래커와 Weekly 습관 스트립으로, 매일의 체크가 큰 목표를 향해 나아가게 합니다.',
    align: 'left',
  },
]

export const FEATURES = [
  {
    id: 'yearly',
    label: 'Yearly',
    title: '52주, 한 장면',
    description: '연간 그리드로 한 해를 한눈에 설계하세요. 주요 일정과 목표를 주차별로 정리합니다.',
    bullets: ['커스텀 컬럼 추가', '날짜 색상 코딩', '탭 한 번 → Weekly 이동'],
    audience: '연간 로드맵을 그리는 사람',
    preview: 'yearly',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    title: '12개월 한눈에',
    description: '연간 캘린더와 연·월 목표를 한 화면에서 확인하세요. 날짜를 누르면 해당 주로 이동합니다.',
    bullets: ['12개 미니 캘린더', '연·월 목표 체크리스트', '날짜 탭 → Weekly'],
    audience: '한 해 전체 흐름을 보고 싶은 사람',
    preview: 'calendar',
  },
  {
    id: 'monthly',
    label: 'Monthly',
    title: '월간 목표와 메모',
    description: '이번 달에 집중할 목표 3가지와 날짜별 메모, 월간 메모를 정리합니다.',
    bullets: ['3-line 월간 목표', '날짜별 메모', '월간 메모 영역'],
    audience: '월 단위로 계획을 세우는 사람',
    preview: 'monthly',
  },
  {
    id: 'weekly',
    label: 'Weekly',
    title: '한 주를 설계',
    description: '시간표, 루틴, 할 일·하지 않을 일, 습관 스트립까지. 실행의 중심이 되는 Weekly 뷰.',
    bullets: ['6시–6시 시간표', 'Todo / Not-todo', '습관 스트립 & 미니 캘린더'],
    audience: '매주 리듬을 설계하는 사람',
    preview: 'weekly',
  },
  {
    id: 'mandala',
    label: 'Mandal-Art',
    title: '본질에 집중하는 목표',
    description: 'Manda(본질) + La(성취) + Art(기술). 9×9 만다라트로 올해의 키워드와 핵심 목표를 설계합니다.',
    bullets: ['9×9 만다라트 차트', '연간 키워드 & resolution', '중심 목표 설정'],
    audience: '방향성을 먼저 정하는 사람',
    preview: 'mandala',
  },
  {
    id: 'habit',
    label: 'Habit',
    title: '습관을 주차별로',
    description: '한 달 습관을 주차별로 추적하세요. 일별 체크와 진행률 차트로 꾸준함을 기록합니다.',
    bullets: ['주차별 습관 그리드', '일별 체크박스', '진행률 차트'],
    audience: '습관을 데이터로 관리하는 사람',
    preview: 'habit',
  },
  {
    id: 'memory',
    label: 'Memory',
    title: '생각을 기록하고 연결',
    description: '떠오른 생각을 빠르게 캡처하고, 카테고리와 마인드맵으로 연결하세요.',
    bullets: ['빠른 메모 캡처', '카테고리 분류', '마인드맵 뷰'],
    audience: '아이디어와 회고를 쌓는 사람',
    preview: 'memory',
  },
]

export const STEPS = [
  {
    step: '01',
    title: '방향 설정',
    subtitle: 'Mandal-Art',
    description: '올해의 키워드와 핵심 목표를 만다라트로 정리합니다.',
  },
  {
    step: '02',
    title: '목표 입력',
    subtitle: 'Year / Month',
    description: '연간·월간 목표를 입력하고 Yearly 그리드에 일정을 배치합니다.',
  },
  {
    step: '03',
    title: '주간 실행',
    subtitle: 'Weekly',
    description: '시간표, 할 일, 습관을 Weekly에서 실행합니다.',
  },
  {
    step: '04',
    title: '매주 리뷰',
    subtitle: 'Habit & Memory',
    description: '습관 체크와 메모로 한 주를 돌아보고 다음 주를 설계합니다.',
  },
]

export const FAQ_ITEMS = [
  {
    question: '이메일 없이 가입할 수 있나요?',
    answer:
      '네. Focal은 고유 ID와 비밀번호만으로 가입할 수 있습니다. 이메일 인증 없이 바로 시작할 수 있어요.',
  },
  {
    question: '무료로 사용할 수 있나요?',
    answer:
      '네. Focal은 현재 무료로 이용할 수 있습니다. 연간·월간·주간 플래닝, 만다라트, 습관 트래커, 메모 기능을 모두 사용할 수 있어요.',
  },
  {
    question: '모바일에서도 잘 되나요?',
    answer:
      '네. 모바일과 PC 모두에 최적화되어 있습니다. Yearly 뷰는 모바일에서 캘린더·노트 탭으로 나뉘어 편하게 볼 수 있어요.',
  },
  {
    question: '데이터는 어디에 저장되나요?',
    answer:
      '클라우드 모드에서는 Supabase에 안전하게 저장되며 기기 간 동기화됩니다. 로컬 전용 모드를 선택하면 이 기기의 브라우저에만 저장됩니다.',
  },
  {
    question: '종이 플래너와 뭐가 다른가요?',
    answer:
      'Focal은 종이 플래너의 그리드·메모 감성을 유지하면서, 연간→주간 연결, 검색, 동기화, 습관 차트 같은 디지털 장점을 더했습니다.',
  },
  {
    question: '계정과 데이터를 삭제하려면?',
    answer:
      '앱 내 계정 설정에서 계정 삭제를 진행할 수 있습니다. 삭제 시 클라우드에 저장된 플래너 데이터도 함께 제거됩니다.',
  },
]
