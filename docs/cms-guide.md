# CMS 使用说明

后台：https://cms.super0to1.com 。官网：https://super0to1.com 。

## 已开放的模块

| 模块 | 可以修改 |
| --- | --- |
| 活动 | 中英文标题、摘要、正文段落、图片与替代文本、日期与时区、地点、报名链接、预告/开放报名/结束/取消状态、集合顺序、上架和下架 |
| 视频 | YouTube 地址、中英文标题与简介、嘉宾、日期、自定义封面、集合顺序、上架和下架 |
| 项目 | 名称、双语介绍、产品链接、封面、创造者、当前阶段、寻找帮助、使用步骤、Problem/Action/Outcome 成长记录、集合顺序、上架和下架 |
| 首页推荐 | 选择活动、视频、项目，调整推荐顺序，显示或隐藏区块，指定下一场活动 |
| 报名与设置 | 默认报名链接、各参与角色链接、联系邮箱、品牌名称、YouTube 主页 |
| 媒体库 | 上传 JPG/PNG/WebP、完整图片或 16:9 焦点裁切、自动缩小至最长边 1920px 并转换为 WebP、选择已有图片 |
| 发布记录 | 发布进度、部署链接、失败重试、重新发布历史内容版本 |

首页首屏等营销文案、About/Method/Lab 文案、SEO 手动覆盖、富文本、复制条目和成员管理界面留在后续阶段。布局、字体、配色和动画仍由代码维护。

## MCP 连接

后台侧栏「MCP 连接」提供 Codex、Claude Code 和通用远程 HTTP 的安装方式，以及授权撤销入口。首次连接经 CMS 登录并选择权限，之后自动续期。详见 [CMS MCP 连接说明](cms-mcp.md)。

## 编辑与发布

1. 用站长账号登录。当前 Access 仅开放站长邮箱；Google 登录或邮箱验证码均可。
2. 在活动、视频或项目中新建或编辑内容。双语并排填写；新内容默认只保存在草稿里。
3. 上传图片或从媒体库选择。活动和项目封面需要双语图片说明。视频默认使用 YouTube 缩略图。
4. 保存草稿，打开预览，切换中文/英文与桌面/手机。预览采用官网组件；仅登录编辑者可见，一天后过期。预览可展示草稿内容，因此不是本次发布条目的过滤视图。
5. 勾选「加入下次发布」。首页推荐引用的条目也必须勾选。取消勾选并发布会将该内容下架；草稿仍保留。
6. 打开发布检查并确认。第一版整批发布所有勾选内容，以及首页和站点设置；已经上线条目的其他已保存修改也会一起发布。没有逐条选择本次修改的功能。
7. 等待发布记录显示「已上线」。系统先冻结公开快照，再通过 GitHub App 提交到 main，触发 Actions；同时核对成功的部署任务、官网内容版本和提交号。

保存不等于上线。发布期间可以继续编辑下一份草稿，但一次只能有一项发布进行中。刷新后会加载最近保存的草稿；并发保存时拒绝覆盖别人的新版本。第一版保留全站草稿修订，不提供逐条修订历史界面。

已发布的活动/项目 slug 和视频 YouTube ID 锁定，避免旧链接失效；新地址应创建新条目。历史活动保留原有月份，不推测具体时间。新活动使用包含 UTC 偏移的时间，例如 `2026-11-15T14:00:00-08:00`，并指定显示时区。

「开放报名」必须配置活动链接、角色链接、默认链接或联系邮箱。预告活动只显示查看详情入口。取消的活动详情页显示取消提示，不再显示报名按钮。

原有六期视频的标题已按原样导入两个语言字段，尚未重新翻译。报名链接和邮箱初始为空；应填写实际入口后再宣布开放报名。

## AI 中英文翻译

在活动、视频、项目编辑页，只填写中文或 English 即可开始：

1. 使用编辑页上方的「中文 → English」或「English → 中文」翻译整条内容；每个双语字段旁也有同样入口。
2. 默认只勾选目标语言为空的字段。重译已有内容时，主动勾选该字段或点击「全选（含已有译文）」。
3. 点击「生成译文」，并排核对原文与译文，可直接修改结果，再「应用到草稿」。
4. 应用不会自动保存或发布，仍需走保存、预览、发布流程。翻译失败、取消或未确认时不改变原内容。

标题、简介、正文、图片说明、地点、历史月份、项目阶段、创造者介绍和项目步骤/成长记录支持翻译。网址、slug、YouTube ID、精确时间、共享产品名等不作为可翻译字段发送。翻译期间源文或现有译文变化时会拒绝应用过期结果。

只有已登录管理员或编辑者可调用翻译接口。所选原文发送到 OpenAI；服务端使用 Responses API 的 [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)，设置 `store: false`，逐字段验证结果后返回。`store: false` 控制响应存储，不代表关闭提供商所有日志或保留机制。

当前模型是 `gpt-5.4-mini`（[官方模型说明](https://developers.openai.com/api/docs/models/gpt-5.4-mini)），由 Worker 变量 `OPENAI_TRANSLATION_MODEL` 配置。每次最多 12,000 个源字符，每位编辑者每小时最多 60 次请求；请求超时、字段遗漏或额度问题会明确报错，保留原内容。

`OPENAI_API_KEY` 只存 CMS Worker secret。仓库根目录 `.env` 保持忽略，Vite 前端不读取这个密钥。需要本地真实调用时，可在同样被忽略的 `cms/.dev.vars` 配置该变量；自动化测试使用模拟响应，不消耗 API 额度。

## 发布失败与恢复

- 「发布失败」：打开部署记录定位问题；修复后重试该版本，或编辑草稿并发起新发布。
- 「线上状态待核对」：任务结论或线上提交号不匹配。不要假定官网没变；核对官网和部署记录后重新发布。后台严格检查提交号，内容相同但后续代码提交覆盖也可能需要重新核对。
- 选择历史版本「重新发布此版本」会创建新的 GitHub 提交与部署。当前未发布草稿不会被覆盖。
- 自动重试通过发布 ID 防止重复提交。等待部署超过 30 分钟会报错；发布连接异常最多自动尝试三次。
- 已发布图片保留，以支持历史版本恢复；第一版不开放删除图片。未引用图片仍保留在私有媒体库。

## 开发与数据边界

```sh
npm ci
npm run cms:build
npx wrangler d1 migrations apply super0to1-cms --config cms/wrangler.dev.jsonc --local
npm run cms:api     # http://127.0.0.1:8788，独立本地配置
# 可选：另一终端 npm run cms:dev，带前端热更新及 API 代理
npm test
npm run lint
npm run build
npm run cms:build
npx playwright test # 登录本地豁免环境，覆盖图片上传和双语私有预览
```

仅独立的本地配置启用 `CMS_DEV`，且服务端校验 hostname 必须是 localhost/127.0.0.1。
生产配置不开启该标记；后台 Workers.dev 和预览域名关闭。CMS 域名上的后台资源、浏览器 API、图片、预览和 MCP 授权管理均验证 Access JWT 的签名、发行者、受众和成员权限；不信任裸 email 请求头。

- `shared/content.ts`：草稿与公开快照的严格 schema、双语/引用/URL 发布检查。
- `content/published/site.json`：唯一提交到公开仓库的 CMS 内容快照，不能写入草稿或内部备注。
- `cms/worker/`：权限、草稿、预览、媒体和发布任务。
- `cms/ui/`：管理界面和真实页面预览。
- `cms/migrations/`：D1 迁移；私有 state/revisions/previews/releases/members/media 表。
- R2 `original/`：仅认证后台可读的优化图片；`published/`：经发布操作复制的公开图片。
- 公网 Worker 只对 `/cms-media/<hash>.webp` 提供 `published/` 对象，不能读取 `original/`。

草稿数据库独立于代码仓库。后续直接修改公开 JSON 不会同步回 CMS 草稿；正式内容更新应通过 CMS。schema 变更必须同步迁移保存的 D1 状态，不能只更新导入种子。

## 生产配置与运维

Cloudflare 资源为 `super0to1-cms` Worker、同名 D1、`super0to1-cms-media` 私有 R2 bucket，以及 MCP 授权使用的 `OAUTH_KV`。独立 MCP 域名的保护方式见 [MCP 连接说明](cms-mcp.md)。
主站与后台共享该 bucket，生产绑定记录在两个 Wrangler 配置中。Actions 每次部署先执行 D1 迁移，再部署主站和 CMS，最后检查官网和后台登录门禁。

CMS Worker secrets：`CMS_OWNER_EMAIL`、`GITHUB_APP_PRIVATE_KEY`（PKCS8）、`OPENAI_API_KEY`。非敏感的 App ID、安装 ID、Access team URL 和 audience 在 CMS Wrangler 配置中。私钥仅存 Worker secret；不放 Actions、前端或公开 Git 仓库。

GitHub App `super0to1-cms-qiz029` 仅安装在此仓库，权限为 Contents write 与 Actions read。应用代码只写公开快照路径；GitHub 的 Contents 权限本身是仓库级，不能细化到单个文件。

GitHub Actions secrets：`CLOUDFLARE_ACCOUNT_ID` 与 `CLOUDFLARE_API_TOKEN`。部署 Token 仅限目标账号/zone，权限见 README；不拥有 Access 应用管理权限。

站长由 Worker secret 指定。添加团队成员需要同时更新 Access allow 邮箱策略，并用已认证管理员调用 `PUT /api/members` 写入 `{email, role: "editor" | "admin"}`。编辑者可保存、预览和上传；只有管理员可修改站点设置、发布和管理成员。撤销成员需同时撤销 Access allow 和数据库成员记录；当前没有成员管理 UI。

备份 D1 与 R2 时保持私有；备份含未公开草稿及编辑者邮箱。`wrangler d1 export ... --remote` 的导出文件不得加入本公开仓库。Access 策略、GitHub App 安装及 Worker secrets 的恢复独立于数据库备份。
