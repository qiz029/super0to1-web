import { test, expect } from '@playwright/test'

test('no upcoming event leaves no placeholder or booking prompt on home and program pages', async ({ page }) => {
  for (const path of ['/', '/sessions', '/lab']) {
    await page.goto(path)
    await expect(page.locator('.next-event, #upcoming')).toHaveCount(0)
    await expect(page.getByText('Date & location to be announced.', { exact: true })).toHaveCount(0)
  }
})

test('home prioritizes participation and content while preserving detail routes', async ({ page }) => {
  await page.goto('/')
  const navigation = page.locator('#site-nav')
  await expect(navigation.getByRole('link')).toHaveText(['Super Session', 'Super Lab', 'Super Lens', 'About'])
  await expect(navigation.getByRole('button')).toHaveCount(0)
  await expect(page.locator('.hero .actions a')).toHaveText(['Submit a product↗'])
  await expect(page.locator('.program-grid, .stepper, .join-copy')).toHaveCount(0)
  await expect(page.locator('main h2 a')).toHaveText(['Super Lab ↗', 'Super Session ↗', 'Super Lens ↗'])
  await page.locator('h2 a[href="/lab"]').click()
  await expect(page.locator('.project-card[href^="/projects/"]')).not.toHaveCount(0)
  await page.locator('.project-card[href^="/projects/"]').first().click()
  await expect(page.locator('h1')).not.toHaveText('This loop leads nowhere.')
  await page.goto('/')
  await page.locator('h2 a[href="/lens"]').click()
  await expect(page).toHaveURL(/\/lens$/)
  await expect(page.getByRole('heading', { name: 'Super Lens', exact: true })).toBeVisible()
})

test('email sign-up remains separate from prototype registration and returns keyboard focus', async ({ page }) => {
  await page.goto('/')
  const opener = page.locator('.participation-actions').getByRole('button', { name: 'Join as a member', exact: false })
  await opener.click()
  const dialog = page.getByRole('dialog', { name: 'Join as a member', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Email', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('link')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  await page.locator('.hero .actions a[href="/lab#submit-prototype"]').click()
  await expect(page.getByRole('heading', { name: 'Bring your product', exact: true })).toBeVisible()
  await expect(page.getByLabel('Product name', { exact: true })).toBeVisible()
})

test('mobile navigation and actions work in both languages without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/zh')
  await page.getByRole('button', { name: '菜单', exact: true }).click()
  const navigation = page.locator('#site-nav')
  await expect(navigation.getByRole('link')).toHaveText(['Super Session', 'Super Lab', 'Super Lens', '关于'])
  await expect(navigation.getByRole('button')).toHaveCount(0)
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await page.locator('.participation-actions').getByRole('button', { name: '加入社群', exact: false }).click()
  await expect(page.getByRole('dialog', { name: '加入社群', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: '菜单', exact: true })).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.hero .actions a')).toHaveText(['提交产品报名↗'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const actions = await page.locator('.participation-actions > .button').boundingBox()
  expect(actions && actions.y + actions.height).toBeLessThan(844)
  await page.getByRole('link', { name: 'English', exact: true }).click()
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await navigation.getByRole('link', { name: 'Super Session', exact: true }).click()
  await expect(page).toHaveURL(/\/sessions$/)
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveAttribute('aria-expanded', 'false')
})

test('brand artwork and original wordmarks load without stretching on desktop and mobile', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const path of ['/', '/sessions', '/lens', '/about', '/zh/lab', '/zh/lens']) {
      await page.goto(path)
      const images = page.locator('.logo img, .program-wordmark img, .brand-scene, .home-brand-art img')
      for (const image of await images.all()) {
        await expect(image).toBeVisible()
        await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
        const geometry = await image.evaluate((el: HTMLImageElement) => ({ width: el.clientWidth, height: el.clientHeight, naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight, fit: getComputedStyle(el).objectFit }))
        if (geometry.fit !== 'contain') expect(Math.abs(geometry.width / geometry.height - geometry.naturalWidth / geometry.naturalHeight)).toBeLessThan(.08)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  }
})
