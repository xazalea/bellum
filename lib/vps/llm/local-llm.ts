export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type GenerateArgs = {
  messages: ChatMessage[];
  maxNewTokens?: number;
};

// Lazy, cached model instance.
let pipelinePromise: Promise<any> | null = null;

async function getPipeline() {
  if (pipelinePromise) return pipelinePromise;
  pipelinePromise = (async () => {
    // Dynamic import so the main bundle stays fast.
    const { pipeline } = await import('@xenova/transformers');
    // Small-ish default model. Cached by browser once downloaded.
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

