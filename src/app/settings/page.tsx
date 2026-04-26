
"use client";

import { useState, useRef } from 'react';
import { useFirestore, useStorage, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, writeBatch, getDocs, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PaymentMethod } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCcw, Trash2, AlertTriangle, QrCode, Plus, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function SettingsPage() {
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newMethodName, setNewMethodName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  const paymentMethodsRef = useMemoFirebase(() => collection(db, 'paymentMethods'), [db]);
  const { data: paymentMethods } = useCollection<PaymentMethod>(paymentMethodsRef);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newMethodName || !selectedFile) {
      toast({ title: "Missing details", description: "Name and image required.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const id = Math.random().toString(36).substring(7);

    try {
      const storageRef = ref(storage, `payments/qr-codes/${id}-${selectedFile.name}`);
      const uploadResult = await uploadBytes(storageRef, selectedFile);
      const imageUrl = await getDownloadURL(uploadResult.ref);

      const methodRef = doc(db, 'paymentMethods', id);
      setDocumentNonBlocking(methodRef, {
        id,
        name: newMethodName,
        imageUrl: imageUrl
      }, { merge: true });

      setNewMethodName('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      toast({ title: "QR Uploaded" });
    } catch (error) {
      console.error(error);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleResetMatches = async () => {
    try {
      const batch = writeBatch(db);
      
      const playersSnap = await getDocs(collection(db, 'players'));
      playersSnap.forEach(p => {
        batch.update(p.ref, { status: 'available', gamesPlayed: 0 });
      });
      
      const matchesSnap = await getDocs(collection(db, 'matches'));
      matchesSnap.forEach(m => batch.delete(m.ref));
      
      const courtsSnap = await getDocs(collection(db, 'courts'));
      courtsSnap.forEach(c => batch.update(c.ref, { status: 'available', currentMatchId: null }));
      
      await batch.commit();
      toast({ title: "Daily Reset Done" });
    } catch (e) {
      console.error(e);
      toast({ title: "Reset Failed", variant: "destructive" });
    }
  };

  const handleWipeData = async () => {
    if (!confirm("This will PERMANENTLY delete ALL club data. Continue?")) return;
    
    setIsWiping(true);
    try {
      const collections = ['players', 'courts', 'matches', 'fees', 'paymentMethods'];
      for (const colName of collections) {
        const snap = await getDocs(collection(db, colName));
        const batch = writeBatch(db);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      toast({ title: "Club Purged" });
    } catch (e) {
      console.error(e);
      toast({ title: "Purge Failed", variant: "destructive" });
    } finally {
      setIsWiping(false);
    }
  };

  const handleDeleteMethod = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'paymentMethods', id));
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
                <Input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} />
              </div>
            </div>
            <Button onClick={handleAddPaymentMethod} disabled={uploading} className="w-full">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {uploading ? 'Uploading...' : 'Add QR Code'}
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              {paymentMethods?.map(method => (
                <div key={method.id} className="relative group border rounded-lg p-3 bg-secondary/10 flex flex-col items-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => handleDeleteMethod(method.id)}
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
            <Button onClick={handleResetMatches} variant="outline" className="w-full gap-2 border-primary text-primary">
              <RefreshCcw className="h-4 w-4" /> Reset Daily Board
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle></CardHeader>
          <CardContent>
            <Button onClick={handleWipeData} disabled={isWiping} variant="destructive" className="w-full gap-2">
              {isWiping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Wipe All Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
