"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

interface SearchBarProps {
  onSearch: (query: string) => void
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Input
        type="text"
        placeholder="Search assets by name, description, or creator..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="bg-zinc-900 border-zinc-800 text-zinc-100 pl-10 h-11"
      />
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
      <Button
        type="submit"
        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 bg-emerald-600 hover:bg-emerald-700"
      >
        Search
      </Button>
    </form>
  )
}
