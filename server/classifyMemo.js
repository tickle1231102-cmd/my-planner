import { classifyByKeywords } from '../src/lib/memoryClassify.js'
import { classifyWithGemini, getGeminiModel } from './geminiClassify.js'

const MAX_CONTENT_LENGTH = 2000

function keywordFallback(content) {
  const result = classifyByKeywords(content)
  return {
    slug: result.slug,
    confidence: result.confidence,
    title: result.title,
    model: 'keyword-rules-v1',
    source: 'keyword-fallback',
  }
}

export async function handleClassifyMemoRequest(body) {
  const content =
    typeof body?.content === 'string' ? body.content.trim() : ''

  if (!content) {
    return { status: 400, body: { error: 'content is required' } }
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return {
      status: 400,
      body: { error: `content must be at most ${MAX_CONTENT_LENGTH} characters` },
    }
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return { status: 200, body: keywordFallback(content) }
  }

  try {
    const gemini = await classifyWithGemini(content)
    return {
      status: 200,
      body: {
        ...gemini,
        model: getGeminiModel(),
        source: 'gemini',
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'gemini error'
    console.warn('[classify-memo]', message)
    return { status: 200, body: keywordFallback(content) }
  }
}
