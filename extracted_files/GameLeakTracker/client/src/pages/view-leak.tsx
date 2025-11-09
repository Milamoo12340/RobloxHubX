import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface LeakViewerProps {
  params?: {
    leakId: string;
  };
}

export default function ViewLeak(props: LeakViewerProps) {
  const [leak, setLeak] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location] = useLocation();
  
  // Extract leak ID from URL params or from location as fallback
  const urlLeakId = props.params?.leakId || location.split('/').pop();
  
  useEffect(() => {
    async function fetchLeak() {
      if (!urlLeakId) {
        setError("No leak ID provided");
        setLoading(false);
        return;
      }
      
      try {
        // Get leak metadata first using the meta parameter
        const response = await fetch(`/api/files/${urlLeakId}?meta=true`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        if (!data) {
          throw new Error('No leak data returned');
        }
        setLeak(data);
      } catch (err) {
        console.error("Error fetching leak:", err);
        setError("Failed to load leak. It may have been removed or doesn't exist.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchLeak();
  }, [urlLeakId]);
  
  // Handle image rendering
  const isImage = leak?.fileName?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);
  
  // Determine if this is a text file that can be displayed
  const isTextFile = leak?.fileName?.match(/\.(txt|json|log|md|csv|js|ts|html|css|xml)$/i);
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Leak Viewer</h1>
        <p className="text-gray-500">View leaked game files securely</p>
      </header>
      
      {loading ? (
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p><strong>Error:</strong> {error}</p>
        </div>
      ) : leak ? (
        <div className="bg-gray-100 rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-800 text-white">
            <h2 className="text-xl font-semibold">{leak.fileName}</h2>
            <div className="flex mt-2 text-sm">
              <span className="mr-4">Type: {leak.fileType}</span>
              <span className="mr-4">Change: {leak.changeType}</span>
              {leak.fileSize && (
                <span>Size: {Math.round(leak.fileSize / 1024)} KB</span>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {isImage ? (
              <div className="flex flex-col items-center">
                <img 
                  src={`/api/files/${urlLeakId}?raw=true`} 
                  alt={leak.fileName}
                  className="max-w-full rounded shadow-lg mb-4" 
                />
                <a 
                  href={`/api/files/${urlLeakId}?download=true`}
                  download={leak.fileName}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Download Image
                </a>
              </div>
            ) : isTextFile ? (
              <div className="flex flex-col">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto mb-4">
                  {leak.textPreview || "Content not available"}
                </pre>
                <a 
                  href={`/api/files/${urlLeakId}?download=true`}
                  download={leak.fileName}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded self-start"
                >
                  Download File
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  <svg className="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <p className="mb-4">This file type cannot be previewed directly in the browser.</p>
                <a 
                  href={`/api/files/${urlLeakId}?download=true`}
                  download={leak.fileName}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Download File
                </a>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-gray-100 border-t">
            <h3 className="font-semibold mb-2">File Information</h3>
            <p><strong>Path:</strong> {leak.filePath}</p>
            <p><strong>Detected:</strong> {new Date(leak.timestamp).toLocaleString()}</p>
            {leak.isDeveloperChange && (
              <p className="mt-2 text-amber-600 font-semibold">
                This is a developer change and may indicate upcoming features.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>No leak found with ID: {urlLeakId}</p>
        </div>
      )}
      
      <div className="mt-4">
        <a href="/dashboard" className="text-blue-500 hover:underline">
          &larr; Back to Dashboard
        </a>
      </div>
    </div>
  );
}