import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
export const metadata: Metadata = { title: { default: 'Plainly — Medical language, made clear', template: '%s | Plainly' }, description: 'Turn confusing medical documents into plain-language explanations and thoughtful questions for your doctor.', generator: 'v0.app', openGraph: { title: 'Plainly — Medical language, made clear', description: 'Understand your medical documents with more confidence.', type: 'website' } }
export const viewport: Viewport = { colorScheme: 'light', themeColor: '#f5f9f8', userScalable: true }
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className="bg-background"><body className="antialiased">{children}{process.env.NODE_ENV==='production'&&<Analytics/>}</body></html>}
