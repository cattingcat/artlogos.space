import type { MouseEventHandler } from 'react'
import { useI18n } from '../i18n/context'
import { homePath } from '../i18n/locale'

export default function BrandLink({ href, onClick }: { href?: string; onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  const { locale, site, t } = useI18n()
  return <a href={href ?? homePath(locale)} className="wordmark" aria-label={t('home', { name: site.name })} onClick={onClick}>
    <img className="wordmark-logo" src="/brand/artlogos-6adb20770b50.png" alt="" width="2677" height="1691" />
  </a>
}
