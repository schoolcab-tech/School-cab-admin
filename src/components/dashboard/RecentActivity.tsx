import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAllNotifications,
  markNotificationAsRead,
} from "@/services/notificationService";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  status: "read" | "unread";
  user?: {
    name: string;
    avatar?: string;
  };
}

const getStatusColor = (status: string) => {
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

export function RecentActivity() {
  const [notifications, setNotifications] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getAllNotifications(5); // Limit to 5 notifications for dashboard

      if (data) {
        const activityItems: ActivityItem[] = data.map(
          (notification: Notification) => ({
            id: notification.notification_id.toString(),
            type: notification.type,
            title: notification.title,
            description: notification.message,
            timestamp: new Date(notification.created_at),
            status: notification.is_read ? "read" : "unread",
          })
        );

        setNotifications(activityItems);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(parseInt(notificationId));

      // Update local state
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? { ...item, status: "read" as const }
            : item
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };
  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Recent Activity
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/notifications")}
            className="text-muted-foreground hover:text-foreground"
          >
            See All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No recent notifications
            </p>
          </div>
        ) : (
          <>
            {notifications.map((activity) => (
              <div
                key={activity.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  activity.status === "unread"
                    ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                    : "bg-muted/20 hover:bg-muted/40"
                }`}
                onClick={() =>
                  activity.status === "unread" && markAsRead(activity.id)
                }
              >
                <div className="text-lg">{getTypeIcon(activity.type)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm truncate ${
                        activity.status === "unread"
                          ? "font-semibold text-foreground"
                          : "font-medium text-foreground"
                      }`}
                    >
                      {activity.title}
                    </p>
                    <Badge
                      variant={getStatusColor(activity.status)}
                      className="text-xs"
                    >
                      {activity.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {activity.description}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    {activity.user && (
                      <div className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-xs">
                            {activity.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {activity.user.name}
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.timestamp, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {notifications.length === 5 && (
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/notifications")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  View All Notifications
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
