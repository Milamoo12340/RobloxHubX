"use client"

import dynamic from "next/dynamic"

// Dynamically import the FileUploader component with ssr disabled
const FileUploader = dynamic(() => import("./file-uploader"), {
  ssr: false,
})

export function ClientFileUploader() {
  return <FileUploader />
}
