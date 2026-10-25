export const mcpScopes = ['cms:read', 'cms:write', 'cms:publish', 'cms:settings', 'offline_access'] as const
export type McpScope = typeof mcpScopes[number]
export const scopeLabels: Record<McpScope, { title: string; description: string }> = {
  'cms:read': { title: '读取内容', description: '读取私有草稿、媒体库和发布记录。' },
  'cms:write': { title: '编辑草稿', description: '新增、修改、移除内容，上传图片、翻译和创建预览。保存不会自动上线。' },
  'cms:publish': { title: '发布到官网', description: '发布所有已勾选内容，或重新发布历史版本。仅管理员可授予。' },
  'cms:settings': { title: '修改站点设置', description: '修改报名链接、联系邮箱和站点信息。仅管理员可授予。' },
  'offline_access': { title: '保持连接', description: '自动续期，无需每次登录；连续 90 天未续期后需要重新授权。' },
}
export type McpConnection = { id: string; client_name: string; client_id: string; scopes: string[]; created_at: string; last_used_at: string | null; expires_at: string; revoked_at: string | null }
