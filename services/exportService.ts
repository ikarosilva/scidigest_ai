
import { Article } from '../types';

export const exportService = {
  /**
   * Generates a BibTeX string from a list of articles.
   * Standard format for Zotero, Mendeley, and LaTeX.
   */
  generateBibTeX: (articles: Article[]): string => {
    return articles.map(a => {
      const firstAuthor = a.authors[0] || 'Unknown';
      const authorParts = firstAuthor.split(' ');
      const authorLastName = (authorParts[authorParts.length - 1] || 'unknown').toLowerCase();
      const year = a.date.split('-')[0] || '0000';
      
      // Use new RegExp to avoid literal regex parser issues
      const nonAlphaRegex = new RegExp('[^a-z]', 'g');
      const firstWord = a.title.split(' ')[0].toLowerCase().replace(nonAlphaRegex, '');
      const citeKey = `${authorLastName}${year}${firstWord}`;
      
      const cleanAbstract = a.abstract.split('\n').join(' ');
      
      return `@article{${citeKey},
  title = {${a.title}},
  author = {${a.authors.join(' and ')}},
  year = {${year}},
  journal = {${a.source}},
  abstract = {${cleanAbstract}},
  note = {Rating: ${a.rating}/10. ${a.notes}}
}\n`;
    }).join('\n');
  },

  /**
   * Downloads a text string as a file.
   */
  downloadFile: (content: string, fileName: string, contentType: string) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }
};
