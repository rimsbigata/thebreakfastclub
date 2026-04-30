'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function JoinPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/session');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Opening Session Gate
      </div>
    </div>
  );
}
