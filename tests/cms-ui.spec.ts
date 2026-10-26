import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

test('CMS next-session state controls homepage booking and excludes ended or cancelled sessions', async ({ page }) => {
  const content = JSON.parse(readFileSync('content/published/site.json', 'utf8'))
  const session = content.sessions[0]
  content.home.upcomingSessionId = session.id
  session.signupUrl = 'https://booking.example.test/session'
  await page.route('**/api/previews/22222222-2222-2222-2222-222222222222', route => route.fulfill({ json: content }))
  const previewUrl = '/preview.html?id=22222222-2222-2222-2222-222222222222&path=/'
  session.eventState = 'open'
  await page.goto(previewUrl)
  await expect(page.locator('.hero .actions').getByRole('link', { name: 'Register for the next session', exact: true })).toHaveAttribute('href', 'https://booking.example.test/session?role=Session+attendee&lang=en')
  session.eventState = 'announced'
  await page.reload()
  await expect(page.locator('.hero .actions').getByRole('link', { name: 'See the next session', exact: true })).toHaveAttribute('href', `/sessions/${session.slug}`)
  for (const state of ['ended', 'cancelled']) {
    session.eventState = state
    await page.reload()
    await expect(page.locator('.hero .actions').getByRole('link', { name: 'View sessions', exact: true })).toBeVisible()
    await expect(page.locator('.hero .actions a[target="_blank"]')).toHaveCount(0)
    await page.locator('.hero .actions').getByRole('link', { name: 'View sessions', exact: true }).click()
    await expect(page.locator('#upcoming')).toContainText('No upcoming session announced yet.')
    await expect(page.locator('#upcoming a, #upcoming button')).toHaveCount(0)
  }
})

test('homepage preview honors CMS recommendations and the inline email form', async ({ page }) => {
  const content = JSON.parse(readFileSync('content/published/site.json', 'utf8'))
  content.home.showSessions = false
  content.home.showVideos = false
  content.projects[0].name = 'Private preview prototype'
  content.site.signupTargets.Community = 'https://newsletter.example.test/join?source=cms'
  content.site.signupUrl = 'https://registration.example.test/default'
  await page.route('**/api/previews/11111111-1111-1111-1111-111111111111', route => route.fulfill({ json: content }))
  await page.goto('/preview.html?id=11111111-1111-1111-1111-111111111111&path=/')
  await expect(page.locator('main h2 a')).toHaveText(['Super Lab ↗'])
  await expect(page.locator('main .project-card').first()).toContainText('Private preview prototype')
  await page.locator('.hero').getByRole('button', { name: 'Sign up for email updates', exact: false }).click()
  const dialog = page.getByRole('dialog', { name: 'Get email updates', exact: true })
  await expect(dialog.getByLabel('Email', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('link')).toHaveCount(0)
  await page.keyboard.press('Escape')
  content.site.signupTargets.Community = ''
  content.home.projectIds = []
  await page.reload()
  await expect(page.locator('main .project-card')).toHaveCount(0)
  await expect(page.locator('main h2 a')).toHaveCount(0)
  await page.locator('.hero').getByRole('button', { name: 'Sign up for email updates', exact: false }).click()
  await expect(dialog.getByLabel('Email', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('link')).toHaveCount(0)
})

test('search matches either language and makes empty results recoverable', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '01 活动' }).click()
  const rows = page.locator('.content-row')
  const total = await rows.count()
  expect(total).toBeGreaterThan(0)
  await rows.first().click()
  const englishTitle = await page.getByRole('group', { name: '活动标题', exact: true }).getByRole('textbox', { name: 'English', exact: true }).inputValue()
  expect(englishTitle).not.toBe('')
  await page.getByRole('button', { name: '← 返回列表' }).click()
  await page.getByRole('textbox', { name: '搜索内容' }).fill(`  ${englishTitle.toUpperCase()}  `)
  await expect(rows).not.toHaveCount(0)
  await page.getByRole('textbox', { name: '搜索内容' }).fill('no-matching-content-67953')
  await expect(page.getByRole('heading', { name: '没有找到匹配的内容' })).toBeVisible()
  await expect(rows).toHaveCount(0)
  await page.getByRole('button', { name: '查看全部内容' }).click()
  await expect(rows).toHaveCount(total)
  await expect(page.getByRole('textbox', { name: '搜索内容' })).toHaveValue('')
})

test('dialogs contain keyboard focus, close with Escape, and return focus to the opener', async ({ page }) => {
  await page.goto('/')
  const publish = page.getByRole('button', { name: '发布内容 ↗' })
  await publish.click()
  const dialog = page.getByRole('dialog', { name: '发布内容', exact: true })
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate(el => el.contains(document.activeElement) || document.activeElement === document.body)).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(publish).toBeFocused()
  await page.getByRole('button', { name: '01 活动' }).click()
  await page.locator('.content-row').first().click()
  const chooseImage = page.getByRole('button', { name: '选择 / 上传图片' })
  await chooseImage.click()
  await expect(page.getByRole('dialog', { name: '选择图片' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(chooseImage).toBeFocused()
  const translate = page.locator('.content-translation-bar').getByRole('button', { name: '中文 → English', exact: true })
  await translate.click()
  await expect(page.getByRole('dialog', { name: 'AI 翻译', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(translate).toBeFocused()
})

test('edit a private session, upload a cover, preview both languages, and restore the draft', async ({ page, request }) => {
  const original = await (await request.get('/api/state')).json()
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '工作台', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '01 活动' }).click()
    await page.getByRole('button', { name: '＋ 新建活动' }).click()
    await page.getByRole('group', { name: '活动标题', exact: true }).getByRole('textbox', { name: '中文', exact: true }).fill('CMS 测试活动，仅草稿')
    await page.getByRole('group', { name: '活动标题', exact: true }).getByRole('textbox', { name: 'English', exact: true }).fill('CMS draft verification')
    await page.getByLabel('日期精度').selectOption('month')
    await page.getByRole('group', { name: '显示月份', exact: true }).getByRole('textbox', { name: '中文', exact: true }).fill('2026 年 11 月')
    await page.getByRole('group', { name: '显示月份', exact: true }).getByRole('textbox', { name: 'English', exact: true }).fill('November 2026')
    await page.getByRole('button', { name: '选择 / 上传图片' }).click()
    await page.locator('input[type=file]').setInputFiles('public/media/session-direction.png')
    await page.getByLabel('裁切方式').selectOption('wide')
    await page.getByRole('button', { name: '上传图片', exact: true }).click()
    await expect(page.getByRole('dialog', { name: '选择图片', exact: true })).toBeHidden()
    await page.getByRole('group', { name: '图片说明（用于无障碍阅读）', exact: true }).getByRole('textbox', { name: '中文', exact: true }).fill('测试活动照片')
    await page.getByRole('group', { name: '图片说明（用于无障碍阅读）', exact: true }).getByRole('textbox', { name: 'English', exact: true }).fill('Test session photo')
    await page.getByRole('button', { name: '保存草稿', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('草稿已保存')
    const current = await (await request.get('/api/state')).json()
    const created = current.data.sessions.find((x: { title: { en: string } }) => x.title.en === 'CMS draft verification')
    expect(created.published).toBe(false)
    expect(created.image).toMatch(/^media:[a-f0-9]{64}$/)
    await page.getByRole('button', { name: '预览', exact: true }).click()
    const preview = page.frameLocator('iframe[title="网站内容预览"]')
    await expect(preview.getByRole('heading', { name: 'CMS 测试活动，仅草稿', exact: true })).toBeVisible()
    const photo = preview.locator('img.feature-photo')
    await expect(photo).toBeVisible()
    expect(await photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
    await page.getByLabel('预览语言').selectOption('en')
    await expect(preview.getByRole('heading', { name: 'CMS draft verification', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '切换手机' }).click()
    await expect(page.locator('iframe')).toHaveCSS('width', '390px')
    await page.getByRole('button', { name: '关闭预览' }).click()
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: '/tmp/super0to1-cms-mobile.png', fullPage: true })
    expect(errors).toEqual([])
  } finally {
    const latest = await (await request.get('/api/state')).json()
    const restored = await request.put('/api/state', { data: { revision: latest.revision, data: original.data }, headers: { Origin: 'http://127.0.0.1:8788' } })
    expect(restored.ok()).toBe(true)
  }
})

test('translate a whole record or one field, review before applying, and keep existing translations on failure', async ({ page }) => {
  const sent: { source: string; entries: { id: string; text: string }[] }[] = []
  let fail = false
  await page.route('**/api/translate', async route => {
    const body = route.request().postDataJSON()
    sent.push(body)
    if (fail) return route.fulfill({ status: 503, json: { error: '翻译服务暂时不可用，原内容未修改。' } })
    await route.fulfill({ json: { target: body.source === 'zh' ? 'en' : 'zh', translations: body.entries.map((entry: { id: string }) => ({ id: entry.id, text: body.source === 'zh' ? 'From idea to action' : '从想法到行动（译文）' })) } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: '02 视频' }).click()
  await page.getByRole('button', { name: '＋ 新建视频' }).click()
  const title = page.getByRole('group', { name: '视频标题', exact: true })
  const summary = page.getByRole('group', { name: '视频简介', exact: true })
  await title.getByRole('textbox', { name: '中文', exact: true }).fill('从想法到行动')
  await summary.getByRole('textbox', { name: '中文', exact: true }).fill('分享真实的创造过程。')
  await summary.getByRole('textbox', { name: 'English', exact: true }).fill('Hand-edited English')
  await page.locator('.content-translation-bar').getByRole('button', { name: '中文 → English', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'AI 翻译', exact: true })
  await expect(modal.getByRole('checkbox', { name: '标题', exact: true })).toBeChecked()
  await expect(modal.getByRole('checkbox', { name: '简介 已有译文' })).not.toBeChecked()
  await modal.getByRole('button', { name: '生成译文', exact: true }).click()
  await expect(modal.getByLabel('标题译文', { exact: true })).toHaveValue('From idea to action')
  await expect(title.getByRole('textbox', { name: 'English', exact: true })).toHaveValue('')
  expect(sent[0]).toEqual({ source: 'zh', entries: [{ id: 'title', text: '从想法到行动' }] })
  await modal.getByRole('button', { name: '应用 1 项译文到草稿' }).click()
  await expect(title.getByRole('textbox', { name: 'English', exact: true })).toHaveValue('From idea to action')
  await expect(summary.getByRole('textbox', { name: 'English', exact: true })).toHaveValue('Hand-edited English')
  await expect(title.getByRole('textbox', { name: '中文', exact: true })).toHaveValue('从想法到行动')
  await title.getByRole('button', { name: 'English → 中文', exact: true }).click()
  await expect(modal.getByRole('button', { name: '生成译文', exact: true })).toBeDisabled()
  await modal.getByRole('checkbox', { name: '视频标题 已有译文' }).check()
  await modal.getByRole('button', { name: '生成译文', exact: true }).click()
  await modal.getByLabel('视频标题译文', { exact: true }).fill('人工确认的中文标题')
  await page.screenshot({ path: '/tmp/super0to1-cms-translation.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await modal.getByRole('button', { name: '应用 1 项译文到草稿' }).click()
  await expect(title.getByRole('textbox', { name: '中文', exact: true })).toHaveValue('人工确认的中文标题')
  await expect(title.getByRole('textbox', { name: 'English', exact: true })).toHaveValue('From idea to action')
  fail = true
  await title.getByRole('button', { name: '中文 → English', exact: true }).click()
  await modal.getByRole('checkbox', { name: '视频标题 已有译文' }).check()
  await modal.getByRole('button', { name: '生成译文', exact: true }).click()
  await expect(modal.getByRole('alert')).toContainText('原内容未修改')
  await modal.getByRole('button', { name: '关闭翻译' }).click()
  await expect(title.getByRole('textbox', { name: 'English', exact: true })).toHaveValue('From idea to action')
})


test('CMS Lab preview shares product stages and localized form labels with the website', async ({ page }) => {
  const content = JSON.parse(readFileSync('content/published/site.json', 'utf8'))
  await page.route('**/api/previews/33333333-3333-3333-3333-333333333333', route => route.fulfill({ json: content }))
  for (const [path, label, title, options] of [
    ['/lab', 'Product stage', 'Bring your product', ['Choose a stage', 'Building the first version · No users yet', 'Testing with early users · No paying customers yet', 'Serving paying customers']],
    ['/zh/lab', '产品阶段', '带上你的产品', ['请选择阶段', '首版开发中 · 暂无用户', '早期用户试用中 · 暂无付费客户', '已有付费客户']],
  ] as const) {
    await page.goto(`/preview.html?id=33333333-3333-3333-3333-333333333333&path=${encodeURIComponent(path)}`)
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await expect(page.getByLabel(label, { exact: true }).locator('option')).toHaveText([...options])
  }
})


test('homepage controls save to a private preview in the website section order', async ({ page, request }) => {
  const original = await (await request.get('/api/state')).json()
  try {
    await page.goto('/')
    await page.getByRole('button', { name: '↗ 首页推荐', exact: true }).click()
    await expect(page.locator('main h2')).toHaveText(['下一场活动', '项目推荐', '活动推荐', '视频推荐'])
    await page.getByLabel('下一场活动', { exact: true }).selectOption('')
    for (const checkbox of await page.getByRole('checkbox', { name: '在首页显示这个区块', exact: true }).all()) await checkbox.uncheck()
    await page.getByRole('button', { name: '保存草稿', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('草稿已保存')
    await page.getByRole('button', { name: '预览', exact: true }).click()
    const preview = page.frameLocator('iframe[title="网站内容预览"]')
    await expect(preview.locator('main h2 a')).toHaveCount(0)
    await expect(preview.locator('.hero-action-note')).toContainText('下一场共学尚未公布')
  } finally {
    const latest = await (await request.get('/api/state')).json()
    const restored = await request.put('/api/state', { data: { revision: latest.revision, data: original.data }, headers: { Origin: 'http://127.0.0.1:8788' } })
    expect(restored.ok()).toBe(true)
  }
})
