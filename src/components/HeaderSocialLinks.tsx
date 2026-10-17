import { useI18n } from '../i18n/context'
import { SocialIcon } from './SocialLinks'
import './HeaderSocialLinks.css'

const platforms = ['artstation', 'youtube', 'instagram', 'x'] as const

export default function HeaderSocialLinks() {
  const { site, t } = useI18n()
  return <nav className="header-social-links" aria-label={t('contactArtist')}>
    <ul>
      {platforms.map(platform => {
        const link = site.socialLinks.find(link => link.icon === platform)
        return link && <li key={platform}>
          <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`${link.name} (${t('opensNewTab')})`} title={link.name}>
            <SocialIcon platform={platform} />
          </a>
        </li>
      })}
      <li><a href={`mailto:${site.email}`} aria-label={`${t('email')}: ${site.email}`} title={`${t('email')}: ${site.email}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
      </a></li>
    </ul>
  </nav>
}
