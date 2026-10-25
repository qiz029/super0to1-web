import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { MAX_TRANSLATION_CHARACTERS, type TranslationChange, type TranslationField, type TranslationLanguage } from '../../shared/translation'
import { api } from './api'

type TranslationRequest = { title: string; source: TranslationLanguage; fields: TranslationField[]; apply: (changes: TranslationChange[]) => void }
const TranslationContext = createContext<{ open: (request: TranslationRequest) => void; active: boolean }>({ open() {}, active: false })
const languageName = { zh: '中文', en: 'English' }

export function TranslationActions({ title, fields, apply, compact = false }: Omit<TranslationRequest, 'source'> & { compact?: boolean }) {
  const context = useContext(TranslationContext)
  return <div className={`translation-actions ${compact ? 'compact' : ''}`} aria-label={`${title}翻译`}>
    {!compact && <span>AI 翻译</span>}
    {(['zh', 'en'] as const).map(source => <button key={source} type="button" className={compact ? 'text-button' : 'button'} disabled={context.active || !fields.some(field => field.value[source].trim())} onClick={() => context.open({ title, source, fields, apply })}>
      {source === 'zh' ? '中文 → English' : 'English → 中文'}
    </button>)}
  </div>
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<TranslationRequest | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<Record<string, string> | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const target: TranslationLanguage = request?.source === 'zh' ? 'en' : 'zh'
  const fields = request?.fields ?? []
  const chosen = fields.filter(field => selected.has(field.key))
  const characters = chosen.reduce((size, field) => size + field.value[request!.source].length, 0)
  const open = (next: TranslationRequest) => {
    const destination = next.source === 'zh' ? 'en' : 'zh'
    const available = structuredClone(next.fields.filter(field => field.value[next.source].trim()))
    setRequest({ ...next, fields: available })
    setSelected(new Set(available.filter(field => !field.value[destination].trim()).map(field => field.key)))
    setResults(null); setError(''); setBusy(false)
  }
  const close = () => { controller.current?.abort(); controller.current = null; setRequest(null); setBusy(false) }
  useEffect(() => () => controller.current?.abort(), [])
  async function generate() {
    if (!request || !chosen.length) return
    const abort = new AbortController(); controller.current = abort
    setBusy(true); setError(''); setResults(null)
    try {
      const response = await api<{ translations: { id: string; text: string }[] }>('translate', 'POST', { source: request.source, entries: chosen.map(field => ({ id: field.key, text: field.value[request.source] })) }, abort.signal)
      if (!abort.signal.aborted) setResults(Object.fromEntries(response.translations.map(item => [item.id, item.text])))
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : '翻译失败，请重试。') }
    finally { if (!abort.signal.aborted) setBusy(false) }
  }
  function apply() {
    if (!request || !results) return
    try {
      const changes = chosen.filter(field => results[field.key] !== undefined).map(field => ({ key: field.key, before: field.value, target, text: results[field.key] }))
      if (!changes.length || changes.some(change => !change.text.trim())) throw new Error('请选择至少一项完整译文。')
      request.apply(changes)
      close()
    } catch (e) { setError(e instanceof Error ? e.message : '应用译文失败，请重试。') }
  }
  const select = (keys: string[]) => { setSelected(new Set(keys)); setResults(null); setError('') }
  return <TranslationContext.Provider value={{ open, active: !!request }}>{children}
    {request && <div className="modal-backdrop translation-backdrop"><section className="modal translation-modal" role="dialog" aria-modal="true" aria-label="AI 翻译">
      <div className="modal-heading"><div><p className="eyebrow">AI TRANSLATION</p><h2>{request.title} · {languageName[request.source]} → {languageName[target]}</h2></div><button className="icon-button" aria-label="关闭翻译" onClick={close}>×</button></div>
      <p>选择要翻译的字段，检查译文后应用到草稿。已有译文默认不覆盖；网址和共用名称保持原样。</p>
      {!results && <div className="translation-selection"><button className="text-button" disabled={busy} onClick={() => select(fields.filter(field => !field.value[target].trim()).map(field => field.key))}>只选空白译文</button><button className="text-button" disabled={busy} onClick={() => select(fields.map(field => field.key))}>全选（含已有译文）</button><button className="text-button" disabled={busy} onClick={() => select([])}>取消选择</button><small>{chosen.length} 个字段 · {characters.toLocaleString()} 字符</small></div>}
      {!chosen.length && <p className="translation-hint">目标语言已有内容时不会自动覆盖。勾选需要重译的字段即可。</p>}
      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="translation-fields">{fields.filter(field => !results || selected.has(field.key)).map(field => <article className="translation-field" key={field.key}>
        <label className="translation-field-label"><input type="checkbox" checked={selected.has(field.key)} disabled={busy || !!results} onChange={e => { const next = new Set(selected); if (e.target.checked) next.add(field.key); else next.delete(field.key); setSelected(next) }} /><strong>{field.label}</strong>{field.value[target].trim() && <span className="badge">已有译文</span>}</label>
        <div className="two-columns"><div><span className="field-label">{languageName[request.source]} · 原文</span><p className="translation-source">{field.value[request.source]}</p></div><div>{results ? <label className="field"><span>{languageName[target]} · 译文（可修改）</span><textarea aria-label={`${field.label}译文`} rows={4} value={results[field.key] ?? ''} onChange={e => setResults({ ...results, [field.key]: e.target.value })} /></label> : <><span className="field-label">{languageName[target]} · 当前内容</span><p className="translation-source current">{field.value[target] || '尚未填写'}</p></>}{results && field.value[target] && <details><summary>查看将被替换的现有译文</summary><p className="translation-source current">{field.value[target]}</p></details>}</div></div>
      </article>)}</div>
      <div className="modal-actions"><button className="button" onClick={close}>{busy ? '取消等待' : '取消'}</button>{results ? <><button className="button" onClick={() => { setResults(null); setError('') }}>重新选择字段</button><button className="button primary" onClick={apply}>应用 {chosen.length} 项译文到草稿</button></> : <button className="button primary" disabled={busy || !chosen.length || characters > MAX_TRANSLATION_CHARACTERS} onClick={generate}>{busy ? '正在翻译…' : '生成译文'}</button>}</div>
      {characters > MAX_TRANSLATION_CHARACTERS && <p className="error">每次最多翻译 {MAX_TRANSLATION_CHARACTERS.toLocaleString()} 个字符，请减少所选字段。</p>}
      <small className="translation-note">所选原文将交给 OpenAI 翻译。应用后仍需保存、预览和发布，官网才会更新。</small>
    </section></div>}
  </TranslationContext.Provider>
}
