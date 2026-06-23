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
      className="fixed inset-0 z-[9999] bg-dashboard-background flex flex-col items-center justify-center overflow-hidden"
      suppressHydrationWarning
    >
      <div className="relative flex flex-col items-center gap-8" suppressHydrationWarning>
        {/* Animated logo container */}
        <div className="relative animate-pulse" suppressHydrationWarning>
          <Image
            src="/images/villeto-logo.png"
            alt="Villeto"
            width={180}
            height={56}
            className="w-auto h-14 object-contain"
            priority
          />
        </div>
        
        {/* Sleek, indeterminate progress bar using arbitrary Tailwind classes for the animation */}
        <div 
          className="w-48 h-1 bg-border/40 rounded-full overflow-hidden relative"
          suppressHydrationWarning
        >
          <div className="absolute inset-y-0 left-0 bg-primary/80 rounded-full w-1/2 animate-[progress_1.5s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Add the keyframe inline so we don't need to modify globals.css just for this micro-animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(200%); }
        }
      `}} />
    </div>
  );
}
