# CMS MCP 连接

CMS 安装入口：[MCP 连接](https://cms.super0to1.com/#mcp)。
远程地址：`https://mcp.super0to1.com/mcp`，使用 Streamable HTTP 和 OAuth。

## 安装与授权

Codex：

```sh
codex mcp add super0to1-cms --url https://mcp.super0to1.com/mcp
```

按提示完成浏览器授权，按需勾选「编辑草稿」和「保持连接」。如未自动打开登录，或需要重新授权：

```sh
codex mcp login super0to1-cms --scopes cms:read,cms:write,offline_access
```

Claude Code：

```sh
claude mcp add --transport http --scope user super0to1-cms https://mcp.super0to1.com/mcp
```

然后在 Claude Code 中运行 `/mcp`，选择 `super0to1-cms` 并验证身份。
其他客户端选择远程 HTTP / Streamable HTTP，填入同一地址并选择 OAuth 认证。
客户端必须支持浏览器授权、PKCE S256，以及保存和刷新 OAuth 令牌。

首次连接会跳转 CMS，使用已有的 Cloudflare Access 登录，再选择授权范围。
不需要把 CMS 密码、Cookie 或 API Key 填入 MCP 配置。每个客户端单独授权。

| 授权项 | 允许的操作 |
| --- | --- |
| `cms:read` | 读取私有内容、媒体、发布检查和发布记录；必选 |
| `cms:write` | 编辑内容和首页推荐、移除草稿条目、上传 WebP 图片、生成翻译和创建预览 |
| `cms:publish` | 发布整批已选内容，重新发布历史版本；只有管理员可以授权和使用 |
| `cms:settings` | 修改报名链接、邮箱及站点设置；只有管理员可以授权和使用 |
| `offline_access` | 保持连接并自动续期 |

勾选「保持连接」后，访问令牌有效期一小时，客户端通过轮换的刷新令牌自动续期。
每次续期延长 90 天有效期，因此持续使用无需重复登录；连续 90 天未续期后需要重新授权。
不勾选保持连接时，访问令牌到期后重新授权。客户端清除凭据、CMS 撤销授权或移除成员后也需要重新连接。

CMS 的「我的已授权连接」展示客户端、授权范围、授权时间及最近使用时间，可逐项撤销。
撤销先写入 D1，每次 MCP 请求和刷新都检查 D1，因此不依赖 KV 删除的传播速度。
正在执行的操作可能已经完成，撤销不会回滚已保存内容或已提交的发布。

## 可用工具

- `cms_get_state`：读取完整草稿、当前 revision 和发布问题。
- `cms_save_session` / `cms_save_video` / `cms_save_project`：按稳定 ID 新建或替换一条内容。
- `cms_remove_content`：移除草稿条目，同时清理对应首页推荐；不会立即下架线上内容。
- `cms_save_home` / `cms_save_settings`：更新首页推荐或站点设置。
- `cms_save_draft`：替换完整草稿，站点信息变化仍检查 settings 授权。
- `cms_list_media` / `cms_upload_image`：读取媒体库、上传 Base64 WebP，最多 8 MiB。
- `cms_translate`：生成待核对译文，不自动保存；会调用既有翻译服务。
- `cms_create_preview`：冻结某个已保存 revision，返回需要 CMS 登录的私有预览链接。
- `cms_check_publish` / `cms_publish` / `cms_list_releases`：检查、发布和跟踪结果。

保存工具要求当前 revision，发生并发冲突时重新读取、合并后再保存。不会覆盖其他编辑者的新修改。
工具列表按授权范围和当前 CMS 角色筛选，每次调用重新检查成员角色；移除成员后拒绝连接。
不提供任意 HTTP、数据库、代码执行或成员管理工具。

发布行为和后台一致：发布所有已勾选内容及首页/站点设置，保存不等于发布。
发布工具要求 `confirm: true` 和幂等 `requestId`；调用者应先取得用户发布指令，重试复用同一个 requestId。
必须等发布记录显示 `live` 才能报告已上线。发布不是只发布当前编辑的一条内容。

## 实现与部署

一个 CMS Worker 服务两个域名：

- `cms.super0to1.com`：原有 Access 登录、CMS UI、浏览器 API、授权页；继续验证 Access JWT 和成员权限。
- `mcp.super0to1.com`：只开放 `/mcp`、OAuth 注册/令牌和标准发现端点。这里的 `/api/state`、CMS 页面和授权管理接口始终返回 404。

不要给整个 MCP 域名套交互式 Access 登录，也不要取消 CMS 域名的 Access 保护。
OAuth discovery 指向 CMS 的 `/oauth/authorize`，只有授权页需要浏览器登录。
MCP bearer token 只用于 MCP 资源，不能代替 CMS 登录。

使用官方 `@cloudflare/workers-oauth-provider` 处理 PKCE、客户端注册、浏览器绑定授权、令牌加密存储、刷新轮换和受众检查；使用官方 `@modelcontextprotocol/server` 提供协议与工具。
兼容支持 2025 协议的 Streamable HTTP 客户端及当前 SDK 客户端。
生产启用 `global_fetch_strictly_public`，用于安全获取 HTTPS 客户端元数据；也支持动态注册。

新增资源：`OAUTH_KV` 命名空间；D1 迁移 `0003_mcp.sql` 存连接、一次性授权账号绑定和限流计数，不存令牌明文。
授权记录包含用户邮箱及客户端信息，应保持私有。令牌不能写进 Git、安装命令或日志。

部署前：

1. 创建 OAuth KV，并将实际 namespace ID 写入 `cms/wrangler.jsonc`。
2. 应用 D1 迁移，再部署 CMS Worker。Wrangler 配置包含 MCP 自定义域名。
3. 确认公开资源发现返回 MCP 地址，未认证 `/mcp` 返回 401 和 `WWW-Authenticate`，CMS `/api/state` 仍要求登录。
4. 由使用者首次连接，在真实 CMS 登录后批准自己的客户端。

本地验证：

```sh
npm run cms:build
npx wrangler d1 migrations apply super0to1-cms --config cms/wrangler.dev.jsonc --local
npm run cms:api
npm test
npx playwright test
```

浏览器测试在本地登录豁免环境验证整个授权、读写、预览、刷新和撤销流程，不调用线上发布或真实翻译服务。
生产 Access 登录及用户自己客户端的首次批准仍由实际账号完成。

参考：[MCP 授权规范](https://modelcontextprotocol.io/specification/latest/basic/authorization)、[Cloudflare OAuth provider](https://github.com/cloudflare/workers-oauth-provider)、[MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/v2/serving/web-standard.html)。
