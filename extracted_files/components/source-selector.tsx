"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Source } from "@/lib/types"
import { Plus } from "lucide-react"

interface SourceSelectorProps {
  sources: Source[]
  onChange: (sources: Source[]) => void
}

export function SourceSelector({ sources, onChange }: SourceSelectorProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newSourceType, setNewSourceType] = useState<"developer" | "group" | "game" | "keyword">("developer")
  const [newSourceValue, setNewSourceValue] = useState("")
  const [newSourceName, setNewSourceName] = useState("")

  const handleToggleSource = (sourceId: string, checked: boolean) => {
    const updatedSources = sources.map((source) => (source.id === sourceId ? { ...source, enabled: checked } : source))
    onChange(updatedSources)
  }

  const handleAddSource = () => {
    if (!newSourceValue || !newSourceName) return

    const newSource: Source = {
      id: Date.now().toString(),
      type: newSourceType,
      value: newSourceValue,
      name: newSourceName,
      enabled: true,
    }

    onChange([...sources, newSource])

    // Reset form
    setNewSourceType("developer")
    setNewSourceValue("")
    setNewSourceName("")
    setIsAdding(false)
  }

  const handleRemoveSource = (sourceId: string) => {
    const updatedSources = sources.filter((source) => source.id !== sourceId)
    onChange(updatedSources)
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
      <CardHeader>
        <CardTitle className="text-lg">Tracking Sources</CardTitle>
        <CardDescription className="text-zinc-400">Select which sources to monitor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {sources.map((source) => (
            <div key={source.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`source-${source.id}`}
                  checked={source.enabled !== false}
                  onCheckedChange={(checked) => handleToggleSource(source.id, checked as boolean)}
                />
                <label
                  htmlFor={`source-${source.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {source.name}
                </label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveSource(source.id)}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100"
              >
                ×
              </Button>
            </div>
          ))}
        </div>

        {isAdding ? (
          <div className="space-y-3 pt-2">
            <Select value={newSourceType} onValueChange={(value) => setNewSourceType(value as any)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Source Type" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="group">Group</SelectItem>
                <SelectItem value="game">Game</SelectItem>
                <SelectItem value="keyword">Keyword</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder={newSourceType === "keyword" ? "Enter keyword" : `Enter ${newSourceType} ID`}
              value={newSourceValue}
              onChange={(e) => setNewSourceValue(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />

            <Input
              placeholder="Display name"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />

            <div className="flex gap-2">
              <Button onClick={handleAddSource} className="bg-emerald-600 hover:bg-emerald-700">
                Add
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
