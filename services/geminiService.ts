import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { Article, UserReviews, Sentiment, FeedSourceType, AIConfig, SocialProfiles, Feed, GeminiUsageEvent } from "../types";
import { dbService } from "./dbService";
import { SYSTEM_INSTRUCTIONS, PROMPTS } from "./prompts";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
    if (isRateLimit && retries > 0) {
      dbService.addLog('warning', `Rate limit hit. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const reportUsage = (feature: string, model: string, response: GenerateContentResponse | null, startTime: number, success: boolean, context?: any) => {
  const endTime = Date.now();
  const usage = response?.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };
  
  const event: GeminiUsageEvent = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    feature,
    model,
    promptTokens: usage.promptTokenCount || 0,
    candidatesTokens: usage.candidatesTokenCount || 0,
    totalTokens: usage.totalTokenCount || 0,
    latencyMs: endTime - startTime,
    success
  };
  
  dbService.trackUsage(event);
};

export const geminiService = {
  // Generates a one-sentence technical essence of the paper
  async generateQuickTake(title: string, abstract: string): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `${SYSTEM_INSTRUCTIONS.QUICK_TAKE}\n\nTITLE: ${title}\nABSTRACT: ${abstract}`;

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt
      }));
      const text = response.text || "";
      reportUsage("QuickTake", modelName, response, start, true);
      return text.trim();
    } catch (error: any) {
      reportUsage("QuickTake", modelName, null, start, false, { error: error.message });
      return "Technical summary unavailable.";
    }
  },

  async recommendArticles(ratedArticles: Article[], books: any[], candidates: any[], interests: string[], aiConfig: AIConfig): Promise<{ index: number, matchedTopics: string[] }[]> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const context = `Rated Papers: ${ratedArticles.map(a => `${a.title} (Rating: ${a.rating}/10)`).join(', ')}\n` +
                    `User Research Interests: ${interests.join(', ')}`;
    
    const prompt = `Rank these new candidates by relevance to the user's research trajectory. 
    Return an array of objects containing "index" and "matchedTopics".\n\nCANDIDATES:\n${candidates.map((c, i) => `${i}: ${c.title} - ${c.snippet}`).join('\n')}\n\nCONTEXT:\n${context}`;

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                index: { type: Type.INTEGER },
                matchedTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["index", "matchedTopics"]
            }
          }
        }
      }));
      const results = JSON.parse(response.text || "[]");
      reportUsage("Article Recommendation", modelName, response, start, true);
      return results;
    } catch (error: any) {
      reportUsage("Article Recommendation", modelName, null, start, false, { error: error.message });
      return candidates.map((_, i) => ({ index: i, matchedTopics: [] }));
    }
  },

  async discoverInterestsFromProfiles(profiles: SocialProfiles): Promise<string[]> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Analyze academic profiles for granular research interests: ${profiles.name} ${profiles.googleScholar}`;
    
    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: profiles.usePublicWebSearch ? [{ googleSearch: {} }] : undefined,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }));
      const interests = JSON.parse(response.text || "[]");
      reportUsage("Interest Discovery", modelName, response, start, true);
      return interests;
    } catch (error: any) {
      reportUsage("Interest Discovery", modelName, null, start, false, { error: error.message });
      return [];
    }
  },

  async searchAmazonBooks(topics: string[]): Promise<{ results: any[], groundingSources: any[] }> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Search Amazon for technical books on: ${topics.join(', ')}`;
    
    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              books: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    author: { type: Type.STRING },
                    price: { type: Type.STRING },
                    rating: { type: Type.NUMBER },
                    amazonUrl: { type: Type.STRING },
                    description: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      }));
      const data = JSON.parse(response.text || '{"books":[]}');
      reportUsage("Amazon Book Search", modelName, response, start, true);
      return { results: data.books || [], groundingSources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
    } catch (error: any) {
      reportUsage("Amazon Book Search", modelName, null, start, false, { error: error.message });
      return { results: [], groundingSources: [] };
    }
  },

  async synthesizeResearch(articles: Article[], noteContents: string[]): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-pro-preview';
    const prompt = `Perform a high-level research synthesis of the following ${articles.length} papers and user notes. 
    Identify shared methodologies, conflicting results, and potential future research trajectories.
    PAPERS:
    ${articles.map(a => `- ${a.title}: ${a.abstract}`).join('\n')}
    USER NOTES:
    ${noteContents.join('\n\n')}
    `;

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 4000 } }
      }));
      const text = response.text || "";
      reportUsage("Research Synthesis", modelName, response, start, true);
      return text;
    } catch (error: any) {
      reportUsage("Research Synthesis", modelName, null, start, false, { error: error.message });
      return "Synthesis failed.";
    }
  },

  async runReviewer2Audit(article: Article, customPrompt?: string): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-pro-preview';
    const config = dbService.getAIConfig();
    const systemPrompt = customPrompt || config.reviewer2Prompt;
    
    const prompt = `PAPER TITLE: ${article.title}\nABSTRACT: ${article.abstract}\n\n${systemPrompt}`;

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { 
          thinkingConfig: { thinkingBudget: 8000 },
          systemInstruction: SYSTEM_INSTRUCTIONS.RESEARCH_ASSISTANT
        }
      }));
      const text = response.text || "";
      reportUsage("Reviewer 2 Audit", modelName, response, start, true);
      return text;
    } catch (error: any) {
      reportUsage("Reviewer 2 Audit", modelName, null, start, false, { error: error.message });
      return "Adversarial audit failed to generate.";
    }
  },

  async askWhatIf(article: Article, scenario: string): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-pro-preview';
    const prompt = `I am reading the paper: "${article.title}". 
Abstract: ${article.abstract}

Hypothetical Scenario/Question: ${scenario}

Explore the implications of this scenario. How would it change the results, methodologies, or relevance of the paper? 
Provide a deep technical analysis as an AI research colleague.`;

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { 
          thinkingConfig: { thinkingBudget: 4000 },
          systemInstruction: SYSTEM_INSTRUCTIONS.RESEARCH_ASSISTANT
        }
      }));
      const text = response.text || "";
      reportUsage("What If Exploration", modelName, response, start, true);
      return text;
    } catch (error: any) {
      reportUsage("What If Exploration", modelName, null, start, false, { error: error.message });
      return "Hypothetical analysis failed.";
    }
  },

  async discoverAuthorNetwork(profiles: SocialProfiles): Promise<any> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Build a research network graph for the researcher: ${profiles.name}. 
    Include co-authors and group them into topic clusters. 
    Return a JSON object with 'nodes' (id, name, cluster, level) and 'clusters' (name, color).`;

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
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
                    cluster: { type: Type.STRING },
                    level: { type: Type.INTEGER }
                  },
                  required: ["id", "name", "cluster", "level"]
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
            required: ["nodes", "clusters"]
          }
        }
      }));
      const data = JSON.parse(response.text || '{"nodes":[], "clusters":[]}');
      reportUsage("Author Network Discovery", modelName, response, start, true);
      return data;
    } catch (error: any) {
      reportUsage("Author Network Discovery", modelName, null, start, false, { error: error.message });
      return { nodes: [], clusters: [] };
    }
  },

  async discoverReferences(article: Article): Promise<{ references: string[], groundingSources: any[] }> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = PROMPTS.CITATION_SEARCH(article.title);

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              references: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["references"]
          }
        }
      }));
      const data = JSON.parse(response.text || '{"references":[]}');
      reportUsage("Reference Discovery", modelName, response, start, true);
      return { 
        references: data.references || [], 
        groundingSources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] 
      };
    } catch (error: any) {
      reportUsage("Reference Discovery", modelName, null, start, false, { error: error.message });
      return { references: [], groundingSources: [] };
    }
  },

  async discoverScientificFeeds(interests: string[]): Promise<any[]> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Discover 10 high-quality scientific RSS or JSON feeds (arXiv categories, journals, tech blogs) for these research interests: ${interests.join(', ')}. 
    Include 'name', 'url', 'type', and 'description'.`;

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                url: { type: Type.STRING },
                type: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["name", "url", "type", "description"]
            }
          }
        }
      }));
      const feeds = JSON.parse(response.text || "[]");
      reportUsage("Feed Discovery", modelName, response, start, true);
      return feeds;
    } catch (error: any) {
      reportUsage("Feed Discovery", modelName, null, start, false, { error: error.message });
      return [];
    }
  },

  async getRadarUpdates(trackedPapers: string[], trackedAuthors: string[]): Promise<any[]> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Search for the most recent (2024-2025) forward-citations for these papers: ${trackedPapers.join(', ')}. 
    Also check for new publications by these authors: ${trackedAuthors.join(', ')}. 
    Return an array of hit objects containing 'title', 'authors', 'year', 'snippet', 'reason', 'url', 'citationCount'.`;

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
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
                snippet: { type: Type.STRING },
                reason: { type: Type.STRING },
                url: { type: Type.STRING },
                citationCount: { type: Type.INTEGER }
              },
              required: ["title", "reason", "url"]
            }
          }
        }
      }));
      const hits = JSON.parse(response.text || "[]");
      reportUsage("Radar Sweep", modelName, response, start, true);
      return hits;
    } catch (error: any) {
      reportUsage("Radar Sweep", modelName, null, start, false, { error: error.message });
      return [];
    }
  },

  async suggestTagsAndTopics(title: string, abstract: string, existingInterests: string[]): Promise<{ tags: string[], newTopics: string[] }> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = PROMPTS.SUGGEST_TAGS(title, abstract, existingInterests);

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              newTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["tags", "newTopics"]
          }
        }
      }));
      const data = JSON.parse(response.text || '{"tags":[], "newTopics":[]}');
      reportUsage("Topic Suggestion", modelName, response, start, true);
      return data;
    } catch (error: any) {
      reportUsage("Topic Suggestion", modelName, null, start, false, { error: error.message });
      return { tags: [], newTopics: [] };
    }
  },

  async extractMetadataFromPDF(base64: string): Promise<any> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    
    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: 'application/pdf' } },
            { text: SYSTEM_INSTRUCTIONS.METADATA_EXTRACTOR }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              authors: { type: Type.ARRAY, items: { type: Type.STRING } },
              abstract: { type: Type.STRING },
              year: { type: Type.INTEGER }
            },
            required: ["title", "authors", "abstract"]
          }
        }
      }));
      const metadata = JSON.parse(response.text || "{}");
      reportUsage("PDF Extraction", modelName, response, start, true);
      return metadata;
    } catch (error: any) {
      reportUsage("PDF Extraction", modelName, null, start, false, { error: error.message });
      throw error;
    }
  },

  async fetchArticleDetails(url: string): Promise<Partial<Article> | null> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Extract academic metadata (title, authors, abstract, year, pdfUrl) for the research article at this URL: ${url}`;

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              authors: { type: Type.ARRAY, items: { type: Type.STRING } },
              abstract: { type: Type.STRING },
              year: { type: Type.INTEGER },
              pdfUrl: { type: Type.STRING }
            },
            required: ["title", "authors"]
          }
        }
      }));
      const data = JSON.parse(response.text || "{}");
      reportUsage("URL Metadata Extraction", modelName, response, start, true);
      return data;
    } catch (error: any) {
      reportUsage("URL Metadata Extraction", modelName, null, start, false, { error: error.message });
      return null;
    }
  },

  async defineScientificTerm(term: string, context: string): Promise<any> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Define the scientific term "${term}" in the context of: ${context}. 
    Provide a granular definition, research context, and related topics.`;

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
              researchContext: { type: Type.STRING },
              relatedTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["term", "definition"]
          }
        }
      }));
      const data = JSON.parse(response.text || "{}");
      reportUsage("Term Definition", modelName, response, start, true);
      return data;
    } catch (error: any) {
      reportUsage("Term Definition", modelName, null, start, false, { error: error.message });
      return { term, definition: "Definition unavailable." };
    }
  },

  async getTrendingResearch(topics: string[], timescale: string): Promise<any> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Identify highly trending papers and breakthroughs in these fields: ${topics.join(', ')} over the last ${timescale}. 
    Return a JSON object with 'results' (an array of entries).`;

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    authors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    year: { type: Type.STRING },
                    snippet: { type: Type.STRING },
                    citationCount: { type: Type.INTEGER },
                    source: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["results"]
          }
        }
      }));
      const data = JSON.parse(response.text || '{"results":[]}');
      reportUsage("Trending Discovery", modelName, response, start, true);
      return { 
        results: data.results || [], 
        groundingSources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] 
      };
    } catch (error: any) {
      reportUsage("Trending Discovery", modelName, null, start, false, { error: error.message });
      return { results: [], groundingSources: [] };
    }
  }
};