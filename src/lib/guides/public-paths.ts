// Only these complete pages bypass authentication; children and APIs remain protected.
export function isPublicGuidePath(path: string): boolean {
  return ['/explore', '/guide', '/renewal'].includes(path)
}
