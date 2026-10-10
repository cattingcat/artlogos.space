import { site } from '../content/site'
import { socialIconPaths } from '../content/socialIcons'
import './ContactMethods.css'

export default function ContactMethods() {
  return <ul className="contact-methods" aria-label="Contact the artist">
    <li><a className="contact-method" href={`mailto:${site.email}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
      <span><span className="contact-method-label">Email</span>{site.email}</span>
    </a></li>
    <li><a className="contact-method" href={site.telegram.url} target="_blank" rel="noopener noreferrer" aria-label={`Telegram: @${site.telegram.username} (opens in a new tab)`}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d={socialIconPaths.telegram} /></svg>
      <span><span className="contact-method-label">Telegram</span>@{site.telegram.username}</span>
    </a></li>
    <li><div className="contact-method">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d={socialIconPaths.discord} /></svg>
      <span><span className="contact-method-label">Discord</span>{site.discord}</span>
    </div></li>
  </ul>
}
