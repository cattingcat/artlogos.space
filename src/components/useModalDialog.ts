import { useLayoutEffect, type RefObject } from 'react'
import { acquireScrollLock } from './modalScrollLock'

type ModalEntry = { element: HTMLDialogElement; restoreTargets: HTMLElement[] }
const modalStack: ModalEntry[] = []
const focusableSelector = 'button, a[href], input, select, textarea, summary, [tabindex]'
const isVisible = (element: HTMLElement) => element.isConnected && element.getClientRects().length > 0

function focusableElements(dialog: HTMLDialogElement) {
  return [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter(element =>
    element.tabIndex >= 0 && !element.matches(':disabled, [inert], [aria-hidden="true"]') && isVisible(element),
  )
}

/** Native modality, nested scroll locking, keyboard containment and opener restoration. */
export function useModalDialog(ref: RefObject<HTMLDialogElement | null>) {
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const openerDialog = opener?.closest('dialog')
    const openerScroll = openerDialog ? { top: openerDialog.scrollTop, left: openerDialog.scrollLeft } : null
    const restoreTargets = [...new Set([...(opener ? [opener] : []), ...modalStack.flatMap(entry => entry.restoreTargets).reverse()])]
    const entry = { element, restoreTargets }
    const unlock = acquireScrollLock(document, window)
    modalStack.push(entry)

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || modalStack.at(-1) !== entry) return
      const controls = focusableElements(element)
      const first = controls[0]
      const last = controls.at(-1)
      if (!first) {
        event.preventDefault()
        element.focus({ preventScroll: true })
      } else if (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement))) {
        event.preventDefault()
        last?.focus({ preventScroll: true })
      } else if (!event.shiftKey && (document.activeElement === last || !element.contains(document.activeElement))) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
    }
    element.addEventListener('keydown', trapFocus)
    if (!element.open) element.showModal()

    return () => {
      const wasTop = modalStack.at(-1) === entry
      const index = modalStack.indexOf(entry)
      if (index >= 0) modalStack.splice(index, 1)
      element.removeEventListener('keydown', trapFocus)
      if (element.open) element.close()
      unlock()
      if (!wasTop) return
      const activeDialog = modalStack.at(-1)?.element
      const target = restoreTargets.find(candidate => isVisible(candidate) && (!activeDialog || activeDialog.contains(candidate)))
      if (target) target.focus({ preventScroll: true })
      else if (activeDialog) (focusableElements(activeDialog)[0] ?? activeDialog).focus({ preventScroll: true })
      if (openerDialog?.isConnected && openerDialog.open && openerScroll) {
        openerDialog.scrollTop = openerScroll.top
        openerDialog.scrollLeft = openerScroll.left
      }
    }
  }, [ref])
}
