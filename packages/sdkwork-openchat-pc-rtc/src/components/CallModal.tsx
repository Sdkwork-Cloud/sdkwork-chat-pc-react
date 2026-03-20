import { memo, useEffect, useRef, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import type { CallSession } from "../entities/rtc.entity";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

interface CallModalProps {
  session: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAccept: () => Promise<void> | Promise<boolean>;
  onReject: () => Promise<void> | Promise<boolean>;
  onHangup: () => Promise<void> | Promise<boolean>;
  onToggleMute: () => Promise<void>;
  onToggleCamera: () => Promise<void>;
  onToggleSpeaker: () => Promise<void>;
}

const AUTO_END_COUNTDOWN = 30;

export const CallModal = memo(function CallModal({
  session,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onHangup,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
}: CallModalProps) {
  const { tr } = useAppTranslation();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [countdown, setCountdown] = useState(AUTO_END_COUNTDOWN);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const hasNoMedia = !localStream && !remoteStream;
    const hasError = Boolean(session.error);
    const isActive =
      session.status === "calling" ||
      session.status === "ringing" ||
      session.status === "connecting";

    if (hasNoMedia && hasError && isActive) {
      const timer = setInterval(() => {
        setCountdown((previous) => {
          if (previous <= 1) {
            clearInterval(timer);
            void onHangup();
            return 0;
          }
          return previous - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }

    setCountdown(AUTO_END_COUNTDOWN);
  }, [localStream, onHangup, remoteStream, session]);

  if (!session) {
    return null;
  }

  const isIncoming = session.direction === "incoming";
  const isRinging = session.status === "ringing";
  const isCalling = session.status === "calling";
  const isConnecting = session.status === "connecting";
  const isConnected = session.status === "connected";
  const isVideo = session.callType === "video";
  const remoteName = session.remoteUserName || tr("Unknown user");
  const countdownText =
    countdown > 0
      ? tr("Call will end automatically in {{count}} seconds", {
          count: countdown,
        })
      : tr("Ending call...");

  const getStatusText = (): string => {
    switch (session.status) {
      case "calling":
        return tr("Dialing...");
      case "ringing":
        return isIncoming ? tr("Incoming call") : tr("Waiting for answer...");
      case "connecting":
        return tr("Connecting...");
      case "connected":
        return tr("In call");
      case "ended":
        return tr("Call ended");
      case "failed":
        return tr("Call failed");
      default:
        return "";
    }
  };

  const renderErrorBlock = () =>
    session.error ? (
      <div className="mt-4 max-w-sm rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/20 px-4 py-3">
        <p className="flex items-center justify-center text-sm text-[#EF4444]">
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          {session.error}
        </p>
        <p className="mt-2 text-center text-xs text-[#94A3B8]">{countdownText}</p>
      </div>
    ) : null;

  return (
    <SharedUi.Dialog
      isOpen
      onClose={() => undefined}
      size="xl"
      closeOnOverlayClick={false}
      closeOnEscape={false}
      overlayClassName="z-[10000] bg-black/80 backdrop-blur-sm"
      contentClassName="h-[80vh] max-w-4xl overflow-hidden rounded-2xl border-0 bg-[#1E293B] p-0 shadow-2xl"
      bodyClassName="h-full overflow-hidden p-0"
    >
      <div className="relative h-full w-full">
        {isVideo ? (
          <div className="absolute inset-0">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-[#0F172A]">
                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] text-3xl font-semibold text-white shadow-lg">
                  {session.remoteUserAvatar || remoteName[0] || "?"}
                </div>
                <p className="text-sm text-white/50">
                  {isIncoming
                    ? tr("Incoming video call...")
                    : tr("Waiting for the other side to enable video...")}
                </p>
                {renderErrorBlock()}
              </div>
            )}

            <div className="absolute right-4 top-4 h-36 w-48 overflow-hidden rounded-xl border-2 border-white/20 shadow-lg">
              {localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-[#1E293B]">
                  <svg
                    className="mb-2 h-8 w-8 text-white/30"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                    />
                  </svg>
                  <span className="text-xs text-white/50">
                    {tr("Camera is off")}
                  </span>
                </div>
              )}
            </div>

            {(isConnected || isConnecting || isRinging || isCalling) ? (
              <div className="absolute left-4 top-4">
                <h2 className="text-lg font-semibold text-white drop-shadow-md">
                  {remoteName}
                </h2>
                {isConnected ? (
                  <CallDuration
                    startTime={session.connectTime}
                    className="text-white/80"
                  />
                ) : (
                  <p className="text-sm text-white/60">{getStatusText()}</p>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1E293B] to-[#0F172A]">
            <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] text-4xl font-semibold text-white shadow-lg shadow-[#0EA5E9]/20">
              {session.remoteUserAvatar || remoteName[0] || "?"}
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              {remoteName}
            </h2>
            <p className="text-lg text-[#94A3B8]">{getStatusText()}</p>
            {renderErrorBlock()}
            {isConnected ? <CallDuration startTime={session.connectTime} /> : null}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <div className="flex items-center justify-center space-x-6">
            {isRinging && isIncoming ? (
              <>
                <SharedUi.Button
                  onClick={async () => await onReject()}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EF4444] transition-transform hover:scale-110 hover:bg-[#DC2626]"
                  aria-label={tr("Reject call")}
                >
                  <svg
                    className="h-8 w-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M6 18L18 6M6 6l12 12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </SharedUi.Button>
                <SharedUi.Button
                  onClick={async () => await onAccept()}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981] transition-transform hover:scale-110 hover:bg-[#059669]"
                  aria-label={tr("Accept call")}
                >
                  <svg
                    className="h-8 w-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </SharedUi.Button>
              </>
            ) : null}

            {(isCalling || (isRinging && !isIncoming)) ? (
              <SharedUi.Button
                onClick={async () => await onHangup()}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EF4444] transition-transform hover:scale-110 hover:bg-[#DC2626]"
                aria-label={tr("Hang up")}
              >
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </SharedUi.Button>
            ) : null}

            {isConnected || isConnecting ? (
              <>
                <SharedUi.Button
                  onClick={async () => await onToggleMute()}
                  className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
                    session.isMuted
                      ? "bg-[#EF4444] text-white"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                  aria-label={session.isMuted ? tr("Unmute") : tr("Mute")}
                >
                  {session.isMuted ? (
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                      <path
                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  )}
                </SharedUi.Button>

                {isVideo ? (
                  <SharedUi.Button
                    onClick={async () => await onToggleCamera()}
                    className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
                      session.isCameraOff
                        ? "bg-[#EF4444] text-white"
                        : "bg-white/20 text-white hover:bg-white/30"
                    }`}
                    aria-label={
                      session.isCameraOff ? tr("Turn camera on") : tr("Turn camera off")
                    }
                  >
                    {session.isCameraOff ? (
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                        <path
                          d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    )}
                  </SharedUi.Button>
                ) : null}

                <SharedUi.Button
                  onClick={async () => await onToggleSpeaker()}
                  className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
                    session.isSpeakerOff
                      ? "bg-[#EF4444] text-white"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                  aria-label={
                    session.isSpeakerOff
                      ? tr("Turn speaker on")
                      : tr("Turn speaker off")
                  }
                >
                  {session.isSpeakerOff ? (
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                      <path
                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  )}
                </SharedUi.Button>

                <SharedUi.Button
                  onClick={async () => await onHangup()}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EF4444] transition-transform hover:scale-110 hover:bg-[#DC2626]"
                  aria-label={tr("Hang up")}
                >
                  <svg
                    className="h-8 w-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </SharedUi.Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </SharedUi.Dialog>
  );
});

interface CallDurationProps {
  startTime?: string;
  className?: string;
}

function CallDuration({ startTime, className = "" }: CallDurationProps) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!startTime) {
      return;
    }

    const start = new Date(startTime).getTime();
    const timer = setInterval(() => {
      setDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;

  return (
    <span className={`font-mono ${className}`}>
      {hours > 0
        ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`
        : `${minutes}:${seconds.toString().padStart(2, "0")}`}
    </span>
  );
}

export default CallModal;
