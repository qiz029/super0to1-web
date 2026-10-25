export class ApiError extends Error {
  status: number
  details?: { path: string; message: string }[]
  constructor(status: number, message: string, details?: { path: string; message: string }[]) { super(message); this.status = status; this.details = details }
}
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  let data
  try { data = await response.json() as { error?: string; details?: { path: string; message: string }[] } } catch { throw new ApiError(response.status, '登录可能已过期，请重新打开后台。') }
  if (!response.ok) throw new ApiError(response.status, data.error || '操作失败，请重试。', data.details)
  return data as T
}
