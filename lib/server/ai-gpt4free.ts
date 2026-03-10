import "server-only";

export type AIMessage = {
  role: string;
  content: string;
};

type RuntimeModule = {
  Site: Record<string, string>;
  ModelType: Record<string, string>;
  getChatModel: () => any;
};

async function loadRuntime(): Promise<RuntimeModule> {
  const mod = await import("@/lib/gpt4free/model/index");
  return {
    Site: mod.Site as Record<string, string>,
    ModelType: mod.ModelType as Record<string, string>,
    getChatModel: mod.getChatModel,
  };
}

function normalizeMessages(input: string | AIMessage[] | unknown): AIMessage[] {
  if (typeof input === "string") {
    const prompt = input.trim();
    if (!prompt) throw new Error("Missing prompt parameter");
    return [{ role: "user", content: prompt }];
  }

  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("Missing prompt parameter");
  }

  const normalized = input
    .map((m: any) => ({ role: String(m?.role || "user"), content: String(m?.content || "") }))
    .filter((m) => m.content.trim().length > 0);

  if (!normalized.length) throw new Error("Missing prompt parameter");
  return normalized;
}

function resolveEnumValue(value: string | undefined, enumObj: Record<string, string>, fallback: string): string {
  if (!value) return fallback;
  const allowed = new Set(Object.values(enumObj));
  return allowed.has(value) ? value : fallback;
}

export async function getSupports() {
  const runtime = await loadRuntime();
  const factory = runtime.getChatModel();
  const sites = Object.values(runtime.Site);
  const models = Object.values(runtime.ModelType);

  const supports = sites
    .map((site) => {
      const chat = factory.get(site);
      if (!chat) return null;

      const supportedModels: string[] = [];
      for (const model of models) {
        try {
          const limit = chat.support(model);
          if (typeof limit === "number" && limit > 0) {
            supportedModels.push(model);
          }
        } catch {
          // ignore per-model capability failures
        }
      }

      if (!supportedModels.length) return null;
      return { site, models: supportedModels };
    })
    .filter((item): item is { site: string; models: string[] } => !!item);

  supports.sort((a, b) => b.models.length - a.models.length);
  return supports;
}

export async function chatCompletion(params: {
  prompt?: string | AIMessage[];
  messages?: AIMessage[];
  site?: string;
  model?: string;
}) {
  const runtime = await loadRuntime();
  const Site = runtime.Site;
  const ModelType = runtime.ModelType;

  const messages = normalizeMessages(params.messages ?? params.prompt ?? "");
  const selectedSite = resolveEnumValue(params.site, Site, Site.Auto ?? "auto");
  const selectedModel = resolveEnumValue(params.model, ModelType, ModelType.GPT3p5Turbo ?? "gpt-3.5-turbo");

  const factory = runtime.getChatModel();
  const chat = factory.get(selectedSite) || factory.get(Site.Auto ?? "auto");
  if (!chat) throw new Error(`Site '${selectedSite}' not supported`);

  const preHandled = await chat.preHandle({
    prompt: "",
    messages,
    model: selectedModel,
  });

  const response = await chat.ask(preHandled);
  if (response.error) throw new Error(response.error);

  return {
    content: response.content || "",
    role: response.role || "assistant",
    site: selectedSite,
    model: selectedModel,
  };
}
