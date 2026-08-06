"use client";

import Image from "next/image";

/**
 * SplashScreen
 * ──────────────────────────────────────────────────────────────
 * Used exclusively for the initial "cold start" of the dashboard
 * (hard refresh or initial login redirect). 
 * 
 * Hides the complex hydration of user permissions, auth tokens, 
 * and socket connections behind a premium, animated brand curtain.
 * 
 * For in-app navigation, we use the structural skeletons 
 * (like GenericPageSkeleton in loading.tsx) to maintain the 
 * feeling of a highly responsive, native application.
 */
export function SplashScreen() {
  return (
    <div 
      className="fixed inset-0 z-[9999] bg-[#f9faf9] flex flex-col items-center justify-center overflow-hidden"
      suppressHydrationWarning
    >
      <div className="relative flex flex-col items-center gap-6" suppressHydrationWarning>
        {/* Logo container */}
        <div className="relative" suppressHydrationWarning>
          <Image
            src="/images/villeto-logo.png"
            alt="Villeto"
            width={160}
            height={50}
            className="w-auto h-12 object-contain"
            priority
          />
        </div>
        
        {/* Sleek, indeterminate progress bar matching new design tokens */}
        <div 
          className="w-32 h-1 bg-[#e7f6f2] rounded-full overflow-hidden relative"
          suppressHydrationWarning
        >
          <div className="absolute inset-y-0 left-0 bg-[#087f70] rounded-full w-1/3 animate-[progress_1.2s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Add the keyframe inline so we don't need to modify globals.css just for this micro-animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(300%); }
        }
      `}} />
    </div>
  );
}
