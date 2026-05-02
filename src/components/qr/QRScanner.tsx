'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, Loader2 } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

interface QRScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (sessionId: string) => void
}

export function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const html5QrCodeRef = useRef<any>(null)

  useEffect(() => {
    if (!isOpen) {
      // Stop scanning when modal is closed
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch((err: any) => {
          console.error('Failed to stop scanner:', err)
        })
        html5QrCodeRef.current = null
      }
      setIsScanning(false)
      setError(null)
      return
    }

    // Only initialize when user explicitly opens the scanner
    const initializeScanner = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const html5QrCode = new Html5Qrcode('qr-reader')
        html5QrCodeRef.current = html5QrCode

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        }

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText: string) => {
            // Extract session ID from URL
            const sessionId = extractSessionId(decodedText)
            if (sessionId) {
              onScan(sessionId)
              html5QrCode.stop()
              html5QrCodeRef.current = null
              setIsScanning(false)
              onClose()
            }
          },
          (errorMessage: string) => {
            // Ignore scanning errors (happens frequently while searching)
            console.debug('QR scan error:', errorMessage)
          }
        )

        setIsScanning(true)
      } catch (err: any) {
        console.error('Scanner initialization error:', err)
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access to scan QR codes.')
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.')
        } else if (err.name === 'NotSupportedError') {
          setError('Camera not supported by this browser.')
        } else {
          setError('Failed to initialize camera. Please try again.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    initializeScanner()

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch((err: any) => {
          console.error('Failed to stop scanner:', err)
        })
      }
    }
  }, [isOpen, onScan, onClose])

  const extractSessionId = (url: string): string | null => {
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/')
      // Extract session ID from /session/{sessionId}
      const sessionIndex = pathParts.indexOf('session')
      if (sessionIndex !== -1 && sessionIndex + 1 < pathParts.length) {
        return pathParts[sessionIndex + 1]
      }
      return null
    } catch {
      return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Camera className="h-4 w-4" /> Scan QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          {/* Scanner container */}
          <div id="qr-reader" className="w-full aspect-square bg-black" />

          {/* Viewfinder overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary" />

                  {/* Scan line animation */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary/80 animate-pulse" />
                </div>
              </div>

              {/* Instructions */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-white text-xs font-bold bg-black/50 px-4 py-2 rounded-full inline-block">
                  Point camera at QR code
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-white mx-auto" />
                <p className="text-white text-xs font-bold">Initializing camera...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
              <Alert variant="destructive" className="max-w-sm">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-background">
          <Button onClick={onClose} variant="outline" className="w-full font-black uppercase text-xs">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
