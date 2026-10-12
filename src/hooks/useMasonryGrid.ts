import { useLayoutEffect, useRef } from 'react'

/** Keep CSS Grid's sparse, row-wise DOM order while sizing tracks to full cards. */
export function useMasonryGrid(layoutKey: string) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const grid = ref.current
    // Retain the normal, readable grid in prerendered HTML and older browsers.
    if (!grid || typeof ResizeObserver === 'undefined') return

    const cards = Array.from(grid.children) as HTMLElement[]
    let frame = 0
    let active = true
    let width = grid.getBoundingClientRect().width

    const measure = () => {
      frame = 0
      const style = getComputedStyle(grid)
      const row = Number.parseFloat(style.getPropertyValue('--artwork-row-size'))
      const gap = Number.parseFloat(style.getPropertyValue('--artwork-gap'))
      if (!(row > 0) || !(gap >= 0)) return

      // Read every natural border-box height before writing any spans. The card
      // is start-aligned, so its grid area never stretches the measured content.
      const spans = cards.map(card => Math.ceil((card.getBoundingClientRect().height + gap) / row))
      cards.forEach((card, index) => {
        const span = `span ${Math.max(1, spans[index])}`
        if (card.style.gridRowEnd !== span) card.style.gridRowEnd = span
      })
      grid.dataset.masonry = 'true'
    }
    const schedule = () => {
      if (active && !frame) frame = requestAnimationFrame(measure)
    }
    const observer = new ResizeObserver(entries => {
      let changed = false
      for (const entry of entries) {
        // A span changes grid height; only grid WIDTH should trigger another
        // measurement. Cards themselves also report fonts and text wrapping.
        if (entry.target !== grid) changed = true
        else if (entry.contentRect.width !== width) {
          width = entry.contentRect.width
          changed = true
        }
      }
      if (changed) schedule()
    })

    observer.observe(grid)
    cards.forEach(card => observer.observe(card, { box: 'border-box' }))
    grid.addEventListener('load', schedule, true)
    grid.addEventListener('error', schedule, true)
    window.addEventListener('resize', schedule)
    void document.fonts.ready.then(schedule)
    // Also runs before paint when filtering, sorting or changing language.
    measure()

    return () => {
      active = false
      observer.disconnect()
      cancelAnimationFrame(frame)
      grid.removeEventListener('load', schedule, true)
      grid.removeEventListener('error', schedule, true)
      window.removeEventListener('resize', schedule)
      delete grid.dataset.masonry
      cards.forEach(card => card.style.removeProperty('grid-row-end'))
    }
  }, [layoutKey])

  return ref
}
