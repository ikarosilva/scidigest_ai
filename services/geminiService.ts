
import { GoogleGenAI, Type } from "@google/genai";
import { Article, Book, UserReviews, Sentiment, FeedSourceType, AIConfig, SocialProfiles, Feed } from "../types";

// Always initialize GoogleGenAI with a named parameter using process.env.API_KEY directly
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
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
      Act as an automated research radar. Your goal is to find the latest (2024-2025) academic activity regarding specific papers and authors.

      TRACKED PAPERS (Look for NEW papers that CITE these):
      ${trackedPapers.map(p => `- "${p}"`).join('\n')}

      TRACKED AUTHORS (Look for NEW papers PUBLISHED by these individuals):
      ${trackedAuthors.map(a => `- ${a}`).join('\n')}

      INSTRUCTIONS:
      1. Use Google Search to find forward citations for the papers and recent bibliographies for the authors.
      2. Return a JSON array of discovered papers.
      3. For each hit, specify WHY it was found (e.g. "Cites your tracked paper X" or "New from tracked author Y").
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
      const text = response.text || '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
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
    Focus on core concepts, methodology, and significant results rather than minor details or exact numbers.
    Each question must have exactly 4 options.
    
    Paper Title: ${title}
    Abstract: ${abstract}
    
    Return the response ONLY as a JSON array of objects, where each object has:
    - question: string
    - options: string[] (exactly 4 strings)
    - correctIndex: number (0-3)
    
    Do not use markdown blocks or preamble.`;

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
      const text = response.text || '[]';
      return JSON.parse(text);
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

    const prompt = `You are an elite academic research scout. Your goal is to generate an EXHAUSTIVE and HOLISTIC technical knowledge map for this researcher based on the provided profile context.

    User Context:
    ${profileContext}
    
    CRITICAL INSTRUCTIONS:
    1. Perform a live Google Search for this individual's academic output, affiliations, and professional citations.
    2. Analyze their most cited work and recent technical publications to identify core trajectories.
    3. PROVIDE A DIVERSE AND GRANULAR LIST. Do not provide high-level terms (e.g., skip "AI" or "Medicine"). Provide specific research domains (e.g., "Non-invasive hemodynamics monitoring" or "Transformer-based protein folding").
    4. Return EXACTLY 20 high-quality technical interest strings as a JSON array.
    5. Do not worry about redundant topics; the system needs a complete holistic map of their research identity even if it overlaps with common existing interests.
    
    Return ONLY a JSON array.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      const text = response.text || '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
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
    
    Return a JSON array of high-quality, verified sources. Format: [{name, url, type, description}]`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      const text = response.text || '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
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
          tools: [{ googleSearch: {} }]
        }
      });
      const text = response.text || '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (error) {
      console.error("Amazon Search Error:", error);
      return [];
    }
  },

  async fetchScholarArticles(profiles: SocialProfiles): Promise<Partial<Article>[]> {
    const targetIdentity = profiles.googleScholar || profiles.name;
    const ai = getAI();
    
    const prompt = `URGENT TASK: Use the googleSearch tool to specifically locate and scrape the Google Scholar citations profile for: "${targetIdentity}". 
    
    Search Strategy:
    1. Search for "Google Scholar citations profile for ${targetIdentity}".
    2. If a URL containing "scholar.google.com/citations?user=" is found, access it directly.
    3. Scrape the list of ALL publications shown on that profile page.
    
    FOR each publication, extract:
    - title: Full paper title.
    - authors: Array of authors as strings.
    - abstract: A brief 2-sentence summary (infer from search snippet if needed).
    - year: 4-digit publication year.
    - citationCount: citations as integer.
    - scholarUrl: Direct Google Scholar URL for the paper.
    - tags: 2-3 relevant keywords.

    Return the final result ONLY as a JSON array of objects. Do not include markdown code blocks or conversational text.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      const text = response.text || '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const cleanedJson = jsonMatch ? jsonMatch[0] : text;
      
      const result = JSON.parse(cleanedJson);
      return Array.isArray(result) ? result : [];
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
          tools: [{ googleSearch: {} }]
        }
      });
      const text = response.text || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
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
      const text = response.text || '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
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
    const prompt = `Search for the full academic metadata of the following cited paper: "${citation}".
    
    Return a JSON object with:
    - title: Full paper title
    - authors: Array of authors
    - abstract: Brief 3-4 sentence abstract
    - year: 4-digit year
    - citationCount: integer estimate
    - pdfUrl: Link to a PDF if publicly available (arXiv, etc)
    - tags: 2-3 technical keywords
    
    Return ONLY JSON.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      const text = response.text || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (error) {
      console.error("Fetch Article Details Error:", error);
      return null;
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

  async reviewAsReviewer2(title: string, abstract: string, customPrompt: string) {
    const ai = getAI();
    const finalPrompt = `${customPrompt}\n\nTitle: ${title}\nAbstract: ${abstract}`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: finalPrompt,
      });
      return response.text;
    } catch (error) {
      console.error("Reviewer 2 Error:", error);
      return "Unable to summon Reviewer 2 at this time. Perhaps they are busy rejecting another paper.";
    }
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
          tools: [{ googleSearch: {} }]
        }
      });
      const text = response.text || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : text);
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
    const prompt = `Find trending papers in: ${topics.join(', ')} from the last ${timeScale}. Return a JSON array of objects.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      const text = response.text || '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
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
