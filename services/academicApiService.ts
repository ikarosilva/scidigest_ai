
import { Article, FeedSourceType } from '../types';

export const academicApiService = {
  /**
   * Extracts a DOI or arXiv ID from a string.
   */
  extractIdentifier(input: string): { type: 'doi' | 'arxiv' | 'url'; id: string } {
    const doiRegex = /10.\d{4,9}\/[-._;()/:A-Z0-9]+/i;
    const arxivRegex = /(\d{4}\.\d{4,5}|[a-z\-]+\/\d{7})/i;

    const doiMatch = input.match(doiRegex);
    if (doiMatch) return { type: 'doi', id: doiMatch[0] };

    if (input.includes('arxiv.org')) {
      const arxivMatch = input.match(arxivRegex);
      if (arxivMatch) return { type: 'arxiv', id: arxivMatch[0] };
    }

    return { type: 'url', id: input };
  },

  /**
   * Fetches metadata directly from Crossref (for DOIs)
   */
  async fetchFromCrossref(doi: string): Promise<Partial<Article> | null> {
    try {
      const response = await fetch(`https://api.crossref.org/works/${doi}`);
      if (!response.ok) return null;
      const data = await response.json();
      const item = data.message;

      return {
        title: item.title?.[0] || 'Untitled DOI Publication',
        authors: (item.author || []).map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()),
        abstract: item.abstract || '',
        year: item.issued?.['date-parts']?.[0]?.[0]?.toString() || new Date().getFullYear().toString(),
        source: FeedSourceType.MANUAL,
        pdfUrl: item.resource?.primary?.URL || `https://doi.org/${doi}`,
        userReviews: {
          sentiment: 'Unknown',
          summary: 'Directly ingested via Crossref API.',
          citationCount: item['is-referenced-by-count'] || 0
        }
      };
    } catch (e) {
      console.error("Crossref Fetch Error:", e);
      return null;
    }
  },

  /**
   * Fetches metadata directly from arXiv API
   */
  async fetchFromArxiv(id: string): Promise<Partial<Article> | null> {
    try {
      const response = await fetch(`https://export.arxiv.org/api/query?id_list=${id}`);
      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const entry = xmlDoc.getElementsByTagName("entry")[0];

      if (!entry) return null;

      const title = entry.getElementsByTagName("title")[0]?.textContent?.trim() || "";
      const summary = entry.getElementsByTagName("summary")[0]?.textContent?.trim() || "";
      const year = entry.getElementsByTagName("published")[0]?.textContent?.substring(0, 4) || "";
      const authors = Array.from(entry.getElementsByTagName("name")).map(node => node.textContent || "");
      const pdfUrl = `https://arxiv.org/pdf/${id}.pdf`;

      return {
        title: title.replace(/\n/g, ' '),
        authors,
        abstract: summary.replace(/\n/g, ' '),
        year,
        source: FeedSourceType.ARXIV,
        pdfUrl,
        userReviews: {
          sentiment: 'Unknown',
          summary: 'Directly ingested via arXiv API.',
          citationCount: 0
        }
      };
    } catch (e) {
      console.error("arXiv Fetch Error:", e);
      return null;
    }
  },

  /**
   * Searches for trending papers using the Semantic Scholar API.
   * This replaces the need for Gemini's search tool for core academic metadata.
   */
  async searchScholar(topics: string[]): Promise<any[]> {
    try {
      const query = topics.join(' ');
      if (!query) return [];

      const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=10&fields=title,authors,abstract,year,citationCount,venue,externalIds`);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      const results = (data.data || []).map((paper: any) => ({
        title: paper.title,
        authors: (paper.authors || []).map((a: any) => a.name),
        snippet: paper.abstract || 'No abstract available.',
        year: paper.year?.toString() || '2024',
        citationCount: paper.citationCount || 0,
        heatScore: Math.min(100, (paper.citationCount || 0) / 2),
        scholarUrl: `https://www.semanticscholar.org/paper/${paper.paperId}`,
        source: paper.venue || 'Academic Repository',
        pdfUrl: paper.externalIds?.ArXiv ? `https://arxiv.org/pdf/${paper.externalIds.ArXiv}.pdf` : null
      }));

      return results;
    } catch (e) {
      console.error("Scholar Search Error:", e);
      return [];
    }
  }
};
