import dynamic from "next/dynamic"

// Import the scanner page with client-side only rendering
const ScannerPage = dynamic(() => import("./scanner-page"), {
  ssr: false,
})

export default function HomePage() {
  return <ScannerPage />
}
