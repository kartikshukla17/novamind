/**
 * Re-export link metadata only. Categorization is handled by:
 * - Browser: lib/ai/local-ai.ts (Transformers.js)
 * - Server:  lib/ai/server-categorize.ts (keyword-based, no API key)
 */

export { extractLinkMetadata } from '@/lib/utils/link-metadata'
