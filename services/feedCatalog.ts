/**
 * Curated RSS feed catalog for Sources & Topics → Monitoring Feeds.
 * Inspired by Feedspot and awesome-rss-feeds; users can browse more at those links.
 */
export interface CatalogFeed {
  name: string;
  url: string;
}

export interface CatalogCategory {
  category: string;
  feeds: CatalogFeed[];
}

export const FEED_CATALOG: CatalogCategory[] = [
  {
    category: 'Science & Academia',
    feeds: [
      { name: 'arXiv CS (AI & ML)', url: 'https://rss.arxiv.org/rss/cs.AI' },
      { name: 'arXiv CS (LG)', url: 'https://rss.arxiv.org/rss/cs.LG' },
      { name: 'arXiv q-bio', url: 'https://rss.arxiv.org/rss/q-bio' },
      { name: 'Nature News', url: 'https://feeds.nature.com/nature/rss/current' },
      { name: 'Science Magazine', url: 'https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science' },
      { name: 'PubMed Central (PMC)', url: 'https://www.ncbi.nlm.nih.gov/pmc/journals/?format=rss' },
      { name: 'PLOS ONE', url: 'https://journals.plos.org/plosone/feed/atom' },
    ],
  },
  {
    category: 'Technology & Engineering',
    feeds: [
      { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
      { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/' },
      { name: 'IEEE Spectrum', url: 'https://feeds.feedburner.com/IEEE-Spectrum' },
      { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
      { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
      { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
    ],
  },
  {
    category: 'ML & Data',
    feeds: [
      { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml' },
      { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/' },
      { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml' },
      { name: 'DeepMind Blog', url: 'https://www.deepmind.com/blog/rss.xml' },
      { name: 'Distill', url: 'https://distill.pub/rss.xml' },
      { name: 'Papers With Code', url: 'https://paperswithcode.com/rss/latest' },
    ],
  },
  {
    category: 'News & Blogs',
    feeds: [
      { name: 'Reuters Technology', url: 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best' },
      { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
      { name: 'TensorFlow Blog', url: 'https://blog.tensorflow.org/feeds/posts/default' },
      { name: 'PyTorch Blog', url: 'https://pytorch.org/blog/feed/' },
    ],
  },
];

export const EXTERNAL_CATALOG_LINKS = [
  { label: 'Browse Feedspot', url: 'https://rss.feedspot.com/' },
  { label: 'Awesome RSS Feeds (GitHub)', url: 'https://github.com/plenaryapp/awesome-rss-feeds' },
] as const;
