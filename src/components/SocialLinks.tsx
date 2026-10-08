import { socialIconPaths, type SocialPlatform } from '../content/socialIcons'
import './SocialLinks.css'

export type SocialLink = {
  name: string
  url: string
  icon: SocialPlatform
}

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  // Original art symbols for platforms outside the Simple Icons collection.
  if (platform === 'cara' || platform === 'saatchiart') {
    return <svg className="social-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {platform === 'cara'
        ? <><path d="m13 13 7-9c.8-1 .8-1.7.3-2.2-.5-.5-1.2-.5-2.2.3l-9 7Z" /><path d="M10 11c-2.8-.8-4.9.7-4.9 3.8 0 2.1-1.2 3.7-3.1 4.5 3.9 2.5 9.4.9 10-3.2.3-1.8-.3-3.7-2-5.1Z" /></>
        : <><rect x="3" y="3" width="18" height="18" rx="1" /><path d="m3 17 6-6 4 4 3-3 5 5" /><circle cx="15.5" cy="8.5" r="1.5" /></>}
    </svg>
  }

  return <svg className="social-link-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d={socialIconPaths[platform]} /></svg>
}

export default function SocialLinks({ links }: { links: readonly SocialLink[] }) {
  return <nav className="social-links" aria-label="Find the artist online">
    <ul>
      {links.map(link => <li key={link.icon}>
        <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`${link.name} (opens in a new tab)`}>
          <SocialIcon platform={link.icon} />
          <span>{link.name}</span>
          <span className="social-link-arrow" aria-hidden="true">↗</span>
        </a>
      </li>)}
    </ul>
  </nav>
}
