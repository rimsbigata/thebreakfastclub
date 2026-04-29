
'use client';

import { useState, useRef } from 'react';
import { useClub } from '@/context/ClubContext';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RefreshCcw, Trash2, QrCode, Upload, Loader2, Sun, Moon, Palette, Settings as SettingsIcon, Trophy, Zap, KeyRound, Power } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import tbcLogo from '@/assets/images/tbc_logo_loading.png';

export default function SettingsPage() {
  const {
    paymentMethods, addPaymentMethod, deletePaymentMethod, resetDailyBoard,
    endSession, setClubLogo, clubLogo, defaultWinningScore, setDefaultWinningScore,
    autoAdvanceEnabled, setAutoAdvanceEnabled, queueSessionCode, regenerateQueueSessionCode,
    defaultCourtCount, setDefaultCourtCount, clearClubData
  } = useClub();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [newMethodName, setNewMethodName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);

  const processAndUpload = (file: File, callback: (data: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
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

        const compressedData = canvas.toDataURL('image/jpeg', 0.7);
        callback(compressedData);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      processAndUpload(e.target.files[0], (data) => {
        addPaymentMethod(newMethodName || 'Unnamed QR', data);
        setNewMethodName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsUploading(false);
        toast({ title: "QR Method Added" });
      });
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsLogoUploading(true);
      processAndUpload(e.target.files[0], (data) => {
        setClubLogo(data);
        if (logoInputRef.current) logoInputRef.current.value = '';
        setIsLogoUploading(false);
        toast({ title: "Club Logo Updated" });
      });
    }
  };

  const triggerFileUpload = () => {
    if (!newMethodName) {
      toast({ title: "Name required", description: "Enter a name before uploading.", variant: "destructive" });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleResetAction = async () => {
    try {
      await resetDailyBoard();
      toast({ title: "Daily Board Reset" });
    } catch (error) {
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Database update failed.",
        variant: "destructive"
      });
    }
  };

  const handleEndSession = async () => {
    if (typeof window !== 'undefined' && window.confirm("Terminate this session? All players will be disconnected and this code will expire.")) {
      try {
        await endSession();
        toast({ title: "Session Terminated" });
        router.push('/');
      } catch (error) {
        toast({
          title: "Failed to end session",
          description: error instanceof Error ? error.message : "Database update failed.",
          variant: "destructive"
        });
      }
    }
  };

  const handleClearClubData = async () => {
    if (typeof window !== 'undefined') {
      const confirmation = window.prompt(
        "This removes every queue session plus all session players, courts, matches, fees, and payment methods. Type CLEAR ALL to continue."
      );

      if (confirmation !== 'CLEAR ALL') {
        toast({ title: "Clear cancelled", description: "Club data was not changed." });
        return;
      }

      try {
        await clearClubData();
        toast({ title: "Club Data Cleared" });
        router.push('/');
      } catch (error) {
        toast({
          title: "Failed to clear club data",
          description: error instanceof Error ? error.message : "Database update failed.",
          variant: "destructive"
        });
      }
    }
  };

  const handleRegenerateCode = async () => {
    try {
      const code = await regenerateQueueSessionCode();
      toast({ title: "Session Code Updated", description: `New code: ${code}` });
    } catch (error) {
      toast({
        title: "Could not update code",
        description: error instanceof Error ? error.message : "Database update failed.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24 max-w-5xl animate-in fade-in duration-500">
      <header className="space-y-1">
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-primary" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">System configuration & branding</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Palette className="h-4 w-4" /> Appearance
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">Customize the theme.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">Dark Mode</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Toggle visual style</p>
                  </div>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-[10px] font-black uppercase opacity-60">Club Logo</Label>
                <div className="flex items-center gap-4 p-4 bg-secondary/10 rounded-xl border-2 border-dashed">
                  <div className="relative h-16 w-16 rounded-lg border bg-white overflow-hidden shadow-sm shrink-0">
                    <NextImage
                      src={clubLogo || tbcLogo.src}
                      alt="Club Logo"
                      fill
                      className="object-cover p-1"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-[9px] font-bold uppercase text-muted-foreground">Upload your club's official branding</p>
                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />
                    <Button size="sm" variant="outline" className="w-full h-8 text-[9px] font-black uppercase" onClick={() => logoInputRef.current?.click()} disabled={isLogoUploading}>
                      {isLogoUploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                      Change Logo
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Trophy className="h-4 w-4" /> Gameplay Rules
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">Define scoring & match behavior.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Default Winning Score</Label>
                <Input
                  type="number"
                  value={defaultWinningScore}
                  onChange={(e) => setDefaultWinningScore(parseInt(e.target.value) || 21)}
                  className="font-black text-lg h-12"
                />
                <p className="text-[9px] text-muted-foreground uppercase font-bold">This score is automatically applied when marking a winner.</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border-2 border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Zap className="h-5 w-5 fill-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">Auto-Advance</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Next match pulls from queue</p>
                  </div>
                </div>
                <Switch checked={autoAdvanceEnabled} onCheckedChange={setAutoAdvanceEnabled} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Default Courts Per Session</Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={defaultCourtCount}
                  onChange={(e) => setDefaultCourtCount(parseInt(e.target.value) || 0)}
                  className="font-black text-lg h-12"
                />
                <p className="text-[9px] text-muted-foreground uppercase font-bold">New sessions will automatically create this many courts.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Queue Session Code
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">Share this code only with players joining today.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border-2 bg-secondary/10 p-5 text-center">
                <p className="text-3xl font-black tracking-widest">{queueSessionCode || 'NO SESSION'}</p>
              </div>
              <Button onClick={handleRegenerateCode} variant="outline" className="w-full font-black uppercase text-[10px]" disabled={!queueSessionCode}>
                Regenerate Code
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm bg-destructive/5 border-destructive/20">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleEndSession} variant="destructive" className="w-full font-black uppercase text-[10px] h-12" disabled={!queueSessionCode}>
                <Power className="h-4 w-4 mr-2" /> End Current Session
              </Button>
              <div className="pt-2 border-t border-dashed">
                <Button onClick={handleResetAction} variant="outline" className="w-full font-black uppercase text-[10px] border-destructive/20 text-destructive hover:bg-destructive/10">
                  <RefreshCcw className="h-3 w-3 mr-2" /> Reset Daily Board
                </Button>
              </div>
              <div className="pt-2 border-t border-dashed">
                <Button onClick={handleClearClubData} variant="outline" className="w-full font-black uppercase text-[10px] border-destructive/20 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3 w-3 mr-2" /> Clear Club Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <QrCode className="h-4 w-4" /> QR Payments
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">Manage payment codes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-60">Account Name</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. GCash"
                    value={newMethodName}
                    onChange={e => setNewMethodName(e.target.value)}
                    className="font-bold text-xs"
                  />
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  <Button size="icon" onClick={triggerFileUpload} disabled={isUploading} className="shrink-0">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                {paymentMethods.map(method => (
                  <div key={method.id} className="relative group border-2 rounded-xl p-2 bg-secondary/10 flex flex-col items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-5 w-5 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => deletePaymentMethod(method.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <div className="relative h-20 w-full border bg-white rounded-lg overflow-hidden mb-1 shadow-inner">
                      <NextImage src={method.imageUrl} alt={method.name} fill className="object-contain p-1" />
                    </div>
                    <span className="font-black text-[9px] uppercase truncate w-full text-center">{method.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}