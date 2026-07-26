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
  type LiveKitViewerRole,
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
}: {
  token: string;
  onDisconnect: () => void;
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
      <div className="relative h-[min(70vh,480px)] w-full overflow-hidden rounded-lg bg-black">
        <RemoteDriverVideo />
      </div>
      <RoomAudioRenderer />
    </LiveKitRoom>
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
  const { isSubAdmin } = useAuth();
  const role: LiveKitViewerRole = isSubAdmin ? "sub_admin" : "admin";
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
  }, [driverId, schoolId, role]);

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
      disabled={loading}
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
