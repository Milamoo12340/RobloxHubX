import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Download, Info, User, FileImage, Tag, X, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Leak } from '@shared/schema';

interface LeakDetailViewProps {
  leak: Leak & { file?: any };
  onClose: () => void;
  open: boolean;
}

const LeakDetailView: React.FC<LeakDetailViewProps> = ({ leak, onClose, open }) => {
  if (!leak) return null;

  // Process file data to get preview image URL
  const getPreviewUrl = () => {
    if (!leak.file?.fileData) return null;
    
    // Check if it's already a URL
    if (leak.file.fileData.startsWith('http')) {
      return leak.file.fileData;
    }
    
    // Handle base64 data
    const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const fileType = leak.file.fileType?.toLowerCase();
    
    if (imageTypes.includes(fileType)) {
      // Ensure it has the correct data URL prefix
      if (leak.file.fileData.startsWith('data:')) {
        return leak.file.fileData;
      } else {
        return `data:image/${fileType};base64,${leak.file.fileData}`;
      }
    }
    
    return null;
  };
  
  // Format date for display
  const formatDate = (dateInput: string | Date) => {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return format(date, 'MMMM d, yyyy h:mm a');
    } catch (error) {
      return 'Unknown date';
    }
  };
  
  // Handle download of the leak file
  const handleDownload = () => {
    if (!leak.file) return;
    
    const fileType = leak.file.fileType;
    const fileName = leak.file.filename || `${leak.title}.${fileType}`;
    
    // Create download link for file
    const downloadUrl = getPreviewUrl();
    if (!downloadUrl) return;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Generate metadata report in text format
  const generateTextReport = () => {
    const report = [
      `TITLE: ${leak.title}`,
      `DESCRIPTION: ${leak.description || 'No description'}`,
      `CATEGORY: ${leak.category}`,
      `TYPE: ${leak.leakType}`,
      `DATE: ${formatDate(leak.leakDate)}`,
      `TAGS: ${leak.tags.join(', ')}`,
      `GAME: ${leak.gameName || 'Pet Simulator 99'}`,
      `ASSET ID: ${leak.file?.assetId || 'Unknown'}`,
      `FILE TYPE: ${leak.file?.fileType || 'Unknown'}`,
      `FILE SIZE: ${leak.file?.fileSize ? Math.round(leak.file.fileSize / 1024) + ' KB' : 'Unknown'}`
    ].join('\n');
    
    return report;
  };
  
  // Download report in text format
  const downloadReport = () => {
    const report = generateTextReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${leak.title}-report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const previewUrl = getPreviewUrl();
  const isImage = previewUrl !== null;
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-[#2F3136] border-[#202225] text-white p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Image/File Preview */}
          <div className="bg-[#202225] flex items-center justify-center aspect-square md:aspect-auto md:h-full relative">
            {isImage ? (
              <img 
                src={previewUrl} 
                alt={leak.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <FileImage size={64} className="text-[#4F545C] mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{leak.file?.filename || 'File'}</h3>
                <p className="text-[#B9BBBE]">
                  {leak.file?.fileType?.toUpperCase() || 'Unknown'} file
                  {leak.file?.fileSize && (
                    <span> • {Math.round(leak.file.fileSize / 1024)} KB</span>
                  )}
                </p>
              </div>
            )}
            
            <Badge className="absolute top-3 left-3 bg-[#5865F2]">
              {leak.leakType}
            </Badge>
            
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 bg-[#36393F] text-white p-2 rounded-full hover:bg-[#4F545C]"
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Details */}
          <div className="p-6 flex flex-col h-full">
            <DialogHeader className="mb-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <DialogTitle className="text-2xl font-bold text-white mb-1">{leak.title}</DialogTitle>
                  <DialogDescription className="text-[#B9BBBE]">
                    {leak.description || 'No description provided'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="flex-grow space-y-4">
              {/* Metadata */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-[#B9BBBE]">
                  <Calendar size={16} className="mr-2" />
                  <span>Leaked on {formatDate(leak.leakDate)}</span>
                </div>
                
                <div className="flex items-center text-sm text-[#B9BBBE]">
                  <User size={16} className="mr-2" />
                  <span>From {leak.leakedBy ? `User #${leak.leakedBy}` : 'Auto-Discovery'}</span>
                </div>
                
                {leak.gameName && (
                  <div className="flex items-center text-sm text-[#B9BBBE]">
                    <LinkIcon size={16} className="mr-2" />
                    <span>Game: {leak.gameName}</span>
                  </div>
                )}
                
                {leak.file?.assetId && (
                  <div className="flex items-center text-sm text-[#B9BBBE]">
                    <Info size={16} className="mr-2" />
                    <span>Asset ID: {leak.file.assetId}</span>
                  </div>
                )}
              </div>
              
              {/* Categories and Tags */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <Tag size={16} className="mr-2 text-[#B9BBBE]" />
                  <span className="text-sm font-medium text-[#B9BBBE]">Category:</span>
                  <Badge className="ml-2 bg-[#4F545C]">{leak.category}</Badge>
                </div>
                
                <div>
                  <div className="flex items-center mb-2">
                    <Tag size={16} className="mr-2 text-[#B9BBBE]" />
                    <span className="text-sm font-medium text-[#B9BBBE]">Tags:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {leak.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="bg-[#36393F] border-[#202225] text-[#B9BBBE]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-6 flex gap-2">
              <Button 
                variant="outline" 
                className="bg-transparent border-[#4F545C] text-white hover:bg-[#4F545C]"
                onClick={downloadReport}
              >
                <Download size={16} className="mr-2" />
                Download Report
              </Button>
              
              {leak.file && (
                <Button 
                  className="bg-[#5865F2] hover:bg-[#4752c4] text-white"
                  onClick={handleDownload}
                >
                  <Download size={16} className="mr-2" />
                  Download File
                </Button>
              )}
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeakDetailView;