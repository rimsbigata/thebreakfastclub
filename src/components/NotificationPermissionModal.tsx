"use client"

import { Button } from '@/components/ui/button'
import { useFcmToken } from '@/hooks/useFcmToken'
import { useClub } from '@/context/ClubContext'
import { Bell, BellOff, Loader2, AlertCircle, ShieldAlert, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface NotificationPermissionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationPermissionModal({ open, onOpenChange }: NotificationPermissionModalProps) {
  const { token, permission, isLoading, error, isSupported, requestPermissionAndGetToken, deleteFcmToken } = useFcmToken()
  const { updateFcmToken } = useClub()

  const handleEnableNotifications = async () => {
    try {
      const fcmToken = await requestPermissionAndGetToken()
      if (fcmToken) {
        await updateFcmToken(fcmToken)
        onOpenChange(false)
      }
    } catch (err) {
      console.error('Failed to enable notifications:', err)
    }
  }

  const handleDisableNotifications = async () => {
    try {
      await deleteFcmToken()
      await updateFcmToken('')
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to disable notifications:', err)
    }
  }

  if (!isSupported) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md border-2 border-orange-500/30 bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-orange-500" />
              Notifications Not Supported
            </DialogTitle>
            <DialogDescription>
              Notifications are not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  if (permission === 'denied') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md border-2 border-red-500/30 bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Notifications Blocked
            </DialogTitle>
            <DialogDescription>
              You have blocked notifications. To enable them, go to your browser settings and allow notifications for this site.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  if (permission === 'granted' && token) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md border-2 border-green-500/30 bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-green-500" />
              Notifications Enabled
            </DialogTitle>
            <DialogDescription>
              You will receive notifications for match updates and court assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleDisableNotifications}
              className="flex-1"
            >
              <BellOff className="h-4 w-4 mr-2" />
              Disable
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2 border-primary/30 bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Enable Notifications
          </DialogTitle>
          <DialogDescription>
            Get notified when you're assigned to a court or when matches are updated. Stay in the game with real-time alerts!
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
