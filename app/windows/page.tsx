'use client';

import { ExeRunner } from '@/components/game/exe-runner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, Code, Settings, Shield, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon: Monitor,
    title: 'Browser Runtime',
    desc: 'Run Windows executables directly in your browser — no VM installation needed.',
  },
  {
    icon: Code,
    title: 'x86 to WASM',
    desc: 'PE binaries are statically translated to WebAssembly through our transpiler pipeline.',
  },
  {
    icon: Settings,
    title: 'Win32 API',
    desc: 'Kernel32, User32, and GDI32 subsystems implemented for compatibility.',
  },
  {
    icon: Shield,
    title: 'Sandboxed',
    desc: 'Executables run in an isolated environment — fully contained in the browser.',
  },
] as const;

export default function WindowsPage() {
  return (
    <div className="py-8">
      <div className="container-max">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium mb-4">
            <Monitor className="h-3.5 w-3.5" />
            Windows Runtime
          </div>
          <h1 className="text-3xl font-bold">Run Windows Apps in Your Browser</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Upload an EXE file and run it in the browser.
            Our static binary translator converts x86 instructions to WebAssembly
            and provides Win32 API compatibility.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-blue-500/30">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <Card className="mb-10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Run EXE</CardTitle>
            <CardDescription>
              Select or drag a Windows EXE file to upload and execute in the browser runtime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExeRunner />
          </CardContent>
        </Card>

        <div className="rounded-xl border bg-card p-8">
          <h2 className="text-xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Upload', desc: 'Select or drag your .exe file' },
              { step: '2', title: 'Analyze', desc: 'PE headers are parsed and validated' },
              { step: '3', title: 'Translate', desc: 'x86 instructions are compiled to WASM' },
              { step: '4', title: 'Run', desc: 'App executes with Win32 API emulation' },
            ].map(({ step, title, desc }, i) => (
              <div key={step} className="text-center relative">
                {i < 3 && (
                  <div className="hidden md:block absolute top-5 left-[60%] right-[-40%]">
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                  </div>
                )}
                <div className="mx-auto h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 text-blue-600 dark:text-blue-400 font-bold">
                  {step}
                </div>
                <h3 className="font-semibold text-sm mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
