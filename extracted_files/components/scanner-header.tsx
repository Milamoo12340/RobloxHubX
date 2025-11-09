import { ShieldAlert } from "lucide-react"

export function ScannerHeader() {
  return (
    <header className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-8 w-8 text-red-600" />
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Roblox Asset Leak Scanner</h1>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Protect your Roblox games from unauthorized distribution
        </span>
      </div>
    </header>
  )
}
