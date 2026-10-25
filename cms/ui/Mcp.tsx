import { useEffect, useState } from 'react'
import { api } from './api'
import { mcpScopes, scopeLabels, type McpConnection, type McpScope } from '../../shared/mcp'
import type { Actor } from '../worker/types'
import './style.css'

type Info = { endpoint: string; actor: Actor; idleDays: number; serverTime: string }
const when = (value: string) => new Date(value).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false), [failed, setFailed] = useState(false)
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(timer) }, [copied])
  return <div className="mcp-copy"><div><strong>{label}</strong><button className="button" onClick={async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setFailed(false) } catch { setFailed(true) }
  }}>{copied ? '已复制 ✓' : '复制'}</button></div><pre tabIndex={0} aria-label={label}><code>{value}</code></pre>{failed && <p role="status">无法自动复制，请选中上方文字手动复制。</p>}</div>
}
export function McpSettings() {
  const [info, setInfo] = useState<Info | null>(null), [connections, setConnections] = useState<McpConnection[]>([])
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [revoking, setRevoking] = useState('')
  async function refresh() {
    try { const [details, result] = await Promise.all([api<Info>('mcp/info'), api<{ connections: McpConnection[] }>('mcp/connections')]); setInfo(details); setConnections(result.connections); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : '暂时无法加载连接信息。') }
  }
  useEffect(() => {
    let active = true
    Promise.all([api<Info>('mcp/info'), api<{ connections: McpConnection[] }>('mcp/connections')]).then(([details, result]) => {
      if (active) { setInfo(details); setConnections(result.connections) }
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : '暂时无法加载连接信息。') })
    return () => { active = false }
  }, [])
  async function revoke(connection: McpConnection) {
    if (!window.confirm(`撤销「${connection.client_name}」的授权？这个客户端将无法继续读取或修改 CMS，重新连接需要再次登录授权。`)) return
    setRevoking(connection.id); setError(''); setNotice('')
    try { await api('mcp/connections', 'DELETE', { id: connection.id }); setNotice('授权已撤销，客户端无法继续操作。'); await refresh() }
    catch (e) { setError(e instanceof Error ? e.message : '撤销失败，请重试。') }
    finally { setRevoking('') }
  }
  const endpoint = info?.endpoint
  return <div className="mcp-settings">
    {error && <div className="notice error" role="alert">{error}<button className="button" onClick={refresh}>重试</button></div>}
    {notice && <div className="notice" role="status">{notice}</div>}
    <section className="form-card"><div className="card-heading"><h2>把内容工作室接入 AI 助手</h2><p>让 Codex、Claude Code 或支持 OAuth 的 MCP 客户端，直接帮你整理和更新网站内容。</p></div>
      <ol className="mcp-steps"><li><strong>添加连接</strong><span>复制下面的安装命令或服务器地址。</span></li><li><strong>登录并授权</strong><span>首次连接会打开 CMS，选择允许的操作。</span></li><li><strong>持续使用</strong><span>勾选「保持连接」后自动续期，也可以随时撤销。</span></li></ol>
      {endpoint ? <CopyBlock label="MCP 服务器地址" value={endpoint} /> : <p>正在加载连接信息…</p>}
      <p>每个客户端单独授权。编辑草稿与发布到官网分别授权；成员权限变化后，连接权限也会随之收回。</p>
    </section>
    {endpoint && <div className="two-columns"><section className="form-card"><div className="card-heading"><h2>Codex</h2><p>在终端执行，按客户端提示打开浏览器授权。</p></div>
      <CopyBlock label="Codex 安装命令" value={`codex mcp add super0to1-cms --url ${endpoint}`} />
      <p>使用 CMS 账号登录，按需勾选「编辑草稿」和「保持连接」。</p><details><summary>未自动打开登录，或需要重新授权？</summary><CopyBlock label="Codex 登录命令" value="codex mcp login super0to1-cms --scopes cms:read,cms:write,offline_access" /></details>
    </section><section className="form-card"><div className="card-heading"><h2>Claude Code</h2><p>先添加 HTTP 连接，再在 Claude Code 中完成授权。</p></div>
      <CopyBlock label="Claude Code 安装命令" value={`claude mcp add --transport http --scope user super0to1-cms ${endpoint}`} />
      <p>进入 Claude Code，运行 <code>/mcp</code>，选择 <strong>super0to1-cms</strong> 并进行身份验证。</p>
    </section></div>}
    {endpoint && <section className="form-card"><div className="card-heading"><h2>其他 MCP 客户端</h2><p>新增远程 HTTP / Streamable HTTP 服务器，填入上方地址，认证方式选择 OAuth。</p></div>
      <p>无需填写 API Key 或 CMS 密码。客户端需要支持浏览器 OAuth 登录和刷新令牌；登录后在授权页选择读取、编辑或发布权限。</p>
      <details><summary>查看 JSON 配置示例</summary><CopyBlock label="HTTP MCP 配置示例（字段因客户端而异）" value={JSON.stringify({ mcpServers: { 'super0to1-cms': { type: 'http', url: endpoint } } }, null, 2)} /></details>
    </section>}
    <section className="form-card"><div className="card-heading mcp-section-heading"><div><h2>我的已授权连接</h2><p>撤销后，已签发的访问令牌和后续续期都会失效。</p></div><button className="button" onClick={refresh}>刷新</button></div>
      {!connections.length ? <p className="empty-state">还没有授权连接。安装后，第一次登录授权就会出现在这里。</p> : <div className="mcp-connections">{connections.map(connection => {
        const expired = new Date(connection.expires_at).getTime() <= new Date(info?.serverTime ?? '').getTime()
        const active = !connection.revoked_at && !expired
        return <article className="mcp-connection" key={connection.id}><div className="mcp-section-heading"><h3>{connection.client_name}</h3><span className={`badge ${active ? 'green' : ''}`}>{connection.revoked_at ? '已撤销' : expired ? '已过期' : '已授权'}</span></div><div className="mcp-scope-tags">{connection.scopes.map(scope => <span className="badge" key={scope}>{scopeLabels[scope as McpScope]?.title || scope}</span>)}</div><p>授权于 {when(connection.created_at)}<br />{connection.last_used_at ? `最近使用 ${when(connection.last_used_at)}` : '等待客户端首次连接'}</p>{active && <button className="button" disabled={!!revoking} onClick={() => revoke(connection)}>{revoking === connection.id ? '正在撤销…' : '撤销授权'}</button>}</article>
      })}</div>}
    </section>
  </div>
}

type Consent = { handle: string; actor: Actor; details: { clientName: string; clientDomain?: string; redirectHost: string; redirectIsLoopback: boolean; scope: string[] } }
export function McpConsent() {
  const [consent, setConsent] = useState<Consent | null>(null), [scopes, setScopes] = useState<McpScope[]>([])
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => {
    document.title = '授权 MCP 连接 · Super 0→1'
    api<Consent>(`mcp/consent${window.location.search}`).then(result => {
      setConsent(result)
      setScopes([...new Set<McpScope>(['cms:read', 'offline_access', ...result.details.scope.filter((scope): scope is McpScope => mcpScopes.includes(scope as McpScope) && (result.actor.role === 'admin' || !['cms:publish', 'cms:settings'].includes(scope)))])])
    }).catch(e => setError(e instanceof Error ? e.message : '无法打开授权请求。'))
  }, [])
  async function decide(decision: 'approve' | 'deny') {
    if (!consent) return
    setBusy(true); setError('')
    try {
      const result = await api<{ redirectTo: string }>('mcp/consent', 'POST', { handle: consent.handle, decision, scopes })
      window.location.assign(result.redirectTo)
    } catch (e) { setError(e instanceof Error ? e.message : '授权失败，请重新连接。'); setBusy(false) }
  }
  return <main className="mcp-consent"><a className="brand" href="/">Super <span>0→1</span></a><section className="form-card">
    <p className="eyebrow">CONNECT YOUR ASSISTANT</p><h1>授权 MCP 连接</h1>
    {error && <p role="alert" className="notice error">{error} 请从客户端重新发起连接。</p>}
    {!consent ? !error && <p>正在核对客户端信息…</p> : <>
      <p><strong>{consent.details.clientName}</strong> 请求访问你的内容工作室。</p>
      <div className="mcp-client-details"><p>当前账号：<strong>{consent.actor.email}</strong></p><p>{consent.details.clientDomain ? `客户端发布域名：${consent.details.clientDomain}` : '客户端名称由应用自行填写，请确认是你刚刚发起的连接。'}</p><p>授权将返回：<strong>{consent.details.redirectHost}</strong>{consent.details.redirectIsLoopback && '（这台电脑上的应用）'}</p></div>
      <h2>允许它做什么？</h2><div className="mcp-consent-scopes">{mcpScopes.filter(scope => consent.actor.role === 'admin' || !['cms:publish', 'cms:settings'].includes(scope)).map(scope => <label className="mcp-scope-option" key={scope}><input type="checkbox" checked={scopes.includes(scope)} disabled={busy || scope === 'cms:read'} onChange={event => setScopes(event.target.checked ? [...scopes, scope] : scopes.filter(value => value !== scope))} /><span><strong>{scopeLabels[scope].title}</strong><small>{scopeLabels[scope].description}</small></span></label>)}</div>
      <p className="mcp-consent-note">授权后，客户端可在所选权限内直接操作。你可以随时在 CMS「MCP 连接」中撤销。翻译操作会将所选文字发送给翻译服务。</p>
      <div className="modal-actions"><button className="button" disabled={busy || !!error} onClick={() => decide('deny')}>拒绝</button><button className="button primary" disabled={busy || !!error} onClick={() => decide('approve')}>{busy ? '正在返回客户端…' : '授权连接'}</button></div>
    </>}
  </section></main>
}
