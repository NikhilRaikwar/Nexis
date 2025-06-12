import React from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UserDropdown: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 p-1 rounded-full hover:bg-white/10 transition-colors">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.picture} alt={user.name || 'User'} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user.name ? getInitials(user.name) : <UserIcon className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 glass border-white/10 bg-black/80 backdrop-blur-xl"
      >
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-white">
            {user.name || 'User'}
          </p>
          <p className="text-xs text-gray-400">
            {user.email || 'No email provided'}
          </p>
        </div>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};