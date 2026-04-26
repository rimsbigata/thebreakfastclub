
'use client';

import { useState, useRef } from 'react';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCcw, Trash2, QrCode, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function SettingsPage() {
  const { paymentMethods, addPaymentMethod, deletePaymentMethod, resetDailyBoard, wipeAllData } = useClub();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newMethodName, setNewMethodName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const img = new (window as any).Image();
        img.onload = () => {
          // Canvas for resizing to keep localStorage usage small
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400; // Resize to max 400px width/height
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with compression to save a lot of space
          const compressedData = canvas.toDataURL('image/jpeg', 0.7);

          addPaymentMethod(newMethodName || 'Unnamed QR', compressedData);
          setNewMethodName('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          setIsUploading(false);
          toast({ 
            title: "QR Method Added", 
            description: `${newMethodName || 'New QR'} has been saved and optimized.` 
          });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    if (!newMethodName) {
      toast({ 
        title: "Name required", 
        description: "Please enter a name (e.g. GCash) before uploading.",
        variant: "destructive" 
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleResetAction = () => {
    resetDailyBoard();
    toast({ title: "Daily Board Reset" });
  };

  const handleWipeAction = () => {
    if (typeof window !== 'undefined' && window.confirm("Delete EVERYTHING? This cannot be undone.")) {
      wipeAllData();
      toast({ title: "All data wiped" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 pb-24">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> Payment QR Methods
            </CardTitle>
            <CardDescription>Manage your scan-to-pay codes for player fees.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Account Name</Label>
                <Input 
                  placeholder="e.g. GCash, Maya, Bank Transfer" 
                  value={newMethodName} 
                  onChange={e => setNewMethodName(e.target.value)} 
                />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
              <Button onClick={triggerFileUpload} disabled={isUploading} className="gap-2">
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Add Payment Method
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              {paymentMethods.map(method => (
                <div key={method.id} className="relative group border rounded-xl p-4 bg-secondary/10 flex flex-col items-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-7 w-7 bg-background/80 hover:bg-destructive hover:text-white"
                    onClick={() => deletePaymentMethod(method.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="relative h-32 w-32 border bg-white rounded-lg overflow-hidden mb-3 shadow-inner">
                    <Image src={method.imageUrl} alt={method.name} fill className="object-contain p-2" />
                  </div>
                  <span className="font-bold text-sm uppercase tracking-tight">{method.name}</span>
                </div>
              ))}
              {paymentMethods.length === 0 && (
                <div className="col-span-full py-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-secondary/5">
                  <QrCode className="h-10 w-10 mb-2 opacity-10" />
                  <p className="text-sm">No payment methods configured.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Maintenance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={handleResetAction} variant="outline" className="w-full gap-2 border-primary text-primary hover:bg-primary/5">
              <RefreshCcw className="h-4 w-4" /> Reset Daily Board (Clear Matches & Reset Stats)
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle></CardHeader>
          <CardContent>
            <Button onClick={handleWipeAction} variant="destructive" className="w-full gap-2">
              <Trash2 className="h-4 w-4" /> Wipe All Club Data (Factory Reset)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
