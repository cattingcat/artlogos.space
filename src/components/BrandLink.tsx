import type { MouseEventHandler } from 'react'
import { useI18n } from '../i18n/context'
import { homePath } from '../i18n/locale'

export default function BrandLink({ href, onClick }: { href?: string; onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  const { locale, site, t } = useI18n()
  return <a href={href ?? homePath(locale)} className="wordmark" aria-label={t('home', { name: site.name })} onClick={onClick}>
    <img className="wordmark-logo" src="/brand/artlogos-43ab3d631c8c.png" alt="" width="1600" height="1541" />
  </a>
}
