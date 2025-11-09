import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Roblox Asset Leaks Discord Bot</h1>
          <p className="text-xl text-gray-600">Share and discover Roblox game files, assets, and leaks through Discord.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-upload mr-2 text-blue-500"></i>
                Upload Game Files
              </CardTitle>
              <CardDescription>Share Roblox game assets and files easily with the community.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                The bot allows you to upload various Roblox file formats including:
              </p>
              <ul className="list-disc ml-6 mt-2 text-gray-600">
                <li>Roblox Models (.rbxm)</li>
                <li>Roblox Places (.rbxl)</li>
                <li>Scripts (.lua)</li>
                <li>Images (.png, .jpg)</li>
                <li>3D Models (.obj, .fbx)</li>
                <li>And more!</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-search mr-2 text-indigo-500"></i>
                Discover Leaks
              </CardTitle>
              <CardDescription>Find and categorize leaked content from Roblox games.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                Search through a comprehensive database of leaked content with:
              </p>
              <ul className="list-disc ml-6 mt-2 text-gray-600">
                <li>Advanced search by keywords</li>
                <li>Category filtering</li>
                <li>Tag-based organization</li>
                <li>Game-specific collections</li>
                <li>Automatic content categorization</li>
              </ul>
            </CardContent>
          </Card>
        </div>
        
        <Separator className="my-8" />
        
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Bot Commands</h2>
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium">Available Commands</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex">
                  <code className="bg-gray-100 px-2 py-1 rounded text-pink-600 mr-2">/upload</code>
                  <span className="text-gray-700">Upload Roblox game files</span>
                </div>
                <div className="flex">
                  <code className="bg-gray-100 px-2 py-1 rounded text-pink-600 mr-2">/leak</code>
                  <span className="text-gray-700">Share leaked content in channels</span>
                </div>
                <div className="flex">
                  <code className="bg-gray-100 px-2 py-1 rounded text-pink-600 mr-2">/search</code>
                  <span className="text-gray-700">Find specific leaks</span>
                </div>
                <div className="flex">
                  <code className="bg-gray-100 px-2 py-1 rounded text-pink-600 mr-2">/categorize</code>
                  <span className="text-gray-700">Categorize uploaded content</span>
                </div>
                <div className="flex">
                  <code className="bg-gray-100 px-2 py-1 rounded text-pink-600 mr-2">/help</code>
                  <span className="text-gray-700">Display help message</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Try the Bot Interface Demo</CardTitle>
            <CardDescription>
              Experience how the Discord bot works with our interactive demo interface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              Our demo simulates the Discord interface to show you exactly how the bot functions. 
              You can try commands, upload files, and see how content is displayed.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/discord">
              <Button className="w-full bg-[#5865F2] hover:bg-[#4752c4]">
                <i className="fab fa-discord mr-2"></i>
                Try Discord Bot Demo
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <div className="text-center text-gray-500 text-sm">
          <p>Note: This is a demonstration of how the bot would function when integrated with Discord.</p>
          <p>The actual bot requires Discord API integration with a valid bot token.</p>
        </div>
      </div>
    </div>
  );
}
