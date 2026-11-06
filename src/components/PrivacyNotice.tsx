import { useId, useRef, useState } from 'react'
import { useI18n } from '../i18n/context'
import { useModalDialog } from './useModalDialog'
import './PrivacyNotice.css'

function PrivacyDialog({ onClose }: { onClose: () => void }) {
  const { t, site } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useModalDialog(dialog)

  return (
    <dialog
      ref={dialog}
      className="privacy-dialog"
      aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose() }}
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className="privacy-dialog-inner">
        <button className="privacy-close" type="button" onClick={onClose} aria-label={t('close')} autoFocus>×</button>
        <h2 id={titleId}>{t('privacyTitle')}</h2>
        <p>{t('privacyAnalytics')}</p>
        <p>{t('privacyGoogle')} <a href="https://business.safety.google/privacy/" target="_blank" rel="noopener noreferrer">{t('privacyGoogleLink')} ↗</a></p>
        <p>{t('privacyPreferences')}</p>
        <p>{t('privacyInfrastructure')}</p>
        <p>{t('privacyContacts')}</p>
        <p>{t('privacyControls')}</p>
        <p>{t('privacyQuestions')} <a href={`mailto:${site.email}`}>{site.email}</a></p>
      </div>
    </dialog>
  )
}

export default function PrivacyNotice() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <div className="privacy-notice page-width">
      <button type="button" className="privacy-trigger" aria-haspopup="dialog" onClick={() => setOpen(true)}>{t('privacyButton')}</button>
      {open && <PrivacyDialog onClose={() => setOpen(false)} />}
    </div>
  )
}
