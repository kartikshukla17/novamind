/**
 * Extract Open Graph / meta tags from a URL (no OpenAI).
 * Used when saving links to get title, description, image, site name.
 */

export async function extractLinkMetadata(url: string): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CogniKeep/1.0)',
      },
    })
    const html = await response.text()

    const getMetaContent = (html: string, property: string): string | null => {
      const patterns = [
        new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i'),
      ]

      for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match) return match[1]
      }
      return null
    }

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = getMetaContent(html, 'og:title') || titleMatch?.[1] || null

    return {
      title,
      description: getMetaContent(html, 'og:description') || getMetaContent(html, 'description'),
      image: getMetaContent(html, 'og:image'),
      siteName: getMetaContent(html, 'og:site_name'),
    }
  } catch (error) {
    console.error('Failed to extract link metadata:', error)
    return {}
  }
}
