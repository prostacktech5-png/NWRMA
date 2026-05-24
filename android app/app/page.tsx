'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white flex items-center justify-center overflow-hidden border border-border">
          <Image
            src="/image-removebg-preview.png"
            alt="NWRMA Logo"
            width={72}
            height={72}
            className="object-contain"
          />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Loading HydroGauge SL...</p>
      </div>
    </div>
  );
}
