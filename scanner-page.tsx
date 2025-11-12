"use client"

import { ScannerHeader } from "@/components/scanner-header"
import { ClientFileUploader } from "@/components/client-file-uploader"

export default function ScannerPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <div className="container mx-auto">
        <ScannerHeader />
        <ClientFileUploader />
      </div>
    </div>
  )
}
