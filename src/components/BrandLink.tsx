import type { MouseEventHandler } from 'react'
import { site } from '../content/site'

export default function BrandLink({ href = '/', onClick }: { href?: string; onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  return <a href={href} className="wordmark" aria-label={`${site.name} home`} onClick={onClick}>
    <img className="wordmark-symbol" src="/brand/alina-logos-6a3f2f5476e4.png" alt="" width="256" height="256" />
    <span className="wordmark-text"><span className="wordmark-name">{site.name}</span><span className="wordmark-caption">{site.subtitle}</span></span>
  </a>
}
