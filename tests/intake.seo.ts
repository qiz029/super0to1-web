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
  await page.locator('.hero').getByRole('button', { name: 'Email updates', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Get email updates', exact: true })
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
  await page.locator('.hero').getByRole('link', { name: '带原型来', exact: true }).click()
  await expect(page).toHaveURL(/\/zh\/lab#submit-prototype$/)
  const form = page.locator('#submit-prototype form')
  await form.getByLabel('产品名称', { exact: true }).fill('测试原型')
  await form.getByLabel('它是做什么的？', { exact: true }).fill('帮助体验产品')
  await form.getByLabel('它为谁解决什么问题？', { exact: true }).fill('帮助创作者收集反馈')
  await form.getByLabel('目前阶段', { exact: true }).selectOption('prototype')
  await form.getByLabel('联系方式', { exact: true }).selectOption('wechat')
  await form.getByLabel('微信号', { exact: true }).fill('test-builder')
  await form.getByRole('button', { name: '提交原型', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('已收到你的原型信息')
  expect(received?.type).toBe('prototype')
  expect(received?.contactType).toBe('wechat')
  expect(received?.email).toBeUndefined()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
