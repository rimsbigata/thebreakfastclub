"use client";

import { useState, useRef } from 'react';
import { useClub } from '@/context/ClubContext';
import { PaymentMethod } from '@/lib/types';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCcw, Trash2, QrCode, Upload, Loader2, Sun, Moon, Palette, Settings as SettingsIcon, Trophy, Zap, KeyRound, Power, Target, Coffee, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import tbcLogo from '@/assets/images/tbc_logo_loading.png';
import { sendBoostCodeEmail } from '@/app/actions/email';
import { sendMatchNotification } from '@/app/actions/notifications';
import { useUser } from '@/firebase';
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator';
import { processAndUploadPaymentQR, processAndUploadClubLogo } from '@/lib/imageUpload';

export default function SettingsPage({ params }: { params: { id: string } }) {
  const {
    paymentMethods, addPaymentMethod, deletePaymentMethod, resetDailyBoard,
    endSession, setClubLogo, clubLogo, defaultWinningScore, setDefaultWinningScore,
    autoAdvanceEnabled, setAutoAdvanceEnabled, queueSessionCode, regenerateQueueSessionCode,
    defaultCourtCount, setDefaultCourtCount, deuceEnabled, setDeuceEnabled,
    autoRestEnabled, setAutoRestEnabled,
    boostSchedules, addBoostSchedule, deleteBoostSchedule, upcomingBoost, clearClubData,
    sendTestNotification, players
  } = useClub();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [newMethodName, setNewMethodName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isClearingClubData, setIsClearingClubData] = useState(false);
  const [isTestingNotifications, setIsTestingNotifications] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [isTestingPlayerNotification, setIsTestingPlayerNotification] = useState(false);
  const [newBoostDate, setNewBoostDate] = useState('');
  const [newBoostVenue, setNewBoostVenue] = useState('');
  const [newBoostTime, setNewBoostTime] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      try {
        const paymentMethodId = Math.random().toString(36).substr(2, 9);
        const imageUrl = await processAndUploadPaymentQR(e.target.files[0], paymentMethodId);
        addPaymentMethod(newMethodName || 'Unnamed QR', imageUrl);
        setNewMethodName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast({ title: "QR Method Added" });
      } catch (error) {
        toast({ 
          title: "Upload failed", 
          description: error instanceof Error ? error.message : "Failed to upload QR code",
          variant: "destructive" 
        });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsLogoUploading(true);
      try {
        const imageUrl = await processAndUploadClubLogo(e.target.files[0]);
        setClubLogo(imageUrl);
        if (logoInputRef.current) logoInputRef.current.value = '';
        toast({ title: "Club Logo Updated" });
      } catch (error) {
        toast({ 
          title: "Upload failed", 
          description: error instanceof Error ? error.message : "Failed to upload logo",
          variant: "destructive" 
        });
      } finally {
        setIsLogoUploading(false);
      }
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
        router.push('/auth/session');
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

      setIsClearingClubData(true);
      try {
        await clearClubData();
        toast({ title: "Club Data Cleared" });
        router.push('/auth/session');
      } catch (error) {
        toast({
          title: "Failed to clear club data",
          description: error instanceof Error ? error.message : "Database update failed.",
          variant: "destructive"
        });
      } finally {
        setIsClearingClubData(false);
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

  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleAddBoostSchedule = async () => {
    if (!newBoostDate) {
      toast({ title: "Missing date", description: "Please select a date for the boost schedule.", variant: "destructive" });
      return;
    }
    setIsSendingEmail(true);
    try {
      const { sessionCode, sessionId } = await addBoostSchedule(newBoostDate, newBoostVenue, newBoostTime);
      const sessionLink = `${window.location.origin}/session/${sessionId}`;
      toast({
        title: "Boost Schedule Added",
        description: `Session Code: ${sessionCode} - Session Link: ${sessionLink}`
      });

      try {
        const adminEmail = user?.email;
        if (!adminEmail) {
          console.warn('No admin email found, skipping email notification');
        } else {
          sendBoostCodeEmail(sessionCode, newBoostDate, sessionLink, adminEmail)
            .then(emailResult => {
              if (emailResult.success) {
                console.log('Email notification sent successfully');
              } else {
                console.error('Email sending failed:', emailResult.message);
              }
            })
            .catch(emailError => {
              console.error('Failed to send email notification:', emailError);
            });
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      setNewBoostDate('');
      setNewBoostVenue('');
      setNewBoostTime('');
    } catch (error) {
      toast({
        title: "Could not add boost schedule",
        description: error instanceof Error ? error.message : "Database update failed.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDeleteBoostSchedule = async (id: string) => {
    try {
      await deleteBoostSchedule(id);
      toast({ title: "Boost Schedule Removed" });
    } catch (error) {
      toast({
        title: "Could not remove boost schedule",
        description: error instanceof Error ? error.message : "Database update failed.",
        variant: "destructive"
      });
    }
  };

  const handleTestNotifications = async () => {
    setIsTestingNotifications(true);
    try {
      await sendTestNotification();
      toast({ title: "Test Sent", description: "If permissions are granted, you should see a notification shortly." });
    } catch (err) {
      toast({ title: "Test Failed", description: "Could not send notification. Check your settings.", variant: "destructive" });
    } finally {
      setIsTestingNotifications(false);
    }
  };

  const handleTestPlayerNotification = async () => {
    if (!selectedPlayerId) {
      toast({ title: "Select a player", description: "Please select a player to send the test notification to.", variant: "destructive" });
      return;
    }
    setIsTestingPlayerNotification(true);
    try {
      const sessionId = params.id;
      const result = await sendMatchNotification(selectedPlayerId, sessionId, 'Test Notification', 'This is a test notification from the settings page.');
      if (result.success) {
        toast({ title: "Test Sent", description: "Notification sent to selected player." });
      } else {
        toast({ title: "Test Failed", description: result.error || "Could not send notification.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Test Failed", description: "Could not send notification. Check your settings.", variant: "destructive" });
    } finally {
      setIsTestingPlayerNotification(false);
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
                      sizes="64px"
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

              <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border-2">
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

              <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Coffee className="h-5 w-5 fill-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">Auto-Rest after Match</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Players move to Resting on finish</p>
                  </div>
                </div>
                <Switch checked={autoRestEnabled} onCheckedChange={setAutoRestEnabled} />
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Target className="h-5 w-5 fill-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">Deuce Rule</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Must win by 2 points at deuce</p>
                  </div>
                </div>
                <Switch checked={deuceEnabled} onCheckedChange={setDeuceEnabled} />
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

          {queueSessionCode && (
            <QRCodeGenerator sessionId={queueSessionCode} />
          )}

          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Target className="h-4 w-4" /> Double Star Boost Scheduler
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">Create a Double Star Boost session for a specific date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Venue Name</Label>
                  <Input
                    value={newBoostVenue}
                    onChange={(e) => setNewBoostVenue(e.target.value)}
                    placeholder="e.g. Badminton Center A"
                    className="font-black text-sm h-10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Date</Label>
                    <DatePicker
                      value={newBoostDate}
                      onChange={setNewBoostDate}
                      placeholder="Select date"
                      className="font-black text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Time</Label>
                    <Input
                      type="time"
                      value={newBoostTime}
                      onChange={(e) => setNewBoostTime(e.target.value)}
                      className="font-black text-sm h-10"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddBoostSchedule}
                  className="w-full font-black uppercase text-[10px] h-10"
                  disabled={isSendingEmail}
                >
                  {isSendingEmail ? (
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  ) : (
                    <Target className="h-3 w-3 mr-2" />
                  )}
                  {isSendingEmail ? "Saving & Notifying..." : "Add Boost Schedule"}
                </Button>
              </div>

              {boostSchedules.length > 0 && (
                <div className="pt-4 border-t space-y-2">
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Scheduled Boosts</p>
                  {boostSchedules.map((boost) => (
                    <div key={boost.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border">
                      <div className="flex-1">
                        <a href={`/session/${boost.sessionId}`} className="text-xs font-black text-primary hover:underline">
                          Session Link
                        </a>
                        {boost.venueName && (
                          <p className="text-[9px] text-muted-foreground font-bold">{boost.venueName}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] text-muted-foreground font-bold">{boost.date}</p>
                          {boost.scheduledTime && (
                            <p className="text-[9px] text-muted-foreground font-bold">{boost.scheduledTime}</p>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-[8px] font-black uppercase text-primary">Code:</span>
                          <span className="text-xs font-mono font-bold text-primary">{boost.sessionCode}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDeleteBoostSchedule(boost.id)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
                <Button onClick={handleClearClubData} variant="outline" className="w-full font-black uppercase text-[10px] border-destructive/20 text-destructive hover:bg-destructive/10" disabled={isClearingClubData}>
                  {isClearingClubData ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Trash2 className="h-3 w-3 mr-2" />} Clear Club Data
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
                {paymentMethods.map((method: PaymentMethod) => (
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
                      <NextImage src={method.imageUrl} alt={method.name} fill sizes="80px" className="object-contain p-1" />
                    </div>
                    <span className="font-black text-[9px] uppercase truncate w-full text-center">{method.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Bell className="h-4 w-4" /> Notification System
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">Verify browser alerts are working.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-secondary/10 rounded-xl border-2 border-dashed">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-4">
                  Send a test alert to your browser to confirm setup.
                </p>
                <Button 
                  onClick={handleTestNotifications} 
                  disabled={isTestingNotifications}
                  variant="outline" 
                  className="w-full h-10 font-black uppercase text-[10px] border-2"
                >
                  {isTestingNotifications ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Bell className="h-3 w-3 mr-2" />}
                  Send Test to Yourself
                </Button>
              </div>
              {players && players.length > 0 && (
                <div className="p-4 bg-secondary/10 rounded-xl border-2 border-dashed">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-4">
                    Send a test notification to a specific player (works in production).
                  </p>
                  <div className="space-y-3">
                    <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                      <SelectTrigger className="h-10 text-[10px] font-black uppercase border-2">
                        <SelectValue placeholder="Select a player" />
                      </SelectTrigger>
                      <SelectContent>
                        {players.map((player) => (
                          <SelectItem key={player.id} value={player.id} className="text-[10px] font-bold uppercase">
                            {player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleTestPlayerNotification} 
                      disabled={isTestingPlayerNotification || !selectedPlayerId}
                      variant="outline" 
                      className="w-full h-10 font-black uppercase text-[10px] border-2"
                    >
                      {isTestingPlayerNotification ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Bell className="h-3 w-3 mr-2" />}
                      Send Test to Player
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
