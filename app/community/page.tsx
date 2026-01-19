'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

export default function CommunityPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create widgetbot element after script loads
    if (isLoaded && widgetRef.current && !widgetRef.current.querySelector('widgetbot')) {
      const widgetElement = document.createElement('widgetbot');
      widgetElement.setAttribute('server', '1462853786790793298');
      widgetElement.setAttribute('channel', '1462853786790793301');
      widgetElement.setAttribute('width', '100%');
      widgetElement.setAttribute('height', '600');
      widgetRef.current.appendChild(widgetElement);
    }

    // Check if the widget loaded successfully
    const timer = setTimeout(() => {
      if (widgetRef.current && !widgetRef.current.querySelector('iframe')) {
        setError('Widget failed to load. Please try refreshing the page.');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-start pt-32 pb-16 px-4 bg-gradient-to-br from-[#0A111F] to-[#0F172A]">
      <div className="w-full max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="material-symbols-outlined text-6xl text-[#5865F2]">forum</span>
          </div>
          <h1 className="text-5xl font-pixel text-[#8B9DB8] mb-4">
            Community Hub
          </h1>
          <p className="text-xl font-retro text-[#64748B] max-w-2xl mx-auto">
            Join our Discord community to chat, report bugs, suggest features, and connect with other explorers of the deep.
          </p>
        </div>

        {/* Widget Container */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#5865F2]/10 to-[#7289DA]/10 rounded-2xl blur-xl" />
          
          <div className="relative bg-[#0F172A]/80 backdrop-blur-xl border border-[#2A3648] rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#5865F2">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <h2 className="text-2xl font-pixel text-[#8B9DB8]">
                  Live Chat
                </h2>
              </div>
              <a
                href="https://discord.gg/ADauzE32J7"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-lg font-retro text-sm transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
              >
                Open in Discord
              </a>
            </div>

            {/* Loading State */}
            {!isLoaded && !error && (
              <div className="flex items-center justify-center h-[600px] bg-[#1E2A3A]/50 rounded-lg border border-[#2A3648]">
                <div className="text-center space-y-4">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#5865F2] border-t-transparent" />
                  <p className="font-retro text-[#64748B]">Loading Discord chat...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex items-center justify-center h-[600px] bg-[#1E2A3A]/50 rounded-lg border border-red-500/30">
                <div className="text-center space-y-4 max-w-md px-8">
                  <span className="material-symbols-outlined text-6xl text-red-500">error</span>
                  <p className="font-retro text-[#64748B]">{error}</p>
                  <a
                    href="https://discord.gg/ADauzE32J7"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-lg font-retro text-sm transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Open Discord Directly
                  </a>
                </div>
              </div>
            )}

            {/* Widgetbot Embed */}
            <div
              ref={widgetRef}
              className={`${isLoaded ? 'block' : 'hidden'} rounded-lg overflow-hidden border border-[#2A3648]`}
              style={{ minHeight: '600px' }}
            />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-[#0F172A]/60 backdrop-blur-sm border border-[#2A3648] rounded-xl p-6 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-[#10B981]">bug_report</span>
            <h3 className="font-pixel text-lg text-[#8B9DB8]">Report Bugs</h3>
            <p className="font-retro text-sm text-[#64748B]">
              Found an issue? Let us know in #bug-reports
            </p>
          </div>

          <div className="bg-[#0F172A]/60 backdrop-blur-sm border border-[#2A3648] rounded-xl p-6 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-[#F59E0B]">lightbulb</span>
            <h3 className="font-pixel text-lg text-[#8B9DB8]">Suggest Features</h3>
            <p className="font-retro text-sm text-[#64748B]">
              Have an idea? Share it in #suggestions
            </p>
          </div>

          <div className="bg-[#0F172A]/60 backdrop-blur-sm border border-[#2A3648] rounded-xl p-6 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-[#8B5CF6]">chat</span>
            <h3 className="font-pixel text-lg text-[#8B9DB8]">Chat & Connect</h3>
            <p className="font-retro text-sm text-[#64748B]">
              Join the conversation in #general
            </p>
          </div>
        </div>

        {/* Community Stats */}
        <div className="bg-gradient-to-br from-[#0F172A]/80 to-[#1E2A3A]/60 backdrop-blur-xl border border-[#2A3648] rounded-2xl p-8">
          <h3 className="text-2xl font-pixel text-[#8B9DB8] mb-6 text-center">
            Community Guidelines
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl text-[#10B981]">check_circle</span>
                <div>
                  <h4 className="font-retro text-[#8B9DB8] font-bold">Be Respectful</h4>
                  <p className="font-retro text-sm text-[#64748B]">Treat everyone with kindness and respect</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl text-[#10B981]">check_circle</span>
                <div>
                  <h4 className="font-retro text-[#8B9DB8] font-bold">Stay On Topic</h4>
                  <p className="font-retro text-sm text-[#64748B]">Keep discussions relevant to Bellum</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl text-[#10B981]">check_circle</span>
                <div>
                  <h4 className="font-retro text-[#8B9DB8] font-bold">Help Others</h4>
                  <p className="font-retro text-sm text-[#64748B]">Share knowledge and support the community</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl text-[#EF4444]">cancel</span>
                <div>
                  <h4 className="font-retro text-[#8B9DB8] font-bold">No Spam</h4>
                  <p className="font-retro text-sm text-[#64748B]">Don&apos;t spam channels or DM users</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl text-[#EF4444]">cancel</span>
                <div>
                  <h4 className="font-retro text-[#8B9DB8] font-bold">No Harassment</h4>
                  <p className="font-retro text-sm text-[#64748B]">Zero tolerance for harassment or hate speech</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl text-[#EF4444]">cancel</span>
                <div>
                  <h4 className="font-retro text-[#8B9DB8] font-bold">No NSFW Content</h4>
                  <p className="font-retro text-sm text-[#64748B]">Keep all content family-friendly</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Load Widgetbot script through our proxy */}
      <Script
        src="/api/proxy/widgetbot"
        onLoad={() => setIsLoaded(true)}
        onError={() => setError('Failed to load Discord widget. Please try opening Discord directly.')}
      />
    </main>
  );
}
