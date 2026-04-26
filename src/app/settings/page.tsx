
"use client";

import { useState } from 'react';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCcw, Trash2, QrCode, Plus, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function SettingsPage() {
  const { paymentMethods, addPaymentMethod, deletePaymentMethod, resetDailyBoard, wipeAllData } = useClub();
  const { toast } = useToast();

  const [newMethodName, setNewMethodName] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        addPaymentMethod(newMethodName || 'Unnamed QR', reader.result as string);
        setNewMethodName('');
        toast({ title: "QR Uploaded Locally" });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleResetAction = () => {
    resetDailyBoard();
    toast({ title: "Daily Board Reset" });
  };

  const handleWipeAction = () => {
    if (confirm("Delete EVERYTHING?")) {
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
              <QrCode className="h-5 w-5" /> Payment QR
            </CardTitle>
            <CardDescription>Manage scan-to-pay codes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account (e.g. GCash)</Label>
                <Input placeholder="GCash" value={newMethodName} onChange={e => setNewMethodName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Image</Label>
                <Input type="file" accept="image/*" onChange={handleFileChange} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              {paymentMethods.map(method => (
                <div key={method.id} className="relative group border rounded-lg p-3 bg-secondary/10 flex flex-col items-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => deletePaymentMethod(method.id)}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                  <div className="relative h-24 w-24 border bg-white rounded-md overflow-hidden mb-2">
                    <Image src={method.imageUrl} alt={method.name} fill className="object-contain" />
                  </div>
                  <span className="font-bold text-xs">{method.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Maintenance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={handleResetAction} variant="outline" className="w-full gap-2 border-primary text-primary">
              <RefreshCcw className="h-4 w-4" /> Reset Daily Board
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle></CardHeader>
          <CardContent>
            <Button onClick={handleWipeAction} variant="destructive" className="w-full gap-2">
              <Trash2 className="h-4 w-4" /> Wipe All Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
