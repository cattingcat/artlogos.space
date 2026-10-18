import type { Artwork } from '../content/artworks'
import type { SocialPlatform } from '../content/socialIcons'
import { useI18n } from '../i18n/context'
import { SocialIcon } from './SocialLinks'
import './SocialIconLinks.css'

const platforms = ['artstation', 'youtube', 'instagram', 'x'] as const
const sourceIcons: Partial<Record<string, SocialPlatform>> = {
  DeviantArt: 'deviantart',
  'Saatchi Art': 'saatchiart',
}

export default function SocialIconLinks({ className = '', sources }: { className?: string; sources?: Artwork['sources'] }) {
  const { site, t } = useI18n()
  return <nav className={`social-icon-links ${className}`} aria-label={t('artistProfiles')}>
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
      {sources?.map(source => {
        const platform = sourceIcons[source.label]
        const label = t('viewOn', { source: source.label })
        return <li key={source.url}>
          <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${label} (${t('opensNewTab')})`} title={label}>
            {platform ? <SocialIcon platform={platform} /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M14 3h7v7M21 3 10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /></svg>}
          </a>
        </li>
      })}
    </ul>
  </nav>
}
