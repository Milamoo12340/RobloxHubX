import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Download, Search, Filter, Tag, X, FileImage } from "lucide-react";
import { Leak } from "@shared/schema";
import LeakDetailView from "@/components/LeakDetailView";
import { format } from 'date-fns';

interface LeaksGalleryProps {
  // Props if needed
}

const LeaksGallery: React.FC<LeaksGalleryProps> = () => {
  // Query all leaks
  const { data: leaksData, isLoading, error } = useQuery({
    queryKey: ['/api/leaks'],
    staleTime: 1000 * 60, // 1 minute
  });
  
  // States for filtering and viewing
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedDetailLeak, setSelectedDetailLeak] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Extract all available categories and types
  const categories = leaksData?.leaks && Array.isArray(leaksData.leaks)
    ? Array.from(new Set(leaksData.leaks.map((leak: Leak) => leak.category)))
    : [];
    
  const types = leaksData?.leaks && Array.isArray(leaksData.leaks)
    ? Array.from(new Set(leaksData.leaks.map((leak: Leak) => leak.leakType)))
    : [];
  
  // Filter leaks based on search and filters
  const filteredLeaks = leaksData?.leaks && Array.isArray(leaksData.leaks)
    ? leaksData.leaks.filter((leak: Leak) => {
        const matchesSearch = searchQuery === '' || 
          leak.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (leak.description && leak.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          leak.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
          
        const matchesCategory = selectedCategory === '' || leak.category === selectedCategory;
        const matchesType = selectedType === '' || leak.leakType === selectedType;
        
        return matchesSearch && matchesCategory && matchesType;
      })
    : [];
  
  // Process file data to get preview image URL
  const getPreviewUrl = (leak: any) => {
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
  
  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedType('');
  };
  
  // View leak details
  const viewLeakDetails = (leak: any) => {
    setSelectedDetailLeak(leak);
  };
  
  // Close leak details
  const closeLeakDetails = () => {
    setSelectedDetailLeak(null);
  };
  
  // Format date for display
  const formatDate = (dateInput: string | Date) => {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Unknown date';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-white">Pet Simulator 99 Leaks Gallery</h1>
      
      {/* Filters and search section */}
      <div className="bg-[#2F3136] p-4 rounded-lg mb-6 border border-[#202225]">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#B9BBBE]" size={18} />
            <Input
              placeholder="Search leaks by title, description or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#36393F] border-[#202225] text-white"
            />
            {searchQuery && (
              <button 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#B9BBBE] hover:text-white"
                onClick={() => setSearchQuery('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-36 bg-[#36393F] border-[#202225] text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-[#36393F] border-[#202225] text-white">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category, index) => (
                  <SelectItem key={index} value={category || `category-${index}`}>{category || "Unknown"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-36 bg-[#36393F] border-[#202225] text-white">
                <SelectValue placeholder="Asset Type" />
              </SelectTrigger>
              <SelectContent className="bg-[#36393F] border-[#202225] text-white">
                <SelectItem value="all">All Types</SelectItem>
                {types.map((type, index) => (
                  <SelectItem key={index} value={type || `type-${index}`}>{type || "Unknown"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline"
              size="icon"
              onClick={clearFilters}
              className="bg-transparent border-[#202225] text-[#B9BBBE] hover:text-white hover:bg-[#4F545C]"
              title="Clear filters"
            >
              <Filter size={16} />
            </Button>
            
            <div className="flex border border-[#202225] rounded-md overflow-hidden">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-[#5865F2] text-white' : 'bg-[#36393F] text-[#B9BBBE]'}
              >
                Grid
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-[#5865F2] text-white' : 'bg-[#36393F] text-[#B9BBBE]'}
              >
                List
              </Button>
            </div>
          </div>
        </div>
        
        {/* Active filters display */}
        {(searchQuery || selectedCategory || selectedType) && (
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <span className="text-sm text-[#B9BBBE]">Active filters:</span>
            
            {searchQuery && (
              <Badge variant="outline" className="bg-[#4F545C] text-white border-[#202225] flex items-center gap-1">
                Search: {searchQuery}
                <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-gray-300">
                  <X size={14} />
                </button>
              </Badge>
            )}
            
            {selectedCategory && (
              <Badge variant="outline" className="bg-[#4F545C] text-white border-[#202225] flex items-center gap-1">
                Category: {selectedCategory}
                <button onClick={() => setSelectedCategory('')} className="ml-1 hover:text-gray-300">
                  <X size={14} />
                </button>
              </Badge>
            )}
            
            {selectedType && (
              <Badge variant="outline" className="bg-[#4F545C] text-white border-[#202225] flex items-center gap-1">
                Type: {selectedType}
                <button onClick={() => setSelectedType('')} className="ml-1 hover:text-gray-300">
                  <X size={14} />
                </button>
              </Badge>
            )}
            
            <Button 
              variant="link" 
              size="sm"
              onClick={clearFilters}
              className="text-[#B9BBBE] hover:text-white p-0 h-auto"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>
      
      {/* Results display */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">
          {filteredLeaks?.length || 0} {filteredLeaks?.length === 1 ? 'Leak' : 'Leaks'} Found
        </h2>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5865F2]"></div>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg">
          <p>Error loading leaks. Please try again later.</p>
        </div>
      )}
      
      {/* No results state */}
      {!isLoading && filteredLeaks?.length === 0 && (
        <div className="bg-[#2F3136] border border-[#202225] rounded-lg p-8 text-center">
          <FileImage size={48} className="mx-auto mb-4 text-[#B9BBBE] opacity-50" />
          <h3 className="text-xl font-semibold text-white mb-2">No leaks found</h3>
          <p className="text-[#B9BBBE] mb-4">
            {searchQuery || selectedCategory || selectedType
              ? "No leaks match your current filters. Try adjusting your search criteria."
              : "No leaks have been found or uploaded yet. Check back later."}
          </p>
          {(searchQuery || selectedCategory || selectedType) && (
            <Button onClick={clearFilters} variant="outline" className="bg-transparent border-[#4F545C] text-white hover:bg-[#4F545C]">
              Clear Filters
            </Button>
          )}
        </div>
      )}
      
      {/* Grid view */}
      {viewMode === 'grid' && filteredLeaks?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLeaks.map((leak: any) => {
            const previewUrl = getPreviewUrl(leak);
            
            return (
              <Card 
                key={leak.id} 
                className="bg-[#2F3136] border-[#202225] hover:border-[#5865F2] transition-all cursor-pointer overflow-hidden flex flex-col"
                onClick={() => viewLeakDetails(leak)}
              >
                <div className="aspect-square bg-[#202225] relative overflow-hidden">
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt={leak.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-4">
                      <FileImage size={48} className="text-[#4F545C] mb-2" />
                      <p className="text-sm text-[#B9BBBE] text-center">No preview available</p>
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2 bg-[#5865F2]">
                    {leak.leakType}
                  </Badge>
                </div>
                
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-lg text-white line-clamp-1">{leak.title}</CardTitle>
                </CardHeader>
                
                <CardContent className="py-0">
                  {leak.description && (
                    <CardDescription className="text-[#B9BBBE] line-clamp-2 mb-2">
                      {leak.description}
                    </CardDescription>
                  )}
                  <div className="flex items-center text-sm text-[#B9BBBE] mb-2">
                    <Calendar size={14} className="mr-1" />
                    {formatDate(leak.leakDate)}
                  </div>
                </CardContent>
                
                <CardFooter className="pt-0 mt-auto">
                  <div className="flex flex-wrap gap-1 mt-2">
                    {leak.tags.slice(0, 3).map((tag: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-[#36393F] border-[#202225] text-[#B9BBBE]">
                        {tag}
                      </Badge>
                    ))}
                    {leak.tags.length > 3 && (
                      <Badge variant="outline" className="bg-[#36393F] border-[#202225] text-[#B9BBBE]">
                        +{leak.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* List view */}
      {viewMode === 'list' && filteredLeaks?.length > 0 && (
        <div className="space-y-3">
          {filteredLeaks.map((leak: any) => {
            const previewUrl = getPreviewUrl(leak);
            
            return (
              <Card 
                key={leak.id} 
                className="bg-[#2F3136] border-[#202225] hover:border-[#5865F2] transition-all cursor-pointer"
                onClick={() => viewLeakDetails(leak)}
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-24 md:w-36 h-24 bg-[#202225] relative overflow-hidden flex-shrink-0">
                    {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt={leak.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <FileImage size={24} className="text-[#4F545C]" />
                      </div>
                    )}
                    <Badge className="absolute top-1 left-1 bg-[#5865F2] text-xs">
                      {leak.leakType}
                    </Badge>
                  </div>
                  
                  <div className="p-4 flex-grow">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-white">{leak.title}</h3>
                      <div className="flex items-center text-xs text-[#B9BBBE]">
                        <Calendar size={12} className="mr-1" />
                        {formatDate(leak.leakDate)}
                      </div>
                    </div>
                    
                    {leak.description && (
                      <p className="text-sm text-[#B9BBBE] line-clamp-1 mt-1">
                        {leak.description}
                      </p>
                    )}
                    
                    <div className="flex justify-between items-end mt-2">
                      <div className="flex flex-wrap gap-1">
                        {leak.tags.slice(0, 3).map((tag: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-[#36393F] border-[#202225] text-[#B9BBBE]">
                            {tag}
                          </Badge>
                        ))}
                        {leak.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-[#36393F] border-[#202225] text-[#B9BBBE]">
                            +{leak.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-xs text-[#B9BBBE]">
                        {leak.category}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Leak detail modal */}
      {selectedDetailLeak && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <LeakDetailView leak={selectedDetailLeak} onClose={closeLeakDetails} open={!!selectedDetailLeak} />
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaksGallery;