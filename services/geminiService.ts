
import { GoogleGenAI, Type } from "@google/genai";
import { Article, Book, UserReviews, Sentiment, FeedSourceType, AIConfig, SocialProfiles } from "../types";

// Always initialize GoogleGenAI with a named parameter using process.env.API_KEY directly
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  /**
   * Recommends articles based on user's past ratings and AI config
   */
  async recommendArticles(ratedArticles: Article[], books: Book[], candidates: any[], aiConfig: AIConfig) {
    const ai = getAI();
    
    let biasInstruction = "";
    switch(aiConfig.recommendationBias) {
      case 'conservative':
        biasInstruction = "Strictly prioritize candidates that are very similar in topic and style to the user's highest rated articles. Avoid novel or experimental topics.";
        break;
      case 'experimental':
        biasInstruction = "Look for novel, breakthrough, or diverse topics that the user hasn't explored much yet, but that intersect with their general research interests. Favor high-uncertainty but high-potential-interest candidates ('Exploratory' mode).";
        break;
      case 'balanced':
      default:
        biasInstruction = "Balance similarity to past high-rated content with occasional novel topics that expand the user's horizons slightly.";
        break;
    }

    const prompt = `
      As a world-class research assistant, your task is to rank the following candidate papers based on the user's historical preferences.
      
      Recommendation Bias: ${biasInstruction}

      User's High-Rated Articles (10/10):
      ${ratedArticles.filter(a => a.rating >= 8).map(a => `- ${a.title} (${a.tags.join(', ')})`).join('\n')}
      
      User's Reading List (Books):
      ${books.map(b => `- ${b.title} by ${b.author}`).join('\n')}

      Candidate Papers to Rank:
      ${candidates.map((c, i) => `${i}. Title: ${c.title}, Year: ${c.year}, Abstract Snippet: ${c.snippet}`).join('\n')}

      Return a JSON array of indices representing the most relevant candidates, sorted by predicted interest.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Gemini Recommendation Error:", error);
      return candidates.map((_, i) => i);
    }
  },

  async discoverInterestsFromProfiles(profiles: SocialProfiles): Promise<string[]> {
    const ai = getAI();
    
    const profileContext = [
      profiles.name ? `- Full Name: ${profiles.name}` : '',
      profiles.medium ? `- Medium: ${profiles.medium}` : '',
      profiles.linkedin ? `- LinkedIn: ${profiles.linkedin}` : '',
      profiles.googleScholar ? `- Google Scholar: ${profiles.googleScholar}` : '',
      profiles.usePublicWebSearch ? '- Option Enabled: "User Public Web Search" (Broadly search the web for this name)' : ''
    ].filter(Boolean).join('\n');

    const prompt = `You are a researcher's assistant. Discover primary research interests and academic focus based on the provided context.
    
    User context:
    ${profileContext}
    
    INSTRUCTIONS:
    1. If a Full Name is provided and "Public Web Search" is enabled, perform a search for that individual's publications and topics.
    2. If a URL (like LinkedIn or Medium) is restricted or difficult to parse directly, extract the likely person from the URL and search for their work on Scholar or ResearchGate.
    3. Return a JSON array of technical research topics.
    4. Provide at most 15 specific, high-quality strings. Exclude generic terms like 'Research' or 'Science'.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Discover Interests Error:", error);
      return [];
    }
  },

  async searchAmazonBooks(topics: string[]): Promise<Partial<Book>[]> {
    const ai = getAI();
    const prompt = `Find the 10 most relevant, high-rated, and recently published scientific or technical books on Amazon.com for the following topics: ${topics.join(', ')}.
    
    Instructions:
    1. Search Amazon for technical monographs, textbooks, and professional guides.
    2. Exclude non-scientific pop-science unless highly technical.
    3. Return a JSON array of objects with: title, author, rating (out of 5), price, amazonUrl, and a 1-sentence description.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                author: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                price: { type: Type.STRING },
                amazonUrl: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "author", "amazonUrl"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Amazon Search Error:", error);
      return [];
    }
  },

  async fetchScholarArticles(profiles: SocialProfiles): Promise<Partial<Article>[]> {
    const ai = getAI();
    const prompt = `USE GOOGLE SEARCH to find the official Google Scholar profile and full publication record for the researcher: "${profiles.name}". 
    
    If a Google Scholar URL is provided (${profiles.googleScholar || 'none'}), prioritize it.
    
    TASKS:
    1. Locate their profile.
    2. Extract a list of their published research papers (up to 30 most recent or significant).
    3. For each paper, extract the following exactly:
       - title: Full title of the paper.
       - authors: Array of all contributing authors.
       - abstract: A 2-3 sentence summary/abstract.
       - year: The 4-digit publication year (as a string).
       - citationCount: Current number of citations (integer).
       - scholarUrl: Direct link to the paper on Google Scholar.
       - tags: 2-3 technical keywords describing the field.

    Return the result ONLY as a JSON array of objects. If no papers are found, return an empty array [].`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                authors: { type: Type.ARRAY, items: { type: Type.STRING } },
                abstract: { type: Type.STRING },
                year: { type: Type.STRING },
                citationCount: { type: Type.INTEGER },
                scholarUrl: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["title", "authors", "year"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Fetch Scholar Articles Error:", error);
      return [];
    }
  },

  async discoverAuthorNetwork(profiles: SocialProfiles) {
    const ai = getAI();
    const prompt = `Research the publication history and co-author network of ${profiles.name} using their Google Scholar profile (${profiles.googleScholar || 'Search by name'}).
    
    TASKS:
    1. Find their top 15 most significant papers.
    2. Identify their primary co-authors.
    3. Explore co-authors of those co-authors (2 levels deep).
    4. TO KEEP IT READABLE: Prioritize the top 3-5 most frequent or high-impact collaborators at each level.
    5. IDENTIFY CLUSTERS: Group papers and authors into "Topic Clusters" (e.g., "Deep Learning", "Clinical Medicine").
    
    Return a JSON object with:
    - nodes: Array of { id, name, type ('author' or 'paper'), cluster (string), level (0, 1, or 2) }
    - links: Array of { source, target, type ('authored' or 'collaborated') }
    - clusters: Array of { name, color } (Color should be a hex code suitable for dark mode).`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    type: { type: Type.STRING },
                    cluster: { type: Type.STRING },
                    level: { type: Type.INTEGER }
                  },
                  required: ["id", "name", "type", "cluster"]
                }
              },
              links: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    source: { type: Type.STRING },
                    target: { type: Type.STRING },
                    type: { type: Type.STRING }
                  },
                  required: ["source", "target"]
                }
              },
              clusters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    color: { type: Type.STRING }
                  },
                  required: ["name", "color"]
                }
              }
            },
            required: ["nodes", "links", "clusters"]
          }
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("Discover Author Network Error:", error);
      return null;
    }
  },

  async discoverReferences(article: Article): Promise<string[]> {
    const ai = getAI();
    const prompt = `Identify the top 5 most important papers or works cited by the article: "${article.title}" by ${article.authors.join(', ')}.
    Search for the bibliography or reference list of this specific paper.
    Return a JSON array of strings, where each string is a "Title, Year" of a cited paper.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Discover References Error:", error);
      return [];
    }
  },

  async summarizeArticle(title: string, abstract: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize this scientific article in 3 bullet points for a senior researcher: \nTitle: ${title}\nAbstract: ${abstract}`,
    });
    return response.text;
  },

  /**
   * Searches the web for an article and performs sentiment analysis plus citation metrics retrieval.
   */
  async analyzeSentiment(article: Article): Promise<UserReviews> {
    const ai = getAI();
    const prompt = `Research the scientific community's reception and impact of the article: "${article.title}" by ${article.authors.join(', ')}.
    Search for:
    1. Online discussions and academic blogs.
    2. Google Scholar citation count (approximate "cited by").
    3. Sentiment of the general user/researcher base.
    
    Return JSON with sentiment (Positive/Neutral/Negative), a summary, the citation count as an integer, and a Google Scholar URL if found.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sentiment: { type: Type.STRING },
              summary: { type: Type.STRING },
              citationCount: { type: Type.INTEGER },
              citedByUrl: { type: Type.STRING }
            },
            required: ["sentiment", "summary"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      return {
        sentiment: result.sentiment as Sentiment || 'Unknown',
        summary: result.summary || 'Sentiment analysis failed.',
        citationCount: result.citationCount,
        citedByUrl: result.citedByUrl,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
    } catch (error) {
      console.error("Sentiment Analysis Error:", error);
      return { sentiment: 'Unknown', summary: 'Error performing live sentiment research.', lastUpdated: new Date().toISOString().split('T')[0] };
    }
  },

  /**
   * Fetches trending research based on topics and time scale.
   */
  async getTrendingResearch(topics: string[], timeScale: string): Promise<any[]> {
    const ai = getAI();
    const prompt = `Find the most trending and discussed scientific research papers from the last ${timeScale} in the following fields: ${topics.join(', ')}.
    Look for:
    - High citation velocity.
    - Significant social media/academic blog buzz.
    - Breakthrough results.
    
    Return a JSON array of objects with: title, authors (array), year, source, citationCount, snippet, heatScore (0-100), and scholarUrl.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                authors: { type: Type.ARRAY, items: { type: Type.STRING } },
                year: { type: Type.STRING },
                source: { type: Type.STRING },
                citationCount: { type: Type.INTEGER },
                snippet: { type: Type.STRING },
                heatScore: { type: Type.INTEGER },
                scholarUrl: { type: Type.STRING }
              },
              required: ["title", "authors", "year", "heatScore"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Trending Research Error:", error);
      return [];
    }
  },

  /**
   * Processes raw book data, filtering for scientific relevance based on provided topics.
   */
  async filterBooks(rawJson: any[], topics: string[]): Promise<Book[]> {
    const ai = getAI();

    const bookSummaries = rawJson
      .filter(item => item.book)
      .map(item => ({ title: item.book, rating: item.rating }))
      .slice(0, 150);

    const prompt = `
      You are a specialized librarian. Filter the following list of books.
      Rules:
      1. Remove all fiction (novels, plays, short stories).
      2. Remove all non-fiction that is NOT related to these specific research interests: ${topics.join(', ')}.
      3. For the remaining scientific/technical books, format them as a JSON array.
      
      Books to process:
      ${JSON.stringify(bookSummaries)}
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                rating: { type: Type.NUMBER }
              },
              required: ["title", "rating"]
            }
          }
        }
      });

      const filtered = JSON.parse(response.text || '[]');
      return filtered.map((b: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        title: b.title,
        author: 'Imported',
        rating: b.rating || 0,
        dateAdded: new Date().toISOString()
      }));
    } catch (error) {
      console.error("Gemini Filter Error:", error);
      return [];
    }
  },

  async generateAPACitations(articles: Article[]) {
    const ai = getAI();
    const list = articles.map(a => `- Title: ${a.title}, Authors: ${a.authors.join(', ')}, Year: ${a.year}, Source: ${a.source}`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Format the following research papers as a perfect APA-style bibliography list. Do not add any extra text, just the citations: \n${list}`,
    });
    return response.text;
  }
};
