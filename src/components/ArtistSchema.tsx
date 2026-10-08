import { site } from '../content/site'
import type { Artwork } from '../content/artworks'
import { artworkPageDescription, artworkPageTitle, artworkUrl } from '../content/artwork-pages'

export default function ArtistSchema({ artwork }: { artwork?: Artwork }) {
  const artistId = `${site.url}#artist`
  const websiteId = `${site.url}#website`
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': artistId,
        name: site.artistName,
        alternateName: site.fullName,
        url: site.url,
        jobTitle: 'Artist',
        description: site.about.paragraphs[0],
        sameAs: site.socialLinks.map(link => link.url),
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: site.url,
        name: site.artistName,
        alternateName: site.name,
        publisher: { '@id': artistId },
        inLanguage: 'en',
      },
      ...(artwork ? [{
        '@type': 'WebPage',
        '@id': `${artworkUrl(artwork)}#page`,
        url: artworkUrl(artwork),
        name: artworkPageTitle(artwork),
        description: artworkPageDescription(artwork),
        mainEntity: { '@id': `${artworkUrl(artwork)}#artwork` },
        isPartOf: { '@id': websiteId },
      }, {
        '@type': 'VisualArtwork',
        '@id': `${artworkUrl(artwork)}#artwork`,
        url: artworkUrl(artwork),
        name: artwork.title,
        ...(artwork.description ? { description: artwork.description } : {}),
        creator: { '@id': artistId },
        artform: 'Painting',
        keywords: artwork.tags,
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
        '@id': `${site.url}#profile`,
        url: site.url,
        name: site.pageTitle,
        description: site.description,
        mainEntity: { '@id': artistId },
        isPartOf: { '@id': websiteId },
      }]),
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
