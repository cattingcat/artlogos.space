import { site } from '../content/site'

export default function ArtistSchema() {
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
      {
        '@type': 'ProfilePage',
        '@id': `${site.url}#profile`,
        url: site.url,
        name: site.pageTitle,
        description: site.description,
        mainEntity: { '@id': artistId },
        isPartOf: { '@id': websiteId },
      },
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
