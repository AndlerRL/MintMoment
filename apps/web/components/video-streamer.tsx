"use client";

import { VideoUI } from "@/components/shared/video-ui";
import { createClient } from "@/utils/supabase/client";
import type { SupaTypes } from "@services/supabase";
import { useEffect, useRef, useState } from "react";
import { type Socket, io } from "socket.io-client";
import { toast } from "sonner";

interface VideoStreamerProps {
  eventData: SupaTypes.Tables<"events">;
  activeStreams: SupaTypes.Tables<"streams">[];
  onNewRecording: () => void;
}

export function VideoStreamer({
  eventData,
  activeStreams,
  onNewRecording,
}: VideoStreamerProps) {
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [isStreamStart, setIsStreamStart] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const chunksQueue = useRef<Uint8Array[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!window.MediaSource) {
      setError("MediaSource API is not supported");
      return;
    }
    if (!MediaSource.isTypeSupported('video/webm; codecs="vp9,opus"')) {
      setError("WebM is not supported");
      return;
    }
  }, []);

  const cleanup = () => {
    if (mediaSourceRef.current?.readyState === "open") {
      try {
        mediaSourceRef.current.endOfStream();
      } catch (e) {
        console.error("Error ending media stream:", e);
      }
    }
    hasInitializedRef.current = false;
    chunksQueue.current = [];
  };

  const resetStream = () => {
    cleanup();
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.load();
    }
  };

  const joinNewStream = async (streamId: string) => {
    resetStream();
    // Set up new stream
    setCurrentStreamId(streamId);
    setIsStreamStart(true);

    // Initialize new MediaSource
    setTimeout(async () => {
      await initMediaSource();
      if (!socketRef.current?.connected) {
        console.log("Reconnecting to Socket.IO server");
        socketRef.current?.emit("connect");
      }
    }, 100);
  };

  const initMediaSource = async () => {
    if (isInitializing || hasInitializedRef.current) {
      console.log('MediaSource already initialized or initializing...');
      return;
    }

    console.log("Starting MediaSource initialization");
    setIsInitializing(true);

    try {
      // Only cleanup if we have a closed or ending MediaSource
      if (mediaSourceRef.current &&
        (mediaSourceRef.current.readyState === "closed" ||
          mediaSourceRef.current.readyState === "ended")) {
        mediaSourceRef.current = null;
        sourceBufferRef.current = null;
      }

      // Create new MediaSource only if we don't have one
      if (!mediaSourceRef.current) {
        mediaSourceRef.current = new MediaSource();
        console.log("Created new MediaSource");
      }

      return new Promise<void>((resolve, reject) => {
        if (!mediaSourceRef.current) {
          reject(new Error('MediaSource not available'));
          return;
        }

        const handleSourceOpen = () => {
          console.log("MediaSource opened, readyState:", mediaSourceRef.current?.readyState);
          try {
            if (!mediaSourceRef.current) throw new Error('MediaSource not available');

            if (!sourceBufferRef.current) {
              sourceBufferRef.current = mediaSourceRef.current.addSourceBuffer(
                'video/webm;codecs="vp9,opus"'
              );
              sourceBufferRef.current.mode = "segments";
              console.log("Source buffer added successfully");
            }

            hasInitializedRef.current = true;
            resolve();
          } catch (e) {
            reject(e);
          }
        };

        if (mediaSourceRef.current.readyState === "open") {
          handleSourceOpen();
        } else {
          mediaSourceRef.current.addEventListener("sourceopen", handleSourceOpen, { once: true });
        }

        if (videoRef.current) {
          const mediaUrl = URL.createObjectURL(mediaSourceRef.current);
          console.log("Setting video source to:", mediaUrl);
          videoRef.current.src = mediaUrl;
          videoRef.current.autoplay = true;
          videoRef.current.muted = false;
          videoRef.current.playsInline = true;
        }
      });
    } catch (e) {
      console.error("Error in initMediaSource:", e);
      setError(`MediaSource initialization error: ${(e as Error).message}`);
    } finally {
      setIsInitializing(false);
    }
  };


  const appendNextChunk = () => {
    if (!sourceBufferRef.current || !mediaSourceRef.current) return;
    if (chunksQueue.current.length === 0) return;
    if (sourceBufferRef.current.updating) return;
    if (mediaSourceRef.current.readyState !== "open") {
      // If MediaSource closed unexpectedly, try to reinitialize
      if (hasInitializedRef.current) {
        hasInitializedRef.current = false;
        initMediaSource();
      }
      return;
    }

    try {
      const chunk = chunksQueue.current.shift();
      if (chunk) {
        console.log("Appending chunk, queue size:", chunksQueue.current.length);
        sourceBufferRef.current.appendBuffer(chunk);

        // Schedule next chunk append if we have more chunks
        if (chunksQueue.current.length > 0) {
          requestAnimationFrame(appendNextChunk);
        }
      }
    } catch (e) {
      console.error("Error appending buffer:", e);
      // Handle quota exceeded error
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        if (sourceBufferRef.current.buffered.length > 0) {
          const start = sourceBufferRef.current.buffered.start(0);
          const end = sourceBufferRef.current.buffered.end(0);
          sourceBufferRef.current.remove(start, Math.max(start, end - 10));
          requestAnimationFrame(appendNextChunk);
        }
      }
    }
  };

  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);

  // Add this useEffect at the beginning to handle initial stream setup
  useEffect(() => {
    console.log("Active streams changed:", activeStreams.map(s => s.id));
    console.log("Current stream ID:", currentStreamId);

    if (activeStreams.length > 0 && !currentStreamId) {
      console.log("Initializing first stream:", activeStreams[0].id);
      setCurrentStreamId(activeStreams[0].id);
      setIsStreamStart(true);

      // Add a small delay to ensure socket connection is ready
      setTimeout(async () => {
        console.log("Initializing MediaSource for first stream");
        await initMediaSource();
        if (!socketRef.current?.connected) {
          console.log("Reconnecting to Socket.IO server");
          socketRef.current?.emit("connect");
        }
      }, 140);
    }
  }, [activeStreams]);

  const getAllUserStreamers = async () => {
    for await (const stream of activeStreams) {
      if (stream.id !== currentStreamId) {
        // const userData = await getUserData(stream.user_id as string);
        // console.log('userData', userData)
        toast(`A user is currently streaming.`, {
          action: {
            label: <span>Watch</span>,
            onClick: () => joinNewStream(stream.id),
          },
        });
      }
    }
  }

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on("connect", async () => {
      console.log("Viewer connected to Socket.IO server");
      socketRef.current?.emit("join-room", eventData.id);
      await getAllUserStreamers()
    });

    socketRef.current.on("start-stream", async ({ streamId, roomId }) => {
      console.log("Received start-stream event for stream:", streamId);
      joinNewStream(streamId); // Use joinNewStream to handle new streams

      toast.info(`A User started to stream.`, {
        action: {
          label: <span>Watch</span>,
          onClick: () => joinNewStream(streamId),
        }
      });
    });

    socketRef.current.on("end-stream", ({ streamId }) => {
      console.log("Received end-stream event for stream:", streamId);
      if (currentStreamId === streamId) {
        resetStream();
        setCurrentStreamId(null);
        setIsStreamStart(false);

        toast.info(`A User ended to stream.`);
      }
    });

    socketRef.current.on("stream-chunk", async ({ streamId, roomId, chunk }: { streamId: string, roomId: number, chunk: ArrayBuffer }) => {
      if (streamId !== currentStreamId) return;

      try {
        const uint8Array = new Uint8Array(chunk);
        chunksQueue.current.push(uint8Array);

        if (!hasInitializedRef.current && !isInitializing) {
          await initMediaSource();
        }

        if (mediaSourceRef.current?.readyState === "open" &&
          sourceBufferRef.current &&
          !sourceBufferRef.current.updating) {
          requestAnimationFrame(appendNextChunk);
        }
      } catch (e) {
        console.error("Error processing stream chunk:", e);
      }
    });

    return () => {
      cleanup();
      socketRef.current?.disconnect();
    };
  }, [eventData.id, currentStreamId, isStreamStart]);

  useEffect(() => {
    if (!activeStreams.length) {
      setCurrentStreamId(null);
      return;
    }
  }, [activeStreams, currentStreamId]);

  return (
    <>
      <VideoUI
        error={error}
        eventData={eventData}
        streamerVideoRef={videoRef}
        isStreamStart={Boolean(currentStreamId) && isStreamStart}
        onNewRecording={onNewRecording}
        onOpenAvatar={() => console.log("Open Avatar")}
        onOpenChat={() => console.log("Open Chat")}
        onShareAction={() => console.log("Share Action")}
        onLikeAction={() => console.log("Like Action")}
        onToggleAiNarrator={() => console.log("Toggle AI Narrator")}
      />
    </>
  );
}
