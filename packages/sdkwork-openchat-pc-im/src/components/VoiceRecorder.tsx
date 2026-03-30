import * as SharedUi from "@sdkwork/openchat-pc-ui";
import { requestUserMediaStream } from "@sdkwork/openchat-pc-rtc";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";

interface VoiceRecorderProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ isRecording, onStart, onStop, onCancel }: VoiceRecorderProps) {
  const { tr } = useAppTranslation();
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const durationRef = useRef(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await requestUserMediaStream({ audio: true, video: false });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        onStop(audioBlob, durationRef.current);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      onStart();

      setDuration(0);
      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);

      const updateAudioLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);

        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();
    } catch (error) {
      console.error("Unable to access microphone:", error);
      alert(tr("Unable to access the microphone. Check your device permissions."));
    }
  }, [onStart, onStop, tr]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setAudioLevel(0);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setDuration(0);
    durationRef.current = 0;
    setAudioLevel(0);
    audioChunksRef.current = [];
    onCancel();
  }, [onCancel]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!isRecording) {
    return (
      <SharedUi.Button
        onClick={startRecording}
        className="p-2 rounded-lg text-text-tertiary hover:text-primary hover:bg-bg-hover transition-colors"
        title={tr("Voice message")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </SharedUi.Button>
    );
  }

  return (
    <div className="flex items-center space-x-3 px-4 py-2 bg-bg-tertiary rounded-lg border border-border animate-in fade-in duration-200">
      <SharedUi.Button
        onClick={cancelRecording}
        className="p-2 rounded-full text-error hover:bg-error/10 transition-colors"
        title={tr("Cancel")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </SharedUi.Button>

      <div className="flex items-center space-x-2">
        <div className="relative">
          <div className="w-3 h-3 bg-error rounded-full animate-pulse" />
          <div className="absolute inset-0 w-3 h-3 bg-error rounded-full animate-ping opacity-75" />
        </div>

        <span className="text-sm font-mono text-text-primary min-w-[50px] font-bold">
          {formatDuration(duration)}
        </span>

        <div className="flex items-center space-x-0.5 h-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-primary rounded-full transition-all duration-100"
              style={{
                height: `${Math.max(4, Math.min(24, (audioLevel / 255) * 24 * (0.5 + Math.random() * 0.5)))}px`,
              }}
            />
          ))}
        </div>
      </div>

      <SharedUi.Button
        onClick={stopRecording}
        className="p-2 rounded-full text-success hover:bg-success/10 transition-colors"
        title={tr("Done")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </SharedUi.Button>
    </div>
  );
}

export default VoiceRecorder;
