'use client'

import { QRCode } from 'react-qr-code'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, QrCode } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'

interface QRCodeGeneratorProps {
  sessionId: string
  baseUrl?: string
}

export function QRCodeGenerator({ sessionId, baseUrl }: QRCodeGeneratorProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const qrUrl = `${baseUrl || window.location.origin}/session/${sessionId}/join`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl)
      setCopied(true)
      toast({ title: 'URL copied to clipboard' })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({ title: 'Failed to copy URL', variant: 'destructive' })
    }
  }

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <QrCode className="h-4 w-4" /> Session QR Code
        </CardTitle>
        <CardDescription className="text-[10px] font-bold uppercase">
          Players can scan this to join the session
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {/* High-contrast white container for better scan reliability */}
        <div className="bg-white p-6 rounded-xl border-2 shadow-inner">
          <QRCode
            value={qrUrl}
            size={200}
            level="H"
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
        </div>

        <div className="w-full space-y-2">
          <p className="text-[9px] font-black uppercase text-muted-foreground text-center">
            Session Link
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={qrUrl}
              readOnly
              className="flex-1 text-[10px] font-mono bg-secondary/30 border-2 rounded-md px-3 py-2 truncate"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={handleCopy}
              className="shrink-0 h-9 w-9"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-[9px] text-muted-foreground text-center font-bold">
          Share this QR code with players to quickly join the session
        </p>
      </CardContent>
    </Card>
  )
}
