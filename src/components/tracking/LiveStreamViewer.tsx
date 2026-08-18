import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { ConnectionState, Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAdminLiveKitToken,
  LIVEKIT_URL,
  resolveLiveKitViewerRole,
} from "@/services/livekitTokenService";
import { Loader2, Radio, RefreshCw, Video, VideoOff } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const TOKEN_REFRESH_MS = 55 * 60 * 1000;

function RemoteDriverVideo() {
  const connectionState = useConnectionState();
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const remoteVideo = tracks.find((t) => !t.participant.isLocal);

  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Connecting to live feed…</p>
      </div>
    );
  }

  if (!remoteVideo) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-white/80">
        <VideoOff className="h-10 w-10 opacity-60" />
        <p className="text-sm">Waiting for driver camera…</p>
        <p className="text-xs opacity-70">Stream starts when the driver begins their trip</p>
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={remoteVideo}
      className="h-full w-full object-cover bg-black"
    />
  );
}

function LiveStreamRoom({
  token,
  onDisconnect,
  compact = false,
}: {
  token: string;
  onDisconnect: () => void;
  compact?: boolean;
}) {
  if (!LIVEKIT_URL) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        LiveKit URL is not configured. Set VITE_LIVEKIT_URL in your environment.
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={LIVEKIT_URL}
      connect
      audio={false}
      video={false}
      onDisconnected={onDisconnect}
      className="h-full"
    >
      <div
        className={
          compact
            ? "relative aspect-video w-full overflow-hidden bg-black"
            : "relative h-[min(70vh,480px)] w-full overflow-hidden rounded-lg bg-black"
        }
      >
        <RemoteDriverVideo />
      </div>
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

export interface LiveStreamTileProps {
  driverId: number;
  schoolId: number;
  driverName: string;
  cabNumber?: string;
  tripType?: string | null;
  autoConnect?: boolean;
  connectDelayMs?: number;
}

/** Compact auto-connecting tile for multi-driver monitor grids. */
export function LiveStreamTile({
  driverId,
  schoolId,
  driverName,
  cabNumber,
  tripType,
  autoConnect = true,
  connectDelayMs = 0,
}: LiveStreamTileProps) {
  const { userRole, loading: authLoading } = useAuth();
  const role = resolveLiveKitViewerRole(userRole);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefresh = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  const fetchToken = useCallback(async () => {
    if (authLoading || !userRole) {
      setError("Session still loading. Please try again.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminLiveKitToken(driverId, schoolId, role);
      setToken(result.token);
      clearRefresh();
      refreshTimerRef.current = setTimeout(() => {
        fetchToken();
      }, TOKEN_REFRESH_MS);
    } catch (err) {
      setToken(null);
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }, [authLoading, driverId, schoolId, role, userRole]);

  const stopWatching = () => {
    clearRefresh();
    setToken(null);
    setError(null);
  };

  useEffect(() => {
    if (!autoConnect) return;
    const timer = setTimeout(() => {
      void fetchToken();
    }, connectDelayMs);
    return () => {
      clearTimeout(timer);
      clearRefresh();
    };
  }, [autoConnect, connectDelayMs, fetchToken]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-2 px-3 flex flex-row items-center justify-between space-y-0 gap-2">
        <div className="min-w-0">
          <CardTitle className="text-sm truncate flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 shrink-0 text-red-500 animate-pulse" />
            <span className="truncate">{driverName}</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground truncate">
            {cabNumber || "No cab"}
            {tripType ? ` · ${tripType}` : ""}
          </p>
        </div>
        {token ? (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={stopWatching}>
            Stop
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={() => void fetchToken()}
            disabled={loading || authLoading || !userRole}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Watch"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {error && !token ? (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-muted/40 px-3 text-center">
            <VideoOff className="h-6 w-6 text-muted-foreground" />
            <p className="text-xs text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="h-7" onClick={() => void fetchToken()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Retry
            </Button>
          </div>
        ) : loading && !token ? (
          <div className="flex aspect-video items-center justify-center bg-black">
            <Loader2 className="h-6 w-6 animate-spin text-white/80" />
          </div>
        ) : token ? (
          <LiveStreamRoom token={token} onDisconnect={stopWatching} compact />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-1 bg-muted/30 text-muted-foreground">
            <Video className="h-6 w-6 opacity-60" />
            <p className="text-xs">Click Watch to open the live feed</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface LiveStreamViewerProps {
  driverId: number;
  schoolId: number;
  driverName: string;
  /** Inline card vs dialog trigger */
  variant?: "inline" | "dialog";
  /** Show only when driver is likely streaming */
  showWhenOnTrip?: boolean;
  isOnTrip?: boolean;
}

export function LiveStreamViewer({
  driverId,
  schoolId,
  driverName,
  variant = "inline",
  showWhenOnTrip = true,
  isOnTrip = false,
}: LiveStreamViewerProps) {
  const { userRole, loading: authLoading } = useAuth();
  const role = resolveLiveKitViewerRole(userRole);
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefresh = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  const fetchToken = useCallback(async () => {
    if (authLoading || !userRole) {
      setError("Session still loading. Please try again.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminLiveKitToken(driverId, schoolId, role);
      setToken(result.token);
      clearRefresh();
      refreshTimerRef.current = setTimeout(() => {
        fetchToken();
      }, TOKEN_REFRESH_MS);
    } catch (err) {
      setToken(null);
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }, [authLoading, driverId, schoolId, role, userRole]);

  const startWatching = () => {
    if (variant === "dialog") {
      setOpen(true);
    }
    fetchToken();
  };

  const stopWatching = () => {
    clearRefresh();
    setToken(null);
    setError(null);
    setOpen(false);
  };

  useEffect(() => () => clearRefresh(), []);

  if (showWhenOnTrip && !isOnTrip) {
    return null;
  }

  const watchButton = (
    <Button
      type="button"
      variant="default"
      size="sm"
      className="gap-2"
      onClick={startWatching}
      disabled={loading || authLoading || !userRole}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Video className="h-4 w-4" />
      )}
      Watch live feed
    </Button>
  );

  if (variant === "dialog") {
    return (
      <>
        {watchButton}
        <Dialog open={open} onOpenChange={(v) => (v ? startWatching() : stopWatching())}>
          <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
            <DialogHeader className="p-4 pb-2">
              <DialogTitle className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                {driverName} — Live cab feed
              </DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-4">
              {error && !token ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchToken}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : token ? (
                <LiveStreamRoom token={token} onDisconnect={stopWatching} />
              ) : (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Radio className="h-4 w-4 text-red-500" />
          Live cab feed
        </CardTitle>
        {!token && !loading && (
          <Button variant="outline" size="sm" onClick={fetchToken}>
            Connect
          </Button>
        )}
        {token && (
          <Button variant="ghost" size="sm" onClick={stopWatching}>
            Stop
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && !token ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchToken}>
              Retry
            </Button>
          </div>
        ) : loading && !token ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : token ? (
          <LiveStreamRoom token={token} onDisconnect={() => setToken(null)} />
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Click Connect to watch the driver&apos;s live camera feed (same stream parents see).
          </div>
        )}
      </CardContent>
    </Card>
  );
}
