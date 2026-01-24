
import { GoogleGenAI, Type } from "@google/genai";
import { Article, Book, UserReviews, Sentiment, FeedSourceType, AIConfig, SocialProfiles, Feed } from "../types";

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
    1. Perform a live Google Search for this individual's publications and topics.
    2. Return a JSON array of technical research topics.
    3. Provide at most 15 specific, high-quality strings.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
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

  /**
   * Discovers scientific feeds (RSS, Atom, JSON) based on topics
   */
  async discoverScientificFeeds(topics: string[]): Promise<any[]> {
    const ai = getAI();
    const prompt = `Find professional scientific and technical RSS/Atom feeds, journal alert pages, or blog notification URLs for these research topics: ${topics.join(', ')}.
    
    STRICT CATEGORIES TO EXPLORE:
    - Conferences (e.g. NeurIPS, ICML, CVPR)
    - High-impact Journals (Nature, Science, Lancet, NEJM)
    - Pre-print servers (arXiv sections, MedRxiv, bioRxiv)
    - Top-tier Labs/Blogs (HuggingFace, DeepMind, OpenAI, Microsoft Research)
    
    Return a JSON array of high-quality, verified sources.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Name of the journal, conference or blog" },
                url: { type: Type.STRING, description: "The direct RSS/Atom feed URL or the main alert page URL" },
                type: { type: Type.STRING, description: "One of: Conference, Journal, Pre-print, Blog, Lab" },
                description: { type: Type.STRING, description: "1-sentence on why this matches the research topics" }
              },
              required: ["name", "url", "type"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Discover Scientific Feeds Error:", error);
      return [];
    }
  },

  async searchAmazonBooks(topics: string[]): Promise<Partial<Book>[]> {
    const ai = getAI();
    const prompt = `Find the 10 most relevant, high-rated, and recently published scientific or technical books on Amazon.com for the following topics: ${topics.join(', ')}.
    
    Return a JSON array of objects with: title, author, rating (out of 5), price, amazonUrl, and a 1-sentence description.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
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
    const targetIdentity = profiles.googleScholar || profiles.name;
    console.log("Triggering fetchScholarArticles for:", targetIdentity);
    const ai = getAI();
    
    const prompt = `CRITICAL TASK: Use the googleSearch tool to access the official Google Scholar profile for: "${targetIdentity}". 
    
    ${profiles.googleScholar ? `Direct URL provided: ${profiles.googleScholar}. PLEASE VISIT THIS URL TO EXTRACT DATA.` : ''}
    
    If you find a match, extract a list of their published research papers.
    For each paper, extract:
    - title: Full title.
    - authors: Array of authors.
    - abstract: Brief summary.
    - year: 4-digit year.
    - citationCount: citations as integer.
    - scholarUrl: Direct Google Scholar URL.
    - tags: 2-3 keywords.

    Return the result ONLY as a JSON array. Return [] if none found.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
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
      const result = JSON.parse(response.text || '[]');
      console.log("Scholar Sync Result Count:", result.length);
      return result;
    } catch (error) {
      console.error("Fetch Scholar Articles Error:", error);
      throw error;
    }
  },

  async discoverAuthorNetwork(profiles: SocialProfiles) {
    const ai = getAI();
    const targetIdentity = profiles.googleScholar || profiles.name;
    const prompt = `Research the co-author network of ${targetIdentity} using their Google Scholar profile. Identify clusters and papers.
    
    Return a JSON object with:
    - nodes: Array of { id, name, type, cluster, level }
    - links: Array of { source, target, type }
    - clusters: Array of { name, color }`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
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
                  }
                }
              },
              links: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: { type: Type.STRING }, target: { type: Type.STRING } } } },
              clusters: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, color: { type: Type.STRING } } } }
            }
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
    const prompt = `Find the bibliography of: "${article.title}". Return a JSON array of strings: "Title, Year".`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
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

  async critiqueArticle(title: string, abstract: string) {
    const ai = getAI();
    const prompt = `As a senior peer reviewer for a high-impact journal, provide a critical appraisal of the following research based on its abstract. 
    
    Title: ${title}
    Abstract: ${abstract}
    
    Provide your critique in exactly 4 sections:
    1. **Methodological Soundness**: Potential weaknesses or assumptions.
    2. **Statistical Considerations**: Concerns regarding sample size, data processing, or bias.
    3. **Novelty vs. Incrementalism**: Does this push the field forward?
    4. **Critical Consensus**: How this might be received by the broader community.
    
    Keep it professional, objective, and dense.`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Critique Article Error:", error);
      return "Unable to generate critique at this time.";
    }
  },

  async analyzeAIProbability(title: string, abstract: string) {
    const ai = getAI();
    const prompt = `Act as a forensic scientific linguist. Analyze the following article title and abstract for markers of Large Language Model (AI) generation. 
    Look for:
    - Over-polishing and lack of domain-specific "jargon quirks".
    - Repetitive structural patterns typical of default LLM output.
    - Consistency across highly complex technical claims.

    Title: ${title}
    Abstract: ${abstract}
    
    Return your assessment as a JSON object with:
    - probability: number (0-100)
    - assessment: string (1-sentence conclusion)
    - markers: string[] (List 2-3 technical reasons for your score)`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              probability: { type: Type.NUMBER },
              assessment: { type: Type.STRING },
              markers: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["probability", "assessment", "markers"]
          }
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("AI Detection Error:", error);
      return { probability: 0, assessment: "Error analyzing content.", markers: [] };
    }
  },

  async analyzeSentiment(article: Article): Promise<UserReviews> {
    const ai = getAI();
    const prompt = `Research the impact of: "${article.title}". Return JSON with sentiment, summary, citationCount, and citedByUrl.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
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
            }
          }
        }
      });
      const result = JSON.parse(response.text || '{}');
      return {
        sentiment: result.sentiment as Sentiment || 'Unknown',
        summary: result.summary || 'Analysis complete.',
        citationCount: result.citationCount,
        citedByUrl: result.citedByUrl,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
    } catch (error) {
      console.error("Sentiment Analysis Error:", error);
      return { sentiment: 'Unknown', summary: 'Error performing live research.', lastUpdated: new Date().toISOString().split('T')[0] };
    }
  },

  async getTrendingResearch(topics: string[], timeScale: string): Promise<any[]> {
    const ai = getAI();
    const prompt = `Find trending papers in: ${topics.join(', ')} from the last ${timeScale}. Return a JSON array of objects.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
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
              }
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

  async filterBooks(rawJson: any[], topics: string[]): Promise<Book[]> {
    const ai = getAI();
    const bookSummaries = rawJson.filter(item => item.book).map(item => ({ title: item.book, rating: item.rating })).slice(0, 100);
    const prompt = `Filter these books for scientific relevance to: ${topics.join(', ')}. Return JSON array. \n${JSON.stringify(bookSummaries)}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, rating: { type: Type.NUMBER } } }
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
      console.error("Filter Books Error:", error);
      return [];
    }
  },

  async generateAPACitations(articles: Article[]) {
    const ai = getAI();
    const list = articles.map(a => `- ${a.title}`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Format as APA bibliography: \n${list}`,
    });
    return response.text;
  }
};
