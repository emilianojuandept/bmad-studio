import { test, expect } from '@playwright/test'

const pages = [
  { name: 'overview', path: '/' },
  { name: 'agents', path: '/agents' },
  { name: 'teams', path: '/teams' },
  { name: 'skills', path: '/skills' },
  { name: 'workflows', path: '/workflows' },
  { name: 'modules', path: '/modules' },
  { name: 'files', path: '/files' },
  { name: 'outputs', path: '/outputs' },
  { name: 'connections', path: '/connections' },
  { name: 'settings', path: '/settings' },
] as const

for (const { name, path } of pages) {
  test(`${name} page visual regression`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')

    // The app uses a fixed h-screen layout with internal overflow-y-auto scrolling.
    // Measure the actual content height and resize the viewport so everything is visible.
    const contentHeight = await page.evaluate(() => {
      const main = document.querySelector('main')
      return main ? main.scrollHeight : document.documentElement.scrollHeight
    })
    const viewportSize = page.viewportSize()!
    await page.setViewportSize({ width: viewportSize.width, height: contentHeight })

    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true })
  })
}
