"use client"

import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"

interface ScanButtonProps {
  onScan: () => void
  isScanning: boolean
}

export function ScanButton({ onScan, isScanning }: ScanButtonProps) {
  return (
    <Button onClick={onScan} disabled={isScanning} className="bg-emerald-600 hover:bg-emerald-700 text-white">
      {isScanning ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Scanning...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Scan for Assets
        </>
      )}
    </Button>
  )
}
