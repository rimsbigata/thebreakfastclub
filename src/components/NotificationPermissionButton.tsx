"use client"

import { Button } from '@/components/ui/button'
import { useFcmToken } from '@/hooks/useFcmToken'
import { useClub } from '@/context/ClubContext'
import { Bell, BellOff, Loader2 } from 'lucide-react'

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
      <div className="text-sm text-muted-foreground">
        Push notifications are not supported in this browser.
      </div>
    )
  }

  if (permission === 'granted' && token) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <span className="text-green-600 font-bold">✓</span> Notifications enabled
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisableNotifications}
          className="text-muted-foreground"
        >
          <BellOff className="h-4 w-4 mr-2" />
          Disable
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {error && (
        <div className="text-xs text-red-500">{error}</div>
      )}
      <Button
        onClick={handleEnableNotifications}
        disabled={isLoading}
        size="sm"
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
    </div>
  )
}
