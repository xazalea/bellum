import { NextResponse } from 'next/server';

// Dynamic imports to avoid webpack static analysis during build
const getChatModelFactory = async () => {
  const { ChatModelFactory } = await import(
    /* webpackIgnore: true */
    '@/lib/gpt4free/model/index'
  );
  return ChatModelFactory;
};

const getEnums = async () => {
  const { Site, ModelType } = await import(
    /* webpackIgnore: true */
    '@/lib/gpt4free/model/enums'
  );
  return { Site, ModelType };
};

// Check if we're in build mode
const isBuildTime = typeof process !== 'undefined' && 
  (process.env.NEXT_PHASE === 'phase-production-build' || 
   process.env.CF_PAGES === '1' ||
   process.env.NEXT_PHASE);

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface SiteSupport {
  site: string;
  models: string[];
}

// Map of sites to their supported models (will be populated at runtime)
const getSiteModels = async (): Promise<Record<string, string[]>> => {
  const { Site, ModelType } = await getEnums();
  return {
  [Site.Phind]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.FakeOpen]: [ModelType.GPT4, ModelType.GPT3p5Turbo, ModelType.GPT4Turbo],
  [Site.MerlinGmail]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.ClaudeChat]: [ModelType.Claude3Opus, ModelType.Claude3Sonnet, ModelType.Claude2],
  [Site.OneAPI]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.Auto]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.SinCode]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.OpenAI]: [ModelType.GPT4, ModelType.GPT3p5Turbo, ModelType.GPT4Turbo],
  [Site.Google]: [ModelType.GeminiPro],
  [Site.WWW]: [ModelType.GPT3p5Turbo],
  [Site.DDG]: [ModelType.GPT3p5Turbo, ModelType.Claude3Haiku],
  [Site.Mixer]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.Merlin]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.Langdock]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.Navit]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.Claude]: [ModelType.Claude3Opus, ModelType.Claude3Sonnet],
  [Site.Stack]: [ModelType.GPT3p5Turbo],
  [Site.TD]: [ModelType.GPT3p5Turbo],
  [Site.Izea]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.Askx]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.OpenSess]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.Gemini]: [ModelType.GeminiPro],
  [Site.AIRoom]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.GPTGOD]: [ModelType.GPT3p5Turbo],
  [Site.FreeGPT4]: [ModelType.GPT4],
  [Site.Domo]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.Pika]: [ModelType.GPT4],
  [Site.Suno]: [ModelType.GPT4],
  [Site.PerAuto]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.FreeGPT35]: [ModelType.GPT3p5Turbo],
  [Site.PerLabs]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.MJPlus]: [ModelType.GPT4],
  [Site.Doc2x]: [ModelType.GPT4],
  [Site.Groq]: [ModelType.Llama3_70b],
  [Site.Bibi]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.Vidu]: [ModelType.GPT4],
  [Site.Fireworks]: [ModelType.GPT4, ModelType.Llama3_70b],
  [Site.Runway]: [ModelType.GPT4],
  [Site.Ideogram]: [ModelType.GPT4],
  [Site.GLM]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.Chatgateai]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.OpenAIAuto]: [ModelType.GPT4, ModelType.GPT3p5Turbo, ModelType.GPT4Turbo],
  [Site.Flux]: [ModelType.GPT4],
  [Site.MJWeb]: [ModelType.GPT4],
  [Site.ClaudeAuto]: [ModelType.Claude3Opus, ModelType.Claude3Sonnet],
  [Site.BingCopilot]: [ModelType.GPT4],
  [Site.Midjourney]: [ModelType.GPT4],
  [Site.Hypotenuse]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  [Site.Perplexity]: [ModelType.GPT4, ModelType.GPT3p5Turbo],
  };
};

export async function GET() {
  // Immediately return during build to prevent any code execution
  if (isBuildTime) {
    return NextResponse.json([]);
  }
  try {
    const { ModelType } = await getEnums();
    const siteModels = await getSiteModels();
    const ChatModelFactory = await getChatModelFactory();
    const factory = new ChatModelFactory();
    const supports: SiteSupport[] = [];

    factory.forEach((chat, site) => {
      const models = siteModels[site] || [ModelType.GPT3p5Turbo];
      supports.push({
        site,
        models,
      });
    });

    return NextResponse.json(supports);
  } catch (error) {
    console.error('Error getting supports:', error);
    return NextResponse.json(
      { error: 'Failed to get supported models' },
      { status: 500 }
    );
  }
}
