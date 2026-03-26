'use client';

/**
 * Header Component
 * Main navigation header with glassmorphism design
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { 
  Menu, 
  X, 
  User, 
  Settings, 
  LogOut, 
  PenSquare,
  LayoutDashboard,
  Search,
  TrendingUp
} from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/blog', label: 'Blog' },
  { href: '/categories', label: 'Categories' },
  { href: '/trending', label: 'Trending' },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass border-b border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center"
              >
                <span className="text-white font-bold text-sm">B</span>
              </motion.div>
              <span className="font-bold text-lg gradient-text hidden sm:inline">
                BlogHub
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === link.href
                      ? 'text-white bg-white/10'
                      : 'text-muted-foreground hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                <Search className="h-5 w-5" />
              </Button>

              {isAuthenticated ? (
                <>
                  {/* Write Button */}
                  <Button
                    asChild
                    className="hidden sm:flex bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0"
                  >
                    <Link href="/dashboard/write">
                      <PenSquare className="h-4 w-4 mr-2" />
                      Write
                    </Link>
                  </Button>

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                        <Avatar className="h-9 w-9 border-2 border-white/10">
                          <AvatarImage src={user?.avatarUrl || ''} alt={user?.username || ''} />
                          <AvatarFallback className="bg-gradient-to-br from-violet-600 to-cyan-600 text-white">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 glass-card" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">{user?.displayName || user?.username}</p>
                          <p className="text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem asChild className="focus:bg-white/10">
                        <Link href="/dashboard">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="focus:bg-white/10">
                        <Link href="/dashboard/posts">
                          <PenSquare className="mr-2 h-4 w-4" />
                          My Posts
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="focus:bg-white/10">
                        <Link href="/dashboard/settings">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem asChild className="focus:bg-white/10">
                            <Link href="/admin">
                              <User className="mr-2 h-4 w-4" />
                              Admin Panel
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem 
                        onClick={logout}
                        className="text-red-400 focus:bg-white/10 focus:text-red-400"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" asChild className="hidden sm:inline-flex text-muted-foreground hover:text-white">
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button 
                    asChild
                    className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0"
                  >
                    <Link href="/register">Get Started</Link>
                  </Button>
                </div>
              )}

              {/* Mobile Menu */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="glass-card w-80 border-l-white/10">
                  <div className="flex flex-col gap-6 mt-8">
                    <nav className="flex flex-col gap-1">
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsOpen(false)}
                          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                            pathname === link.href
                              ? 'text-white bg-white/10'
                              : 'text-muted-foreground hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </nav>
                    
                    {isAuthenticated ? (
                      <div className="flex flex-col gap-2">
                        <Button asChild className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white">
                          <Link href="/dashboard/write" onClick={() => setIsOpen(false)}>
                            <PenSquare className="h-4 w-4 mr-2" />
                            Write New Post
                          </Link>
                        </Button>
                        <Button variant="outline" asChild className="border-white/10">
                          <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                            Dashboard
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => { logout(); setIsOpen(false); }}
                          className="text-red-400 hover:text-red-400 hover:bg-white/5"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Log out
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Button asChild className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white">
                          <Link href="/register" onClick={() => setIsOpen(false)}>
                            Get Started
                          </Link>
                        </Button>
                        <Button variant="outline" asChild className="border-white/10">
                          <Link href="/login" onClick={() => setIsOpen(false)}>
                            Sign In
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
