import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft, Video } from 'lucide-react';
import { useJitsiToken } from '@/hooks/useTelehealth';

export default function VideoCallPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const iframeRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error } = useJitsiToken(id ?? null);

  // Dynamically inject Jitsi IFrame API script then mount the meeting
  useEffect(() => {
    if (!data || !iframeRef.current) return;

    const domain  = data.domain;
    const roomName = data.roomName;
    const jwt     = data.jitsiToken;

    const scriptId = 'jitsi-api-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    function mount() {
      if (!iframeRef.current) return;
      // Clear any previous instance
      iframeRef.current.innerHTML = '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
      if (!JitsiMeetExternalAPI) return;

      new JitsiMeetExternalAPI(domain, {
        roomName,
        jwt,
        parentNode: iframeRef.current,
        width:  '100%',
        height: '100%',
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop',
            'fullscreen', 'fodeviceselection', 'hangup', 'chat',
            'recording', 'livestreaming', 'etherpad', 'sharedvideo',
            'settings', 'raisehand', 'videoquality', 'filmstrip',
            'feedback', 'stats', 'shortcuts', 'tileview',
          ],
        },
      });
    }

    if (script) {
      mount();
    } else {
      script = document.createElement('script');
      script.id  = scriptId;
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      script.onload = mount;
      document.head.appendChild(script);
    }
  }, [data]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 rounded-lg p-1.5 hover:bg-accent transition-colors text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Video Consultation</span>
        </div>
        {data && (
          <span className="ml-auto text-xs text-muted-foreground font-mono">
            Room: {data.roomName}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 relative">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Connecting to video room…</p>
          </div>
        )}

        {isError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <div className="text-center">
              <p className="text-base font-semibold text-foreground">Cannot Join Call</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {(error as Error)?.message ||
                  'The video call is not available. Please check the appointment time or contact support.'}
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="mt-2 rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Go Back
            </button>
          </div>
        )}

        {data && (
          <div ref={iframeRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
}
