/** Client helper to call POST /api/plan/generate */
export async function generateActionPlan(input) {
  const response = await fetch('/api/plan/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.error ||
      `플랜 생성에 실패했습니다 (${response.status})`
    const code = payload?.error?.code
    const friendly =
      code === 'MISSING_GEMINI_API_KEY'
        ? '서버에 Gemini API 키가 없습니다. Vercel 환경변수에 GEMINI_API_KEY를 추가해 주세요.'
        : message
    const error = new Error(friendly)
    error.code = code
    error.details = payload?.error?.details
    throw error
  }

  return payload?.data
}
