import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteNotification,
  getAllNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notificationService";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Notification {
  notification_id: number;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

const getStatusColor = (status: "read" | "unread") => {
  switch (status) {
    case "read":
      return "outline";
    case "unread":
      return "default";
    default:
      return "secondary";
  }
};

const getTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "booking":
      return "🚗";
    case "driver_approval":
    case "driver":
      return "✅";
    case "payment":
      return "💰";
    case "review":
      return "⭐";
    case "system":
      return "⚙️";
    case "alert":
      return "🚨";
    case "info":
      return "ℹ️";
    default:
      return "📋";
  }
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getAllNotifications(50); // Get more notifications for the dedicated page
      if (data) {
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.map((item) =>
          item.notification_id === notificationId
            ? { ...item, is_read: true, read_at: new Date().toISOString() }
            : item
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAllAsRead(true);
    try {
      // Get current user (you might want to get this from auth context)
      const { supabase } = await import("@/integrations/supabase/client");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        await markAllNotificationsAsRead(user.id);

        // Update local state
        setNotifications((prev) =>
          prev.map((item) => ({
            ...item,
            is_read: true,
            read_at: new Date().toISOString(),
          }))
        );
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  const deleteNotificationItem = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.filter((item) => item.notification_id !== notificationId)
      );
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Notifications
            </h1>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${
                    unreadCount > 1 ? "s" : ""
                  }`
                : "You're all caught up!"}
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              disabled={markingAllAsRead}
              variant="outline"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              {markingAllAsRead ? "Marking..." : "Mark All as Read"}
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              All Notifications ({notifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  No notifications yet
                </p>
                <p className="text-sm text-muted-foreground">
                  When you receive notifications, they'll appear here
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.notification_id}
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-colors group ${
                    !notification.is_read
                      ? "bg-primary/5 border-primary/20"
                      : "bg-muted/20"
                  }`}
                >
                  <div className="text-lg">
                    {getTypeIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p
                            className={`text-sm truncate ${
                              !notification.is_read
                                ? "font-semibold text-foreground"
                                : "font-medium text-foreground"
                            }`}
                          >
                            {notification.title}
                          </p>
                          <Badge
                            variant={getStatusColor(
                              notification.is_read ? "read" : "unread"
                            )}
                            className="text-xs"
                          >
                            {notification.is_read ? "read" : "unread"}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>

                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(
                            new Date(notification.created_at),
                            {
                              addSuffix: true,
                            }
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.is_read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              markAsRead(notification.notification_id)
                            }
                            className="h-8 w-8 p-0"
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            deleteNotificationItem(notification.notification_id)
                          }
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
