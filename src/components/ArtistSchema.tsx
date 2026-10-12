import { useI18n } from '../i18n/context'
import { homePath, locales } from '../i18n/locale'
import type { Artwork } from '../content/artworks'
import { site as canonicalSite } from '../content/site'
import { artworkPageDescription, artworkPageTitle, artworkUrl } from '../content/artwork-pages'

export default function ArtistSchema({ artwork }: { artwork?: Artwork }) {
  const { locale, site, t, tag } = useI18n()
  const localizedUrl = new URL(homePath(locale), site.url).href
  const artistId = `${site.url}#artist`
  const websiteId = `${site.url}#website`
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': artistId,
        name: site.artistName,
        alternateName: locale === 'ru' ? [site.fullName, canonicalSite.fullName] : site.fullName,
        url: site.url,
        jobTitle: t('artistJob'),
        description: site.about.paragraphs[0],
        email: site.email,
        sameAs: [...site.socialLinks.map(link => link.url), site.telegram.url],
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: site.url,
        name: site.artistName,
        alternateName: site.name,
        publisher: { '@id': artistId },
        inLanguage: locales,
      },
      ...(artwork ? [{
        '@type': 'WebPage',
        inLanguage: locale,
        '@id': `${artworkUrl(artwork, locale)}#page`,
        url: artworkUrl(artwork, locale),
        name: artworkPageTitle(artwork, locale),
        description: artworkPageDescription(artwork, locale),
        mainEntity: { '@id': `${artworkUrl(artwork, locale)}#artwork` },
        isPartOf: { '@id': websiteId },
      }, {
        '@type': 'VisualArtwork',
        inLanguage: locale,
        '@id': `${artworkUrl(artwork, locale)}#artwork`,
        url: artworkUrl(artwork, locale),
        name: artwork.title,
        ...(artwork.description ? { description: artwork.description } : {}),
        creator: { '@id': artistId },
        artform: t('paintingArtform'),
        keywords: artwork.tags.map(tag),
        image: artwork.images.map(image => ({
          '@type': 'ImageObject',
          contentUrl: new URL(image.src, site.url).href,
          thumbnailUrl: new URL(image.thumbnail, site.url).href,
          caption: image.alt,
          width: image.width,
          height: image.height,
        })),
        ...(artwork.sources?.length ? { sameAs: artwork.sources.map(source => source.url) } : {}),
      }] : [{
        '@type': 'ProfilePage',
        inLanguage: locale,
        '@id': `${localizedUrl}#profile`,
        url: localizedUrl,
        name: site.pageTitle,
        description: site.description,
        mainEntity: { '@id': artistId },
        isPartOf: { '@id': websiteId },
      }]),
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
