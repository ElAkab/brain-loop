'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Settings, User, LogOut, FolderTree, Crown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SheetClose } from '@/components/ui/sheet';
import { signOut } from '@/lib/auth/actions';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/categories', label: 'Categories', icon: FolderTree },
  { href: '/payment', label: 'Upgrade', icon: Crown },
  { href: '/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/profile', label: 'Profile', icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="flex flex-col h-full">
      <div className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <SheetClose key={item.href} asChild>
              <Link href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="w-full justify-start cursor-pointer"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            </SheetClose>
          );
        })}
      </div>

      <Separator />

      <div className="p-4">
        <SheetClose asChild>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </SheetClose>
      </div>
    </nav>
  );
}
