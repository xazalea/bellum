export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type GenerateArgs = {
  messages: ChatMessage[];
  maxNewTokens?: number;
};

declare global {
  interface Window {
    transformers?: {
      pipeline: (task: string, model: string) => Promise<any>;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
let pipelinePromise: Promise<any> | null = null;

function loadTransformersJs(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('client_only'));
    if (window.transformers?.pipeline) return resolve();

    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';
    // Under COEP:require-corp, ensure CORS fetch is used.
    s.crossOrigin = 'anonymous';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('transformers_load_failed'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

async function getPipeline() {
  if (pipelinePromise) return pipelinePromise;
  pipelinePromise = (async () => {
    await loadTransformersJs();
    const pipeline = window.transformers?.pipeline;
    if (!pipeline) throw new Error('transformers_missing_pipeline');
    return await pipeline('text-generation', 'Xenova/distilgpt2');
  })();
  return pipelinePromise;
}

function formatPrompt(messages: ChatMessage[]): string {
  // Lightweight “chat” formatting.
  return messages
    .slice(-12)
    .map((m) => {
      const role = m.role.toUpperCase();
      return `${role}: ${m.content}`;
    })
    .join('\n')
    .concat('\nASSISTANT:');
}

export async function generateChat(args: GenerateArgs): Promise<{ text: string }> {
  const gen = await getPipeline();
  const prompt = formatPrompt(args.messages);
  const out = await gen(prompt, {
    max_new_tokens: Math.max(8, Math.min(256, args.maxNewTokens ?? 64)),
    do_sample: true,
    temperature: 0.8,
    top_p: 0.92,
  });

  // transformers.js returns array with generated_text.
  const text = Array.isArray(out) && out[0]?.generated_text ? String(out[0].generated_text) : String(out);
  // Return only assistant tail.
  const idx = text.lastIndexOf('ASSISTANT:');
  const tail = idx >= 0 ? text.slice(idx + 'ASSISTANT:'.length) : text;
  return { text: tail.trim() };
}

