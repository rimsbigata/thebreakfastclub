"use client"

import { Button } from '@/components/ui/button'
import { useFcmToken } from '@/hooks/useFcmToken'
import { useClub } from '@/context/ClubContext'
import { Bell, BellOff, Loader2, AlertCircle, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function NotificationPermissionButton() {
  const { token, permission, isLoading, error, isSupported, requestPermissionAndGetToken, deleteFcmToken } = useFcmToken()
  const { updateFcmToken } = useClub()

  const handleEnableNotifications = async () => {
    try {
      const fcmToken = await requestPermissionAndGetToken()
      if (fcmToken) {
        await updateFcmToken(fcmToken)
      }
    } catch (err) {
      console.error('Failed to enable notifications:', err)
    }
  }

  const handleDisableNotifications = async () => {
    try {
      await deleteFcmToken()
      await updateFcmToken('')
    } catch (err) {
      console.error('Failed to disable notifications:', err)
    }
  }

  if (!isSupported) {
    return (
      <Card className="border-2 border-orange-500/30 bg-orange-500/5">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-4 w-4 text-orange-500" />
            <div className="text-xs">
              <span className="font-bold text-orange-700 dark:text-orange-500">Notifications not supported</span>
              <span className="text-muted-foreground ml-1">in this browser</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (permission === 'denied') {
    return (
      <Card className="border-2 border-red-500/30 bg-red-500/5">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div className="text-xs">
                <span className="font-bold text-red-700 dark:text-red-500">Notifications blocked</span>
                <span className="text-muted-foreground ml-1">- enable in browser settings</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (permission === 'granted' && token) {
    return (
      <Card className="border-2 border-green-500/30 bg-green-500/5">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-green-500" />
              <div className="text-xs">
                <span className="font-bold text-green-700 dark:text-green-500">✓ Notifications enabled</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisableNotifications}
              className="text-muted-foreground h-7 text-xs"
            >
              <BellOff className="h-3 w-3 mr-1" />
              Disable
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          {error && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3 w-3 text-red-500" />
              <div className="text-xs text-red-500">{error}</div>
            </div>
          )}
          <div className="flex-1 flex items-center justify-end gap-2">
            <div className="text-xs">
              <span className="font-bold text-primary">Enable notifications</span>
              <span className="text-muted-foreground ml-1">to get match alerts</span>
            </div>
            <Button
              onClick={handleEnableNotifications}
              disabled={isLoading}
              size="sm"
              className="h-7 text-xs font-black uppercase"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Bell className="h-3 w-3 mr-1" />
                  Enable
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
