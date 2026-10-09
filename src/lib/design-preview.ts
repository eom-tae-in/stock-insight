export const DESIGN_PREVIEW_PATH = '/design-preview/components'

export function isDesignPreviewPath(path: string): boolean {
  return (
    path === DESIGN_PREVIEW_PATH ||
    path === '/design-preview/shell' ||
    path === '/design-preview/custom-charts' ||
    path === '/design-preview/stock-edit' ||
    path === '/design-preview/stock-list' ||
    path === '/design-preview/stock-detail'
  )
}
