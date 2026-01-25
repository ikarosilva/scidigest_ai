import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Article, Book, UserReviews, Sentiment, FeedSourceType, AIConfig, SocialProfiles, Feed } from "../types";

// Initialize the Gemini API client using the environment variable API_KEY
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Robustly extracts JSON content from a text response that might contain markdown blocks.
 */
const extractJson = (text: string | undefined, fallback: any = {}) => {
  if (!text) return fallback;
  try {
    // 1. Strip markdown code blocks if they exist
    let cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 2. Find the first '{' or '[' and the last '}' or ']'
    const firstBrace = cleanedText.indexOf('{');
    const firstBracket = cleanedText.indexOf('[');
    
    let startIdx = -1;
    let endChar = '';
    
    if (firstBrace !== -1 && (firstBracket === -1 || (firstBrace < firstBracket && firstBrace !== -1))) {
      startIdx = firstBrace;
      endChar = '}';
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endChar = ']';
    }
    
    if (startIdx !== -1) {
      const lastIdx = cleanedText.lastIndexOf(endChar);
      if (lastIdx !== -1) {
        cleanedText = cleanedText.substring(startIdx, lastIdx + 1);
      }
    }
    
    return JSON.parse(cleanedText);
  } catch (e) {
    console.warn("JSON Parse Warning in geminiService:", e);
    return fallback;
  }
};

export const geminiService = {
  // Extract technical metadata from a PDF file
  async extractMetadataFromPDF(base64PDF: string): Promise<any> {
    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64PDF,
                },
              },
              {
                text: "Analyze this scientific paper and extract: Title, Authors (array of strings), Abstract, Year of publication, and 5 technical tags. Return as a JSON object with these keys.",
              },
            ],
          },
        ],
        config: { responseMimeType: "application/json" }
      });
      return extractJson(response.text, {});
    } catch (error) {
      console.error("PDF Extraction Error:", error);
      return null;
    }
  },

  // Suggest tags and identifies novel topics for a paper relative to user interests
  async suggestTagsAndTopics(title: string, abstract: string, existingInterests: string[]): Promise<{ tags: string[], newTopics: string[] }> {
    const ai = getAI();
    const prompt = `
      Paper: ${title}
      Abstract: ${abstract}
      Existing User Interests: ${existingInterests.join(', ')}

      Analyze the paper. Provide:
      1. A list of 5 technical tags.
      2. Identify which of these tags represent a significant new research direction not covered by the existing interests.
      
      Return JSON: { "tags": [], "newTopics": [] }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return extractJson(response.text, { tags: [], newTopics: [] });
    } catch (error) {
      return { tags: [], newTopics: [] };
    }
  },

  // Generates a one-sentence technical summary of a paper
  async generateQuickTake(title: string, abstract: string): Promise<string> {
    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Provide exactly one sentence explaining the core technical contribution of this paper: \nTitle: ${title}\nAbstract: ${abstract}`,
        config: { temperature: 0.3 }
      });
      return response.text || "";
    } catch (error) {
      console.error("QuickTake Error:", error);
      return "";
    }
  },

  // Creates a script for a technical podcast briefing
  async generatePodcastScript(articles: Article[]): Promise<string> {
    const ai = getAI();
    const context = articles.map(a => `Title: ${a.title}\nAbstract: ${a.abstract}`).join('\n\n');
    const prompt = `
      Create a conversational script for a scientific podcast briefing. 
      Speakers: Joe (a senior principal investigator) and Jane (a data scientist).
      Topic: Reviewing the latest papers in the user's research queue.
      Context:
      ${context}

      Format:
      Joe: [Speech]
      Jane: [Speech]
      
      Keep it high-level but technically accurate. Duration: 2-3 minutes.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "";
    } catch (error) {
      console.error("Podcast Script Error:", error);
      return "";
    }
  },

  // Uses text-to-speech to generate multi-speaker audio for a podcast script
  async generatePodcastAudio(script: string): Promise<string | null> {
    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `TTS the following conversation between Joe and Jane:\n${script}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                { speaker: 'Joe', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                { speaker: 'Jane', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
              ]
            }
          }
        }
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error) {
      console.error("Podcast Audio Error:", error);
      return null;
    }
  },

  // Interactive technical assistant for discussing hypothetical scenarios
  async whatIfAssistant(message: string, history: any[], article: Article): Promise<string> {
    const ai = getAI();
    const systemInstruction = `You are a brilliant and highly technical research colleague discussing "${article.title}". Abstract: ${article.abstract}`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...history, { role: 'user', parts: [{ text: message }] }],
        config: { systemInstruction, temperature: 0.8 }
      });
      return response.text || "";
    } catch (error) {
      return "I'm having trouble processing that hypothesis.";
    }
  },

  // High-quality multi-document synthesis into a scientific report
  async synthesizeResearch(articles: Article[], notes: string[]): Promise<string> {
    const ai = getAI();
    const context = articles.map(a => `PAPER: ${a.title}\nABSTRACT: ${a.abstract}`).join('\n\n');
    const prompt = `Synthesize these research papers into a scientific report. Identify thematic overlaps, methodological conflicts, and future research trajectories. \n${context}\n${notes.join('\n')}`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });
      return response.text || "";
    } catch (error) {
      return "An error occurred during multi-document synthesis.";
    }
  },

  // Fetches publication list for a given Google Scholar profile
  async fetchScholarArticles(profiles: SocialProfiles): Promise<Partial<Article>[]> {
    const targetIdentity = profiles.googleScholar || profiles.name;
    const ai = getAI();
    const prompt = `Use the googleSearch tool to retrieve all publications from the following Google Scholar profile: "${targetIdentity}". Return as a plain text JSON array string.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      return extractJson(response.text, []);
    } catch (error) {
      throw error;
    }
  },

  // Summarize an article into bullet points
  async summarizeArticle(title: string, abstract: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize in 3 bullets: \nTitle: ${title}\nAbstract: ${abstract}`,
    });
    return response.text || "";
  },

  // Ranks article candidates based on user interests and bias configuration
  async recommendArticles(ratedArticles: Article[], books: any[], candidates: any[], aiConfig: AIConfig): Promise<number[]> {
    const ai = getAI();
    const prompt = `Based on these rated papers: ${ratedArticles.map(a => `${a.title} (Rating: ${a.rating})`).join(', ')} 
    And these books: ${books.map(b => b.title).join(', ')}
    Rank the following candidates from 0 to ${candidates.length - 1} based on user interests. 
    Bias: ${aiConfig.recommendationBias}.
    Candidates: ${candidates.map((c, i) => `[${i}] ${c.title}: ${c.snippet}`).join('\n')}
    Return only a JSON array of indices in order of recommendation.`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const result = extractJson(response.text, []);
      return Array.isArray(result) ? result : candidates.map((_, i) => i);
    } catch (error) {
      console.error("Recommend Error:", error);
      return candidates.map((_, i) => i);
    }
  },

  // Discovers granular research trajectories from social and academic profiles
  async discoverInterestsFromProfiles(profiles: SocialProfiles): Promise<string[]> {
    const ai = getAI();
    const prompt = `Using the googleSearch tool, analyze these profiles and identify granular research trajectories and scientific interests for this researcher: ${JSON.stringify(profiles)}. Return only a JSON array string.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      return extractJson(response.text, []);
    } catch (error) {
      return [];
    }
  },

  // Finds trending research papers using search grounding with Google Scholar focus
  async getTrendingResearch(topics: string[], timeScale: string): Promise<any> {
    const ai = getAI();
    const prompt = `Using the googleSearch tool to specifically scan Google Scholar, find the top 6 trending and most impactful research papers from the last ${timeScale} related to: ${topics.join(', ')}. 
    Filter for papers with high citation velocity and recent academic buzz.
    Return a JSON object with a "results" array of objects containing { title, authors (array), snippet, year, citationCount (integer), heatScore (0-100), scholarUrl, source }.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      const data = extractJson(response.text, { results: [] });
      const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      return { results: data.results || [], groundingSources };
    } catch (error) {
      console.error("Trending Error:", error);
      return { results: [], groundingSources: [] };
    }
  },

  // Searches for technical books using search grounding
  async searchAmazonBooks(topics: string[]): Promise<any> {
    const ai = getAI();
    const prompt = `Search for the highest rated technical books and textbooks related to: ${topics.join(', ')}. 
    Return a JSON object with a "results" array of objects containing { title, author, rating, price, amazonUrl, description }.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      const data = extractJson(response.text, { results: [] });
      const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      return { results: data.results || [], groundingSources };
    } catch (error) {
      console.error("Amazon Search Error:", error);
      return { results: [], groundingSources: [] };
    }
  },

  // Discovers the co-author network and major technical clusters for a researcher
  async discoverAuthorNetwork(profiles: SocialProfiles): Promise<any> {
    const ai = getAI();
    const identity = profiles.googleScholar || profiles.name;
    const prompt = `Using the googleSearch tool, discover the co-author network and major technical clusters for the researcher "${identity}".
    Return as a JSON object with "nodes" (id, name, cluster, level) and "links" (source, target) and "clusters" (name, color).
    Hierarchy: Level 0 is the researcher, Level 1 co-authors, Level 2 their collaborators.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        }
      });
      return extractJson(response.text, { nodes: [], links: [], clusters: [] });
    } catch (error) {
      console.error("Author Network Error:", error);
      return { nodes: [], links: [], clusters: [] };
    }
  },

  // Discovers significant references (forward and backward) for a paper
  async discoverReferences(article: Article): Promise<{ references: string[], groundingSources: any[] }> {
    const ai = getAI();
    const prompt = `Find the most significant papers cited by or citing the paper: "${article.title}" by ${article.authors.join(', ')}. 
    Return a JSON object with a "references" array of citation strings.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      const data = extractJson(response.text, { references: [] });
      const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      return { references: data.references || [], groundingSources };
    } catch (error) {
      console.error("Discover References Error:", error);
      return { references: [], groundingSources: [] };
    }
  },

  // Provides technical definition and research context for a scientific term
  async defineScientificTerm(term: string, paperTitle: string): Promise<any> {
    const ai = getAI();
    const prompt = `Define the technical term "${term}" in the context of the paper "${paperTitle}". 
    Return as a JSON object: { "term": string, "definition": string, "researchContext": string, "relatedTopics": string[] }`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return extractJson(response.text, null);
    } catch (error) {
      console.error("Define Term Error:", error);
      return null;
    }
  },

  // Fetches detailed article metadata from a query or URL using search grounding
  async fetchArticleDetails(query: string): Promise<any> {
    const ai = getAI();
    const prompt = `Find detailed academic metadata for: "${query}". 
    Return a JSON object with: title, authors (array), abstract, year, pdfUrl, tags (array), citationCount.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      return extractJson(response.text, null);
    } catch (error) {
      console.error("Fetch Details Error:", error);
      return null;
    }
  },

  // Adversarial methodology audit simulating a harsh peer reviewer
  async reviewAsReviewer2(title: string, abstract: string, reviewerPrompt: string): Promise<string> {
    const ai = getAI();
    const prompt = `${reviewerPrompt}\n\nPaper Title: ${title}\nAbstract: ${abstract}\n\nProvide your critical peer review identifying methodology flaws and over-stated results.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });
      return response.text || "";
    } catch (error) {
      console.error("Reviewer 2 Error:", error);
      return "Critical review unavailable.";
    }
  },

  // Generates conceptual validation quizzes for a paper
  async generateQuiz(title: string, abstract: string): Promise<any[]> {
    const ai = getAI();
    const prompt = `Create a 10-question multiple choice quiz for:
    Title: ${title}
    Abstract: ${abstract}
    
    Return exactly a JSON array of objects with: question, options (4 strings), correctIndex (0-3).`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return extractJson(response.text, []);
    } catch (error) {
      console.error("Generate Quiz Error:", error);
      return [];
    }
  },

  // Discovers scientific feed sources based on user interests
  async discoverScientificFeeds(interests: string[]): Promise<any[]> {
    const ai = getAI();
    const prompt = `Discover 10 technical RSS/JSON feed sources related to: ${interests.join(', ')}.
    Return a JSON array of objects with: name, url, description, type.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      return extractJson(response.text, []);
    } catch (error) {
      console.error("Discover Feeds Error:", error);
      return [];
    }
  },

  // Performs a live sonar sweep for recent academic updates related to tracked entities
  async getRadarUpdates(papers: string[], authors: string[]): Promise<any[]> {
    const ai = getAI();
    const prompt = `Sweep for latest updates (citations, publications) for papers: [${papers.join(', ')}] and authors: [${authors.join(', ')}].
    Return a JSON array of objects with: title, authors (array), snippet, year, url, reason, source, citationCount.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      return extractJson(response.text, []);
    } catch (error) {
      console.error("Radar Updates Error:", error);
      return [];
    }
  }
};