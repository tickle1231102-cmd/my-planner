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
    const error = new Error(message)
    error.code = payload?.error?.code
    error.details = payload?.error?.details
    throw error
  }

  return payload?.data
}
