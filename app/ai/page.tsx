'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Zap, Brain, MessageSquare, Play, Copy, Check } from 'lucide-react';
import { useState, useCallback, useRef } from 'react';

const AI_FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Generation',
    desc: 'Generate complete playable games from text prompts.',
  },
  {
    icon: Zap,
    title: 'Instant Preview',
    desc: 'Run generated code immediately in the embedded sandbox.',
  },
  {
    icon: Brain,
    title: 'Smart Templates',
    desc: 'Platformers, shooters, puzzle games — describe and create.',
  },
  {
    icon: MessageSquare,
    title: 'Iterate Fast',
    desc: 'Refine your game by updating the prompt and regenerating.',
  },
] as const;

export default function AIPage() {
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [source, setSource] = useState<string>('');
  const sandboxRef = useRef<HTMLIFrameElement>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setIsPlaying(false);
    setSource('');
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setGeneratedCode(data.code);
      setSource(data.source === 'ai' ? 'AI Generated' : `Template: ${data.template}`);
    } catch {
      setGeneratedCode('// Error generating code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt]);

  const handlePlay = useCallback(() => {
    if (!generatedCode.trim() || !sandboxRef.current) return;
    setIsPlaying(true);
    const html = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a1a;overflow:hidden;display:flex;align-items:center;justify-content:center;height:100vh}canvas{max-width:100%;max-height:100%}</style></head><body><script>${generatedCode}<\/script></body></html>`;
    sandboxRef.current.srcdoc = html;
  }, [generatedCode]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedCode]);

  return (
    <div className="py-8">
      <div className="container-max">
        <div className="mb-10">
          <h1 className="text-3xl font-bold">AI Game Generator</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Describe a game and get playable code instantly. Powered by AI with smart template fallbacks.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {AI_FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/30">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Describe Your Game</CardTitle>
              <CardDescription>Be specific: genre, mechanics, visuals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="A space shooter where you dodge asteroids and collect power-ups..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[140px] resize-none"
              />
              <div className="flex gap-2">
                <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Generate'}
                </Button>
                {isGenerating && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Creating your game...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Generated Code</CardTitle>
                  <CardDescription>{source || 'Game code appears here'}</CardDescription>
                </div>
                {generatedCode && (
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 min-h-[140px] max-h-[300px] overflow-auto">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                  {generatedCode || '// Generate code to see it here'}
                </pre>
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button size="sm" onClick={handlePlay} disabled={!generatedCode.trim()} className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                Run Game
              </Button>
            </CardFooter>
          </Card>
        </div>

        {isPlaying && (
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Game Preview</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsPlaying(false)}>Close</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  ref={sandboxRef}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                  title="Game Preview"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Use arrow keys / WASD to control. Space to jump/shoot.</p>
            </CardContent>
          </Card>
        )}

        <div className="rounded-xl border bg-card p-8">
          <h2 className="text-xl font-bold text-center mb-2">Quick Prompts</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">Click any prompt to try it</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              'A platformer with double jump and gem collection',
              'Classic Pong with AI opponent',
              'Space shooter with particle explosions',
              'Snake game with growing tail',
            ].map(p => (
              <button
                key={p}
                onClick={() => { setPrompt(p); }}
                className="p-3 rounded-lg border text-left text-sm hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
