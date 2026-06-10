"use client"

import { useOnboardingStore } from '@/stores/useVilletoStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CongratulationsModal() {
  const { showCongratulations, closeCongratulations } = useOnboardingStore();
  const router = useRouter();

  return (
    <Dialog open={showCongratulations} onOpenChange={(open) => { 
      if (!open) { 
        router.replace("/login"); 
        closeCongratulations(); 
      } 
    }}>
      <DialogContent 
        className="max-w-md mx-4 p-8 text-center border-0 rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >


        {/* Celebration Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4 text-6xl animate-bounce">
            🎉
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Congratulations!
          </h2>
          <div className="text-gray-600 space-y-2">
            <p>Your details and documents have been successfully submitted.</p>
            <p>You will receive an email shortly concerning your progress.</p>
          </div>
        </div>

        {/* Continue Button */}
        <Button
          onClick={() => { router.replace("/login"); closeCongratulations() }}
          className="w-full bg-primary hover:bg-primary/90 text-white  text-lg rounded-xl"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}