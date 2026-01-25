
import { GoogleGenAI, Type } from "@google/genai";
import { Article, Book, UserReviews, Sentiment, FeedSourceType, AIConfig, SocialProfiles, Feed } from "../types";

// Always initialize GoogleGenAI with a named parameter using process.env.API_KEY directly
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Robust JSON extraction from AI response text.
 */
const extractJson = (text: string, fallback: any = []) => {
  try {
    // Look for JSON array or object
    const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) {
      return JSON.parse(match[0]);
    }
    // Try parsing the whole thing if no match
    return JSON.parse(text);
  } catch (e) {
    console.warn("JSON Parse Warning: Falling back to default.", e);
    return fallback;
  }
};

export const geminiService = {
  /**
   * Colleague persona for exploring "What if" scenarios based on paper context.
   */
  async whatIfAssistant(message: string, history: { role: 'user' | 'model', parts: [{ text: string }] }[], article: Article) {
    const ai = getAI();
    const systemInstruction = `
      You are a brilliant and highly technical research colleague. 
      You are currently discussing the paper: "${article.title}".
      Abstract: ${article.abstract}

      The user wants to explore "What If" scenarios. 
      - Be creative but scientifically grounded.
      - If a hypothesis contradicts physical laws or established logic in the paper, point it out respectfully.
      - Suggest potential experiments or data points that would validate the "What If" scenario.
      - Keep responses concise, professional, and intellectually stimulating.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...history, { role: 'user', parts: [{ text: message }] }],
        config: {
          systemInstruction,
          temperature: 0.8,
        }
      });
      return response.text;
    } catch (error) {
      console.error("What If Chat Error:", error);
      return "I'm having trouble processing that hypothesis. Let's try a different angle.";
    }
  },

  /**
   * Defines a scientific term with technical nuance.
   */
  async defineScientificTerm(term: string, contextPaperTitle?: string) {
    const ai = getAI();
    const prompt = `Define the scientific/technical term: "${term}".
    ${contextPaperTitle ? `Context: This term appears in a paper titled "${contextPaperTitle}".` : ''}
    
    Return a JSON object:
    {
      "term": string,
      "definition": string (concise, technical),
      "researchContext": string (how it is used in modern literature),
      "relatedTopics": string[] (3-5 related scientific concepts)
    }`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
            required: ["term", "definition", "researchContext", "relatedTopics"]
          }
        }
      });
      return extractJson(response.text || '{}', null);
    } catch (error) {
      console.error("Lexicon Error:", error);
      return null;
    }
  },

  /**
   * Performs cross-document synthesis on a collection of articles and notes.
   */
  async synthesizeResearch(articles: Article[], notes: string[]) {
    const ai = getAI();
    const context = articles.map(a => `PAPER: ${a.title}\nABSTRACT: ${a.abstract}`).join('\n\n');
    const notesContext = notes.length > 0 ? `\n\nUSER NOTES:\n${notes.join('\n---\n')}` : '';

    const prompt = `
      As a principal investigator, synthesize the following research papers and associated annotations into a high-level scientific report.
      
      RESEARCH CONTEXT:
      ${context}
      ${notesContext}

      GOALS:
      1. Identify the common thread or conflict between these works.
      2. Highlight the most significant methodological breakthrough across the set.
      3. Suggest a "Next Step" for research based on these findings.

      Format the output in professional Markdown with clear sections.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Synthesis Error:", error);
      return "An error occurred during multi-document synthesis.";
    }
  },

  /**
   * Discovers forward citations and author updates via live search.
   */
  async getRadarUpdates(trackedPapers: string[], trackedAuthors: string[]): Promise<any[]> {
    const ai = getAI();
    const prompt = `
      Act as an automated research radar. Your goal is to find the latest academic activity regarding specific papers and authors.

      TRACKED PAPERS:
      ${trackedPapers.map(p => `- "${p}"`).join('\n')}

      TRACKED AUTHORS:
      ${trackedAuthors.map(a => `- ${a}`).join('\n')}

      INSTRUCTIONS:
      1. Use Google Search to find forward citations for the papers and recent bibliographies for the authors.
      2. Return a JSON array of discovered papers.
      3. For each hit, specify WHY it was found.
      4. Format: [{ title, authors, year, abstract, reason, source, url }]
      
      Return ONLY valid JSON.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      console.error("Radar Update Error:", error);
      return [];
    }
  },

  /**
   * Generates a conceptual quiz of 10 multiple-choice questions.
   */
  async generateQuiz(title: string, abstract: string) {
    const ai = getAI();
    const prompt = `Generate a conceptual quiz of exactly 10 multiple-choice questions based on this research paper. 
    Focus on core concepts, methodology, and significant results.
    Each question must have exactly 4 options.
    
    Paper Title: ${title}
    Abstract: ${abstract}
    
    Return the response ONLY as a JSON array of objects, where each object has:
    - question: string
    - options: string[] (exactly 4 strings)
    - correctIndex: number (0-3)`;

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
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.NUMBER }
              },
              required: ["question", "options", "correctIndex"]
            }
          }
        }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      console.error("Generate Quiz Error:", error);
      return [];
    }
  },

  /**
   * Recommends articles based on user's past ratings and AI config
   */
  async recommendArticles(ratedArticles: Article[], books: Book[], candidates: any[], aiConfig: AIConfig) {
    const ai = getAI();
    
    let biasInstruction = "";
    switch(aiConfig.recommendationBias) {
      case 'conservative':
        biasInstruction = "Strictly prioritize candidates that are very similar in topic and style to the user's highest rated articles.";
        break;
      case 'experimental':
        biasInstruction = "Look for novel, breakthrough, or diverse topics that the user hasn't explored much yet.";
        break;
      case 'balanced':
      default:
        biasInstruction = "Balance similarity to past high-rated content with occasional novel topics.";
        break;
    }

    const prompt = `
      Rank the following candidate papers based on the user's historical preferences.
      
      Recommendation Bias: ${biasInstruction}

      User's High-Rated Articles:
      ${ratedArticles.filter(a => a.rating >= 8).map(a => `- ${a.title}`).join('\n')}

      Candidate Papers:
      ${candidates.map((c, i) => `${i}. Title: ${c.title}, Abstract Snippet: ${c.snippet}`).join('\n')}

      Return a JSON array of indices representing the most relevant candidates.
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
      return extractJson(response.text || '[]');
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
      profiles.usePublicWebSearch ? '- Option Enabled: "User Public Web Search"' : ''
    ].filter(Boolean).join('\n');

    const prompt = `Generate a technical knowledge map (20 granular interest strings) for this researcher.
    Context:
    ${profileContext}
    
    Return a JSON array of strings.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      return extractJson(response.text || '[]');
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
    const prompt = `Find scientific RSS/Atom feeds or journal alert URLs for these research topics: ${topics.join(', ')}.
    Return a JSON array: [{name, url, type, description}]`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      console.error("Discover Scientific Feeds Error:", error);
      return [];
    }
  },

  async searchAmazonBooks(topics: string[]): Promise<Partial<Book>[]> {
    const ai = getAI();
    const prompt = `Find 10 relevant scientific/technical books on Amazon for: ${topics.join(', ')}.
    Return a JSON array: [{title, author, rating, price, amazonUrl, description}]`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      console.error("Amazon Search Error:", error);
      return [];
    }
  },

  async fetchScholarArticles(profiles: SocialProfiles): Promise<Partial<Article>[]> {
    const targetIdentity = profiles.googleScholar || profiles.name;
    const ai = getAI();
    
    const prompt = `Use the googleSearch tool to retrieve all publications from the following Google Scholar profile: "${targetIdentity}". 
    
    If the identity provided is a direct URL (e.g., https://scholar.google.com/citations?user=...), prioritize visiting that exact page.
    
    For each paper, extract:
    - title: string
    - authors: array of strings
    - abstract: string (short summary)
    - year: string
    - citationCount: number
    - scholarUrl: string
    - tags: array of strings

    Return the final result ONLY as a JSON array of objects. Do not include conversational text.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      const result = extractJson(response.text || '[]');
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("Fetch Scholar Articles Error:", error);
      throw error;
    }
  },

  async discoverAuthorNetwork(profiles: SocialProfiles) {
    const ai = getAI();
    const targetIdentity = profiles.googleScholar || profiles.name;
    const prompt = `Research the co-author network of ${targetIdentity} via Google Scholar.
    Return a JSON object with: nodes, links, clusters.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      return extractJson(response.text || '{}', {});
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
          tools: [{ googleSearch: {} }]
        }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      console.error("Discover References Error:", error);
      return [];
    }
  },

  /**
   * Hydrates a single citation string into a full Article object.
   */
  async fetchArticleDetails(citation: string): Promise<Partial<Article> | null> {
    const ai = getAI();
    const prompt = `Search metadata for this cited paper: "${citation}".
    Return a JSON object: {title, authors, abstract, year, citationCount, pdfUrl, tags}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      return extractJson(response.text || '{}', null);
    } catch (error) {
      console.error("Fetch Article Details Error:", error);
      return null;
    }
  },

  async summarizeArticle(title: string, abstract: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize this scientific article in 3 bullet points: \nTitle: ${title}\nAbstract: ${abstract}`,
    });
    return response.text;
  },

  async reviewAsReviewer2(title: string, abstract: string, customPrompt: string) {
    const ai = getAI();
    const finalPrompt = `Provide a concise, blunt, and highly critical review in 3-5 punchy bullet points maximum. ${customPrompt}\n\nTitle: ${title}\nAbstract: ${abstract}`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: finalPrompt,
      });
      return response.text;
    } catch (error) {
      console.error("Reviewer 2 Error:", error);
      return "Unable to summon Reviewer 2 at this time.";
    }
  },

  async critiqueArticle(title: string, abstract: string) {
    const ai = getAI();
    const prompt = `Critique this research based on its abstract: \nTitle: ${title}\nAbstract: ${abstract}`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Critique Article Error:", error);
      return "Unable to generate critique.";
    }
  },

  async analyzeAIProbability(title: string, abstract: string) {
    const ai = getAI();
    const prompt = `Analyze this abstract for AI markers: \nTitle: ${title}\nAbstract: ${abstract}
    Return JSON object: {probability, assessment, markers}`;

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
      return extractJson(response.text || '{}', { probability: 0, assessment: "Error", markers: [] });
    } catch (error) {
      console.error("AI Detection Error:", error);
      return { probability: 0, assessment: "Error analyzing content.", markers: [] };
    }
  },

  async analyzeSentiment(article: Article): Promise<UserReviews> {
    const ai = getAI();
    const prompt = `Research impact of: "${article.title}". Return JSON with sentiment, summary, citationCount, and citedByUrl.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      const result = extractJson(response.text || '{}', {});
      return {
        sentiment: (result.sentiment as Sentiment) || 'Unknown',
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
    const prompt = `Find trending papers in: ${topics.join(', ')} from last ${timeScale}. Return a JSON array.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      console.error("Trending Research Error:", error);
      return [];
    }
  },

  async filterBooks(rawJson: any[], topics: string[]): Promise<Book[]> {
    const ai = getAI();
    const bookSummaries = rawJson.filter(item => item.book).map(item => ({ title: item.book, rating: item.rating })).slice(0, 100);
    const prompt = `Filter these for scientific relevance to: ${topics.join(', ')}. Return JSON array. \n${JSON.stringify(bookSummaries)}`;

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
      const filtered = extractJson(response.text || '[]');
      return filtered.map((b: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        title: b.title,
        author: 'Imported',
        rating: b.rating || 0,
        dateAdded: new Date().toISOString(),
        shelfIds: []
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
