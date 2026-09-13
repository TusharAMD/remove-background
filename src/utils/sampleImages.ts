export interface SampleImage {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  url: string;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'sample-portrait',
    name: 'Portrait (Fine Hair)',
    category: 'Portrait',
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85'
  },
  {
    id: 'sample-sneaker',
    name: 'Product (Sneaker)',
    category: 'E-commerce',
    thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85'
  },
  {
    id: 'sample-dog',
    name: 'Pet (Fluffy Dog)',
    category: 'Animals',
    thumbnail: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&q=85'
  },
  {
    id: 'sample-car',
    name: 'Automobile (Sports Car)',
    category: 'Automotive',
    thumbnail: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80',
    url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85'
  }
];

export async function fetchSampleAsFile(sample: SampleImage): Promise<File> {
  const response = await fetch(sample.url, { mode: 'cors' });
  const blob = await response.blob();
  return new File([blob], `${sample.id}.jpg`, { type: blob.type || 'image/jpeg' });
}
