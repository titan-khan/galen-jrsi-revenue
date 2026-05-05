import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  AlertCircle,
  Sparkles,
  TrendingUp,
  FileText,
  Shield,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationType } from '@/types/notification';
import { cn } from '@/lib/utils';

const notificationIcons: Record<NotificationType, any> = {
  skill_request_status: Sparkles,
  skill_request_comment: Info,
  agent_alert: AlertCircle,
  usage_warning: Shield,
  system: Info,
  recommendation: TrendingUp,
  report_ready: FileText,
  data_quality: AlertCircle,
  metric_threshold: TrendingUp,
};

const notificationColors: Record<NotificationType, string> = {
  skill_request_status: 'text-blue-500',
  skill_request_comment: 'text-purple-500',
  agent_alert: 'text-orange-500',
  usage_warning: 'text-red-500',
  system: 'text-gray-500',
  recommendation: 'text-green-500',
  report_ready: 'text-blue-500',
  data_quality: 'text-yellow-500',
  metric_threshold: 'text-orange-500',
};

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, stats, isLoading, markAsRead, markAllAsRead, deleteNotification, deleteAll } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats?.unread ? `${stats.unread} unread notification${stats.unread > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={!stats?.unread || markAllAsRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => deleteAll.mutate()}
            disabled={!notifications.length || deleteAll.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear all
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            filter === 'all'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          All ({stats?.total || 0})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            filter === 'unread'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Unread ({stats?.unread || 0})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {filter === 'unread' 
                ? 'All your notifications have been read'
                : 'When you receive notifications, they will appear here'}
            </p>
          </Card>
        ) : (
          filteredNotifications.map((notification) => {
            const Icon = notificationIcons[notification.notification_type] || Info;
            const iconColor = notificationColors[notification.notification_type] || 'text-gray-500';

            return (
              <Card
                key={notification.id}
                className={cn(
                  "p-4 transition-all cursor-pointer hover:shadow-md",
                  !notification.read && "bg-primary/5 border-primary/20"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-lg bg-background", iconColor)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium text-foreground">{notification.title}</h3>
                      {!notification.read && (
                        <Badge variant="default" className="shrink-0">New</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead.mutate(notification.id);
                            }}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Mark as read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification.mutate(notification.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
