'use client'

import { useEffect } from 'react'

export function ReactDevTools() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'development' ||
      process.env.NEXT_PUBLIC_DISABLE_REACT_DEVTOOLS === 'true'
    )
      return
    void Promise.all([import('react-scan'), import('react-grab')]).then(
      ([scan, grab]) => {
        scan.scan({ enabled: true, showToolbar: false })
        grab.init()
      }
    )
  }, [])
  return null
}
