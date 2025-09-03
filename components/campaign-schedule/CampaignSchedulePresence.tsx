import React, { useEffect } from 'react';
import { useCampaignSchedulePresence } from '@/hooks/useCampaignSchedulePresence';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, User } from 'lucide-react';

interface CampaignSchedulePresenceProps {
  className?: string;
}

export const CampaignSchedulePresence: React.FC<CampaignSchedulePresenceProps> = ({ 
  className = '' 
}) => {
  const { currentUsers, isJoined, getCurrentUsers, joinPage, leavePage } = useCampaignSchedulePresence();

  useEffect(() => {
    // Auto-join when component mounts
    joinPage();
    // Get current users when component mounts
    getCurrentUsers();

    // Cleanup when component unmounts
    return () => {
      leavePage();
    };
  }, [joinPage, getCurrentUsers, leavePage]);

  // Don't return null, show loading state instead
  if (!isJoined) {
    return (
      <Card className={`w-80 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Đang xem trang này
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center text-muted-foreground text-sm py-4">
            Đang kết nối...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-80 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          Đang xem trang này
          <Badge variant="secondary" className="ml-auto">
            {currentUsers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {currentUsers.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            Chỉ có bạn đang xem trang này
          </div>
        ) : (
          <div className="space-y-2">
            {currentUsers.map((user) => (
              <div key={user.userId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {user.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {user.userName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Đã vào {new Date(user.joinedAt).toLocaleTimeString('vi-VN')}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Compact version for header
export const CampaignSchedulePresenceCompact: React.FC = () => {
  const { currentUsers, isJoined } = useCampaignSchedulePresence();

  if (!isJoined || currentUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {currentUsers.length} người đang xem
      </span>
      <div className="flex -space-x-2">
        {currentUsers.slice(0, 3).map((user) => (
          <Avatar key={user.userId} className="h-6 w-6 border-2 border-background">
            <AvatarFallback className="text-xs">
              {user.userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
        {currentUsers.length > 3 && (
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center border-2 border-background">
            <span className="text-xs">+{currentUsers.length - 3}</span>
          </div>
        )}
      </div>
    </div>
  );
};
