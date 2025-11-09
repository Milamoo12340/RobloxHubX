import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Menu, X, FileImage, Home, Bot, MessageSquare } from 'lucide-react';

const Navbar: React.FC = () => {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };
  
  const navItems = [
    { path: '/', label: 'Home', icon: <Home size={18} /> },
    { path: '/discord', label: 'Discord Bot', icon: <MessageSquare size={18} /> },
    { path: '/leaks', label: 'Leaks Gallery', icon: <FileImage size={18} /> }
  ];

  return (
    <nav className="bg-[#2F3136] border-b border-[#202225] sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Bot size={24} className="text-[#5865F2]" />
              <span className="font-bold text-white text-xl">PS99 Leaks</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={location === item.path ? 'default' : 'ghost'}
                  className={location === item.path 
                    ? 'bg-[#5865F2] text-white hover:bg-[#4752c4]' 
                    : 'text-[#B9BBBE] hover:text-white hover:bg-[#36393F]'
                  }
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    {item.label}
                  </div>
                </Button>
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              className="text-[#B9BBBE] hover:text-white hover:bg-[#36393F]"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#36393F] border-b border-[#202225]">
          <div className="container mx-auto px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={location === item.path ? 'default' : 'ghost'}
                  className={`w-full justify-start ${location === item.path 
                    ? 'bg-[#5865F2] text-white hover:bg-[#4752c4]' 
                    : 'text-[#B9BBBE] hover:text-white hover:bg-[#36393F]'
                  }`}
                  onClick={closeMenu}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    {item.label}
                  </div>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;