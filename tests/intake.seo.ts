import { test, expect } from '@playwright/test'

test('newsletter asks only for email, retains it on failure, and only accepts a matching receipt', async ({ page }) => {
  const requests: Record<string, string>[] = []
  let success = false
  await page.route('**/api/intake', async route => {
    const body = route.request().postDataJSON()
    requests.push(body)
    await route.fulfill({ status: success ? 200 : 503, json: success ? { ok: true, requestId: body.requestId } : { error: 'unavailable' } })
  })
  await page.goto('/')
  await page.locator('.hero').getByRole('button', { name: 'Join us', exact: false }).click()
  const dialog = page.getByRole('dialog', { name: 'Join us', exact: true })
  await expect(dialog.getByRole('textbox')).toHaveCount(1)
  await dialog.getByLabel('Email', { exact: true }).fill('test@example.test')
  await dialog.getByRole('button', { name: 'Subscribe', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(dialog.getByLabel('Email', { exact: true })).toHaveValue('test@example.test')
  success = true
  await dialog.getByRole('button', { name: 'Subscribe', exact: true }).click()
  await expect(dialog.getByRole('status')).toContainText('Thanks for subscribing')
  expect(requests[0].requestId).toBe(requests[1].requestId)
  expect(requests[1].type).toBe('newsletter')
})

test('prototype action leads to the Lab form, accepts WeChat, and does not subscribe the builder', async ({ page }) => {
  let received: Record<string, string> | undefined
  await page.route('**/api/intake', async route => {
    received = route.request().postDataJSON()
    await route.fulfill({ json: { ok: true, requestId: received?.requestId } })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/zh')
  await page.locator('.hero').getByRole('link', { name: '提交产品报名', exact: false }).click()
  await expect(page).toHaveURL(/\/zh\/lab#submit-prototype$/)
  const form = page.locator('#submit-prototype form')
  await form.getByLabel('产品名称', { exact: true }).fill('测试原型')
  await form.getByLabel('它是做什么的？', { exact: true }).fill('帮助体验产品')
  await form.getByLabel('它为谁解决什么问题？', { exact: true }).fill('帮助创作者收集反馈')
  await form.getByLabel('产品阶段', { exact: true }).selectOption('testing')
  await form.getByLabel('联系方式', { exact: true }).selectOption('wechat')
  await form.getByLabel('微信号', { exact: true }).fill('test-builder')
  await form.getByRole('button', { name: '提交产品', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('已收到你的产品信息')
  expect(received?.type).toBe('prototype')
  expect(received?.contactType).toBe('wechat')
  expect(received?.email).toBeUndefined()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})


test('tester signup collects only email and carries the tester source', async ({ page }) => {
  let received: Record<string, string> | undefined
  await page.route('**/api/intake', async route => {
    received = route.request().postDataJSON()
    await route.fulfill({ json: { ok: true, requestId: received?.requestId } })
  })
  await page.goto('/lab')
  await expect(page.locator('.lab-hero .lab-illustration')).toBeVisible()
  expect(await page.locator('.lab-illustration').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  await expect(page.locator('#submit-prototype .lab-flow li')).toHaveCount(3)
  await expect(page.locator('.lab-tester, .grid-3 .step')).toHaveCount(0)
  await page.locator('.lab-entry-actions button').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('textbox')).toHaveCount(1)
  await dialog.getByLabel('Email', { exact: true }).fill('tester@example.test')
  await dialog.getByRole('button', { name: 'Subscribe', exact: true }).click()
  await expect(dialog.getByRole('status')).toBeVisible()
  expect(received?.source).toBe('lab_tester')
  expect(received?.type).toBe('newsletter')
})
