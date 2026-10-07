export type Artwork = {
  id: string;
  title: string;
  category: 'Figures' | 'Landscapes' | 'Still life';
  medium: string;
  price: number | null;
  status: 'sold' | 'available' | 'enquire';
  image: string;
  alternateImage?: string;
  artist: string;
  sourceUrl: string;
};

// Temporary third-party demonstration works. See public/artworks/SOURCES.md.
// Prices are the source artist's reference prices in GBP.
export const artworks: Artwork[] = [
  {
    "id": "nunzio-over-lasagne",
    "title": "Nunzio Over Lasagne",
    "category": "Figures",
    "medium": "Oil and pastel",
    "price": null,
    "status": "sold",
    "image": "/artworks/nunzio-over-lasagne.avif",
    "alternateImage": "/artworks/nunzio-over-lasagne-alternate.avif",
    "artist": "Sasha Mihajlovic",
    "sourceUrl": "https://www.sashamihajlovic.com/product-page/nunzio-over-lasagne"
  },
  {
    "id": "new-mirror-test-4",
    "title": "New Mirror Test Nº4 – The Final Cut",
    "category": "Figures",
    "medium": "Oil painting",
    "price": 400,
    "status": "available",
    "image": "/artworks/new-mirror-test-4.avif",
    "alternateImage": "/artworks/new-mirror-test-4-alternate.avif",
    "artist": "Sasha Mihajlovic",
    "sourceUrl": "https://www.sashamihajlovic.com/product-page/new-mirror-test-n%C2%BA4-the-final-cut"
  },
  {
    "id": "what-if-they-do",
    "title": "What If They Do?",
    "category": "Figures",
    "medium": "Oil painting",
    "price": null,
    "status": "sold",
    "image": "/artworks/what-if-they-do.avif",
    "alternateImage": "/artworks/what-if-they-do-alternate.avif",
    "artist": "Sasha Mihajlovic",
    "sourceUrl": "https://www.sashamihajlovic.com/product-page/what-if-they-do"
  },
  {
    "id": "painting-me-painting-you",
    "title": "Painting Me Painting You",
    "category": "Figures",
    "medium": "Oil painting",
    "price": null,
    "status": "sold",
    "image": "/artworks/painting-me-painting-you.avif",
    "alternateImage": "/artworks/painting-me-painting-you-alternate.avif",
    "artist": "Sasha Mihajlovic",
    "sourceUrl": "https://www.sashamihajlovic.com/product-page/painting-me-painting-you"
  },
  {
    "id": "blue-moon",
    "title": "Blue Moon",
    "category": "Figures",
    "medium": "Oil pastel",
    "price": null,
    "status": "sold",
    "image": "/artworks/blue-moon.avif",
    "alternateImage": "/artworks/blue-moon-alternate.avif",
    "artist": "Sasha Mihajlovic",
    "sourceUrl": "https://www.sashamihajlovic.com/product-page/blue-moon"
  },
  {
    "id": "the-colours-of-sicilia",
    "title": "The Colours of Sicilia",
    "category": "Figures",
    "medium": "Oil pastel",
    "price": 95,
    "status": "available",
    "image": "/artworks/the-colours-of-sicilia.avif",
    "alternateImage": "/artworks/the-colours-of-sicilia-alternate.avif",
    "artist": "Sasha Mihajlovic",
    "sourceUrl": "https://www.sashamihajlovic.com/product-page/the-colours-of-sicilia"
  },
  {
    "id": "amelia",
    "title": "Amelia",
    "category": "Figures",
    "medium": "Oil pastel",
    "price": null,
    "status": "sold",
    "image": "/artworks/amelia.avif",
    "alternateImage": "/artworks/amelia-alternate.avif",
    "artist": "Sasha Mihajlovic",
    "sourceUrl": "https://www.sashamihajlovic.com/product-page/amelia"
  },
  {
    "id": "study-in-yellow-2024",
    "title": "Study in Yellow 2024",
    "category": "Figures",
    "medium": "Oil painting",
    "price": 560,
    "status": "available",
    "image": "/artworks/study-in-yellow-2024.avif",
    "alternateImage": "/artworks/study-in-yellow-2024-alternate.avif",
    "artist": "Sasha Mihajlovic",
    "sourceUrl": "https://www.sashamihajlovic.com/product-page/study-in-yellow-2024"
  },
  {
    "id": "grandad",
    "title": "Grandad",
    "category": "Figures",
    "medium": "Oil painting",
    "price": null,
    "status": "sold",
    "image": "/artworks/grandad.avif",
    "alternateImage": "/artworks/grandad-alternate.avif",
    "artist": "Sasha Mihajlovic",
    "sourceUrl": "https://www.sashamihajlovic.com/product-page/grandad"
  },
  {
    "id": "study-in-ochre-and-cyan",
    "title": "Study in Ochre and Cyan",
    "category": "Figures",
    "medium": "Oil painting",
    "price": 600,
    "status": "available",
    "image": "/artworks/study-in-ochre-and-cyan.avif",
    "alternateImage": "/artworks/study-in-ochre-and-cyan-alternate.avif",
    "artist": "Sasha Mihajlovic",
    "sourceUrl": "https://www.sashamihajlovic.com/product-page/study-in-ochre-and-cyan"
  },
  {
    "id": "the-athlete-ii",
    "title": "The Athlete II",
    "category": "Figures",
    "medium": "Oil painting",
    "price": 500,
    "status": "available",
    "image": "/artworks/the-athlete-ii.avif",
    "alternateImage": "/artworks/the-athlete-ii-alternate.avif",
    "artist": "Sasha Mihajlovic",
    "sourceUrl": "https://www.sashamihajlovic.com/product-page/the-athlete-ii"
  },
  {
    "id": "obstacles-2024",
    "title": "Obstacles 2024",
    "category": "Figures",
    "medium": "Oil painting",
    "price": 560,
    "status": "available",
    "image": "/artworks/obstacles-2024.avif",
    "alternateImage": "/artworks/obstacles-2024-alternate.avif",
    "artist": "Sasha Mihajlovic",
    "sourceUrl": "https://www.sashamihajlovic.com/product-page/obstacles-2024"
  },
  {
    "id": "the-athlete",
    "title": "The Athlete",
    "category": "Figures",
    "medium": "Oil painting",
    "price": 130,
    "status": "available",
    "image": "/artworks/the-athlete.avif",
    "alternateImage": "/artworks/the-athlete-alternate.avif",
    "artist": "Sasha Mihajlovic",
    "sourceUrl": "https://www.sashamihajlovic.com/product-page/the-athlete"
  }
];
