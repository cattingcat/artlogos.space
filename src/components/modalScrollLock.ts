type SavedStyle = { property: string; value: string; priority: string }
type ScrollLock = { count: number; restore: () => void }
const locks = new WeakMap<Document, ScrollLock>()

function preserve(style: CSSStyleDeclaration, properties: string[]): SavedStyle[] {
  return properties.map(property => ({ property, value: style.getPropertyValue(property), priority: style.getPropertyPriority(property) }))
}

function restore(style: CSSStyleDeclaration, saved: SavedStyle[]) {
  for (const { property, value, priority } of saved) {
    if (value) style.setProperty(property, value, priority)
    else style.removeProperty(property)
  }
}

/** A child modal must not unlock the document while its parent is still open. */
export function acquireScrollLock(document: Document, window: Window) {
  let lock = locks.get(document)
  if (!lock) {
    const body = document.body
    const root = document.documentElement
    const x = window.scrollX
    const y = window.scrollY
    const scrollbar = Math.max(0, window.innerWidth - root.clientWidth)
    const padding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0
    const bodyStyles = preserve(body.style, ['position', 'top', 'left', 'right', 'width', 'overflow', 'padding-right', 'box-sizing'])
    const rootStyles = preserve(root.style, ['overflow', 'scroll-behavior'])
    root.style.setProperty('overflow', 'hidden')
    root.style.setProperty('scroll-behavior', 'auto')
    body.style.setProperty('position', 'fixed')
    body.style.setProperty('top', `${-y}px`)
    body.style.setProperty('left', `${-x}px`)
    body.style.setProperty('right', '0')
    body.style.setProperty('width', '100%')
    body.style.setProperty('overflow', 'hidden')
    body.style.setProperty('box-sizing', 'border-box')
    body.style.setProperty('padding-right', `${padding + scrollbar}px`)
    lock = {
      count: 0,
      restore: () => {
        restore(body.style, bodyStyles)
        // Keep instant scrolling until the original position has been restored.
        const overflow = rootStyles.filter(style => style.property === 'overflow')
        restore(root.style, overflow)
        window.scrollTo({ left: x, top: y, behavior: 'instant' })
        restore(root.style, rootStyles.filter(style => style.property === 'scroll-behavior'))
      },
    }
    locks.set(document, lock)
  }
  lock.count += 1
  let released = false
  return () => {
    if (released) return
    released = true
    lock.count -= 1
    if (lock.count === 0) {
      locks.delete(document)
      lock.restore()
    }
  }
}
