import type { Page, Route } from '@playwright/test'

function jsonResponse(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  })
}

export function makeTrendsData(count = 65) {
  const start = Date.UTC(2024, 0, 7)

  return Array.from({ length: count }, (_, index) => ({
    date: new Date(start + index * 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    value: 20 + index,
    ma13Value: index >= 12 ? 20 + index / 2 : null,
    yoyValue: index >= 52 ? 5 : null,
  }))
}

export async function mockKeywordAnalysisApis(page: Page) {
  await page.route('**/api/keywords', async route => {
    const method = route.request().method()

    if (method === 'GET') {
      return jsonResponse(route, { success: true, data: [] })
    }

    if (method === 'POST') {
      return jsonResponse(route, {
        success: true,
        data: {
          id: 'e2e-keyword-search-id',
          keyword: 'AI',
          geo: 'GLOBAL',
          gprop: 'WEB',
        },
      })
    }

    return route.fallback()
  })

  await page.route('**/api/trends?**', async route => {
    return jsonResponse(route, {
      success: true,
      data: {
        keyword: 'AI',
        trendsData: makeTrendsData(),
      },
    })
  })
}

export async function mockStockSearchSuggestions(page: Page) {
  await page.route('**/api/stocks/search?**', async route => {
    return jsonResponse(route, {
      success: true,
      data: [
        {
          symbol: 'AAPL',
          longname: 'Apple Inc.',
        },
        {
          symbol: 'MSFT',
          longname: 'Microsoft Corporation',
        },
      ],
    })
  })
}
