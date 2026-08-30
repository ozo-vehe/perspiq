import type { MetadataRoute } from 'next'
export default function sitemap(): MetadataRoute.Sitemap { return ['', '/translate', '/history', '/about'].map(path => ({ url: `https://claritymed.vercel.app${path}`, lastModified: new Date() })) }
