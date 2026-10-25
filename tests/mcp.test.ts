import test from 'node:test'
import assert from 'node:assert/strict'
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { mcpHandler } from '../cms/worker/mcp-tools'
import { memberActor } from '../cms/worker/auth'
import { mcpScopes } from '../shared/mcp'
import type { Env } from '../cms/worker/types'

test('MCP capabilities intersect granted scopes with the current CMS role', async () => {
  for (const role of ['admin', 'editor'] as const) {
    const handler = mcpHandler({} as Env, { email: 'member@example.test', role }, [...mcpScopes], 'https://cms.example.test', {} as ExecutionContext)
    const client = new Client({ name: 'test', version: '1' })
    try {
      await client.connect(new StreamableHTTPClientTransport(new URL('https://mcp.example.test/mcp'), { fetch: async (input, init) => handler.fetch(new Request(input, init)) }))
      const names = (await client.listTools()).tools.map(tool => tool.name)
      assert(names.includes('cms_save_session'))
      assert.equal(names.includes('cms_publish'), role === 'admin')
      assert.equal(names.includes('cms_save_settings'), role === 'admin')
      assert(!names.some(name => name.includes('member')))
      if (role === 'editor') {
        await assert.rejects(client.callTool({ name: 'cms_publish', arguments: { revision: 1, requestId: crypto.randomUUID(), confirm: true } }), { code: -32602 })
      }
    } finally { await client.close(); await handler.close() }
  }
})

test('read-only MCP authorization exposes no draft-writing or publishing tools', async () => {
  const handler = mcpHandler({} as Env, { email: 'owner@example.test', role: 'admin' }, ['cms:read'], 'https://cms.example.test', {} as ExecutionContext)
  const client = new Client({ name: 'test', version: '1' })
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL('https://mcp.example.test/mcp'), { fetch: async (input, init) => handler.fetch(new Request(input, init)) }))
    assert.deepEqual((await client.listTools()).tools.map(tool => tool.name).sort(), ['cms_check_publish', 'cms_get_state', 'cms_list_media', 'cms_list_releases'])
  } finally { await client.close(); await handler.close() }
})

test('membership is looked up again after role changes or removal', async () => {
  let role: 'admin' | 'editor' | null = 'admin'
  const env = { DB: { prepare() { return { bind() { return { async first() { return role ? { role } : null } } } } } } } as unknown as Env
  assert.equal((await memberActor('member@example.test', env)).role, 'admin')
  role = 'editor'
  assert.equal((await memberActor('member@example.test', env)).role, 'editor')
  role = null
  await assert.rejects(memberActor('member@example.test', env), { status: 403 })
})
