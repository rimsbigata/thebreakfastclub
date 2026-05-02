'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useFirebase } from '@/firebase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Bell, Moon } from 'lucide-react'

interface NotificationPreferences {
  enabled: boolean
  quietStart?: string
  quietEnd?: string
}

interface NotificationSettingsProps {
  userId: string
  initialPreferences?: NotificationPreferences
}

export function NotificationSettings({ userId, initialPreferences }: NotificationSettingsProps) {
  const { firestore } = useFirebase()
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    initialPreferences || { enabled: true }
  )
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (!initialPreferences && userId && firestore) {
      // Fetch current preferences from Firestore
      const fetchPreferences = async () => {
        try {
          const userDoc = await getDoc(doc(firestore, 'users', userId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setPreferences(userData.preferences || { enabled: true })
          }
        } catch (error) {
          console.error('Failed to fetch notification preferences:', error)
        }
      }
      fetchPreferences()
    }
  }, [userId, firestore, initialPreferences])

  const handleSave = async () => {
    if (!userId || !firestore) return

    setIsLoading(true)
    setSaveStatus('saving')

    try {
      await updateDoc(doc(firestore, 'users', userId), {
        preferences: preferences.enabled ? {
          enabled: preferences.enabled,
          quietStart: preferences.quietStart || undefined,
          quietEnd: preferences.quietEnd || undefined,
        } : {
          enabled: false,
        },
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleChange = (checked: boolean) => {
    setPreferences({ ...preferences, enabled: checked })
  }

  const handleTimeChange = (field: 'quietStart' | 'quietEnd', value: string) => {
    setPreferences({ ...preferences, [field]: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Configure when you receive match assignment notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="enable-notifications">Enable Match Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications when you're assigned to a court
            </p>
          </div>
          <Switch
            id="enable-notifications"
            checked={preferences.enabled}
            onCheckedChange={handleToggleChange}
          />
        </div>

        {/* Quiet Hours Section */}
        {preferences.enabled && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Quiet Hours</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Disable notifications during specific hours (e.g., 22:00 - 08:00)
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={preferences.quietStart || ''}
                  onChange={(e) => handleTimeChange('quietStart', e.target.value)}
                  placeholder="22:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={preferences.quietEnd || ''}
                  onChange={(e) => handleTimeChange('quietEnd', e.target.value)}
                  placeholder="08:00"
                />
              </div>
            </div>

            {(preferences.quietStart || preferences.quietEnd) && (
              <p className="text-xs text-muted-foreground">
                Quiet hours: {preferences.quietStart || 'Not set'} to {preferences.quietEnd || 'Not set'}
              </p>
            )}
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {saveStatus === 'saved' && (
              <span className="text-green-600">Settings saved successfully</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-600">Failed to save settings</span>
            )}
          </span>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
