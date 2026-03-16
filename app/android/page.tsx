'use client';

import { ApkRunner } from '@/components/game/apk-runner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Code, Settings, Shield, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon: Smartphone,
    title: 'Browser Runtime',
    desc: 'Run Android apps directly in your browser — no emulator installation needed.',
  },
  {
    icon: Code,
    title: 'DEX to WASM',
    desc: 'Dalvik bytecode is translated to WebAssembly via our JIT compiler pipeline.',
  },
  {
    icon: Settings,
    title: 'Full Framework',
    desc: 'Android framework services including ActivityManager and PackageManager.',
  },
  {
    icon: Shield,
    title: 'Sandboxed',
    desc: 'Apps run in an isolated environment — your data stays on your device.',
  },
] as const;

export default function AndroidPage() {
  return (
    <div className="py-8">
      <div className="container-max">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium mb-4">
            <Smartphone className="h-3.5 w-3.5" />
            Android Runtime
          </div>
          <h1 className="text-3xl font-bold">Run Android Apps in Your Browser</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Upload an APK file and run it directly in your browser.
            Our custom Dalvik JIT compiler translates Android bytecode to WebAssembly in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-green-500/30">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <Card className="mb-10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Run APK</CardTitle>
            <CardDescription>
              Select or drag an Android APK file to upload and execute in the browser runtime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApkRunner />
          </CardContent>
        </Card>

        <div className="rounded-xl border bg-card p-8">
          <h2 className="text-xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Upload', desc: 'Select or drag your .apk file' },
              { step: '2', title: 'Parse', desc: 'DEX bytecode is extracted and analyzed' },
              { step: '3', title: 'Compile', desc: 'Dalvik opcodes are JIT-compiled to WASM' },
              { step: '4', title: 'Run', desc: 'App launches in the Android framework' },
            ].map(({ step, title, desc }, i) => (
              <div key={step} className="text-center relative">
                {i < 3 && (
                  <div className="hidden md:block absolute top-5 left-[60%] right-[-40%]">
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                  </div>
                )}
                <div className="mx-auto h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center mb-3 text-green-600 dark:text-green-400 font-bold">
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
