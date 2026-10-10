import type { MouseEventHandler } from 'react'
import { site } from '../content/site'

export default function BrandLink({ href = '/', onClick }: { href?: string; onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  return <a href={href} className="wordmark" aria-label={`${site.name} home`} onClick={onClick}>
    <img className="wordmark-logo" src="/brand/artlogos-6adb20770b50.png" alt="" width="2677" height="1691" />
  </a>
}
