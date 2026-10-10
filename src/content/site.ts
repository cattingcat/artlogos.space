import type { SocialLink } from '../components/SocialLinks'

// Contact destinations and optional email are managed here.
// Identity and editorial copy can be updated here without changing the gallery.
export const site = {
  name: 'Artlogos',
  copyrightYear: 2026,
  artistName: 'Alina Logos',
  fullName: 'Alina Pliushcheva',
  url: 'https://artlogos.space/',
  pageTitle: 'Alina Logos (Alina Pliushcheva) — Artist & Paintings',
  description: 'Explore original paintings by Alina Logos (Alina Pliushcheva): landscapes, portraits and figurative works in oil and egg tempera. View the portfolio and contact the artist.',
  subtitle: 'Paintings',
  collectionHeading: 'Paintings by Alina Pliushcheva',
  sidebarNote: 'One painting. Many perspectives.',
  email: 'alinalogosart@gmail.com',
  telegram: { username: 'alinalogos', url: 'https://t.me/alinalogos' },
  discord: '@alina_logos',
  socialLinks: [
    { name: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/alina_logos4/' },
    { name: 'DeviantArt', icon: 'deviantart', url: 'https://www.deviantart.com/alinaivy' },
    { name: 'Tumblr', icon: 'tumblr', url: 'https://www.tumblr.com/alina-logos' },
    { name: 'Pinterest', icon: 'pinterest', url: 'https://www.pinterest.com/Alina_Logos' },
    { name: 'YouTube', icon: 'youtube', url: 'https://www.youtube.com/@Alina_Logos' },
    { name: 'TikTok', icon: 'tiktok', url: 'https://www.tiktok.com/@logos_iv' },
    { name: 'ArtStation', icon: 'artstation', url: 'https://www.artstation.com/alina_logos' },
    { name: 'Bluesky', icon: 'bluesky', url: 'https://bsky.app/profile/alina-logos.bsky.social' },
    { name: 'Pixiv', icon: 'pixiv', url: 'https://www.pixiv.net/en/users/106597061' },
    { name: 'Threads', icon: 'threads', url: 'https://www.threads.com/@alina_logos4' },
    { name: 'Cara', icon: 'cara', url: 'https://cara.app/alina-logos' },
    { name: 'Saatchi Art', icon: 'saatchiart', url: 'https://www.saatchiart.com/alinalogos' },
  ] satisfies SocialLink[],
  about: {
    eyebrow: 'About the artist · Alina Logos',
    title: 'Alina Pliushcheva',
    image: '/portfolio/studio/portrait.webp',
    imageAlt: 'In the gallery',
    caption: 'In the gallery',
    paragraphs: [
      'Alina Pliushcheva, also known as Alina Logos, paints in oil and egg tempera. Her work brings together landscapes, city scenes, portraits, figures and familiar interiors.',
      'Explore her paintings, read the stories behind them and look closer through details and different views. For questions about the work, contact Alina through her artist profiles below.',
    ],
  },
  studio: {
    eyebrow: 'Studio',
    title: 'A place for painting.',
    image: '/portfolio/studio/workshop.webp',
    imageAlt: 'An easel and painting workspace beside a window',
    paragraphs: [
      'A window, an easel and the space around a painting. A glimpse into the workspace behind the collection.',
    ],
  },
  contact: {
    eyebrow: 'A conversation starts here',
    title: 'Get in touch.',
    description: 'For questions about the paintings, or to follow new work and life in the studio.',
  },
  footerNote: 'Paintings by Alina Logos · Alina Pliushcheva.',
}
