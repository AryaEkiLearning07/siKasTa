import { NextResponse } from 'next/server'
import { cacheControlValue, type CachePolicy } from './cache'

type JsonInit = ResponseInit & {
  cache?: CachePolicy
}

export function jsonResponse<T>(body: T, init: JsonInit = {}) {
  const { cache = 'noStore', headers, ...responseInit } = init
  const responseHeaders = new Headers(headers)

  if (!responseHeaders.has('Cache-Control')) {
    responseHeaders.set('Cache-Control', cacheControlValue(cache))
  }

  return NextResponse.json(body, {
    ...responseInit,
    headers: responseHeaders,
  })
}

export function jsonError(error: string, status = 500, details?: unknown, init: Omit<JsonInit, 'status'> = {}) {
  return jsonResponse(
    details === undefined ? { error } : { error, details },
    {
      ...init,
      status,
    }
  )
}
