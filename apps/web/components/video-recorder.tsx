"use client";

import { VideoUI } from "@/components/shared/video-ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input, inputBaseClasses } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultVideoConstraints } from "@/lib/constants/events";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { DialogDescription } from "@radix-ui/react-dialog";
import type { SupaTypes } from "@services/supabase";
import { useSession } from "@supabase/auth-helpers-react";
import { useChat } from 'ai/react';
import { UploadIcon, WandSparklesIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Socket, io } from "socket.io-client";
import { toast } from "sonner";

interface VideoRecorderProps {
  eventData: SupaTypes.Tables<"events">;
  onVideoUploaded: (videoUrl: string, videoData: { username: string; description: string }) => void;
  onCancelStream: () => void;
}

export function VideoRecorder({
  eventData,
  onVideoUploaded,
  onCancelStream,
}: VideoRecorderProps) {
  // TODO: refactor to user react-use useSetState
  const [isStreaming, setIsStreaming] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState<string>('');
  const [manualDescription, setManualDescription] = useState(false);
  const [viewersCount, setViewersCount] = useState(0);
  const [isPosting, setIsPosting] = useState(false);

  const streamerVideoRef = useRef<HTMLVideoElement>(null);
  const streamMediaRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const sendQueueRef = useRef<
    { roomId: number; streamId: string; chunk: ArrayBuffer; username: string }[]
  >([]);
  const currentStreamIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const aiTimerRef = useRef<number | null>(null);

  const supabase = createClient();
  const session = useSession();

  const { messages, append, isLoading } = useChat({
    id: `${session?.user.user_metadata.username}_${eventData.id}`,
    onFinish(message, options) {
      // console.log("Chat message sent successfully:", message, options);

      setDescription(message.content);
    },
  })

  useEffect(() => {
    socketRef.current = io();

    const flushQueue = () => {
      if (!socketRef.current?.connected) return;
      while (sendQueueRef.current.length) {
        const payload = sendQueueRef.current.shift()!;
        socketRef.current.emit("stream-chunk", payload);
      }
    };

    socketRef.current.on("connect", () => {
      socketRef.current?.emit("join-room", { roomId: eventData.id, username: session?.user.user_metadata.username });
      flushQueue();
    });

    socketRef.current.on("reconnect", () => {
      socketRef.current?.emit("join-room", { roomId: eventData.id, username: session?.user.user_metadata.username });
      flushQueue();
    });

    socketRef.current.on("viewer-joined", ({ username, viewers }) => {
      setViewersCount(viewers);
      toast.info(`${username} joined to the stream.`);
    });

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    heartbeatRef.current = window.setInterval(() => {
      if (isStreaming) {
        socketRef.current?.emit("heartbeat", { roomId: eventData.id });
      }
    }, 5000);

    return () => {
      stopStreamingAndRecording();
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      socketRef.current?.disconnect();
    };
  }, [eventData.id, isStreaming, session?.user.user_metadata.username]);

  const startMediaStream = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Media devices not available");
      return;
    }
    console.log("Starting media stream");
    const videoConfig = defaultVideoConstraints.video;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConfig,
      audio: true,
    });
    streamMediaRef.current = stream;

    if (streamerVideoRef.current) {
      streamerVideoRef.current.srcObject = stream;
    }
    // console.log("Local video preview set");
    // console.log("Audio tracks:", stream.getAudioTracks());
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    startMediaStream();

    return () => {
      if (streamMediaRef.current && previewUrl) {
        stopStreamingAndRecording();
      }

      setIsUploading(false);
      setIsStreaming(false);
    }
  }, [streamerVideoRef.current]);

  const startStreamingAndRecording = async () => {
    if (!session?.user.id || !eventData.id) {
      setError("No user session available");
      return;
    }
    if (!streamMediaRef.current) {
      setError("No media stream available");
      return;
    }

    try {
      // Create a stream record in Supabase
      const { data: streamData, error: streamError } = await supabase
        .from("streams")
        .insert({
          event_id: eventData.id,
          user_id: session.user.id,
          status: "live",
        })
        .select()
        .single();

      if (streamError) throw streamError;

      socketRef.current?.emit("start-stream", { roomId: eventData.id, streamId: streamData.id, username: session.user.user_metadata.username });

      currentStreamIdRef.current = String(streamData.id);
      setIsStreaming(true);

      const mediaRecorder = new MediaRecorder(streamMediaRef.current, {
        mimeType: "video/webm; codecs=vp9,opus",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          const reader = new FileReader();
          reader.onloadend = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const payload = {
              roomId: eventData.id,
              streamId: currentStreamIdRef.current || String(streamData.id),
              chunk: arrayBuffer,
              username: session.user.user_metadata.username,
            };
            if (!socketRef.current?.connected) {
              sendQueueRef.current.push(payload);
            } else {
              socketRef.current.emit("stream-chunk", payload);
            }
          };
          reader.readAsArrayBuffer(event.data);
        }
      };

      mediaRecorder.onstop = createPreview;
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setPreviewUrl(undefined);
      const aiFps = Number(process.env.NEXT_PUBLIC_AI_FRAME_FPS || 0);
      if (aiFps > 0) {
        const video = streamerVideoRef.current;
        if (video) {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          aiTimerRef.current = window.setInterval(async () => {
            if (!ctx || !video.videoWidth || !video.videoHeight) return;
            canvas.width = Math.max(1, Math.floor(video.videoWidth / 4));
            canvas.height = Math.max(1, Math.floor(video.videoHeight / 4));
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob((b) => resolve(b), "image/jpeg", 0.6)
            );
            if (blob) {
              try {
                console.debug("AI frame captured", { size: blob.size });
              } catch {}
            }
          }, Math.max(250, Math.floor(1000 / aiFps)));
        }
      }
    } catch (err) {
      console.error("Error starting stream and recording:", err);
      setError("Failed to start streaming and recording");
    }
  };

  const stopStreamingAndRecording = useCallback(async () => {
    setIsUploading(true);

    if (!session?.user.id || !isStreaming || !eventData.id) {
      setError("No active stream available");
      return;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (aiTimerRef.current) {
      clearInterval(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    if (streamMediaRef.current) {
      for (const track of streamMediaRef.current.getTracks()) {
        track.stop();
      }
    }

    // Update stream record in Supabase
    const { data: streamData, error: streamError } = await supabase
      .from("streams")
      .update({ status: "ended" })
      .eq("event_id", eventData.id)
      .eq("user_id", session.user.id)
      .eq("status", "live")
      .select("id")
      .single();

    if (streamError) {
      console.error("Error updating stream record:", streamError);
      setError("Failed to update stream record");
      throw streamError;
    }

    setIsStreaming(false);
    socketRef.current?.emit("end-stream", { roomId: eventData.id, streamId: streamData.id, username: session.user.user_metadata.username });
    currentStreamIdRef.current = null;
  }, [eventData, isStreaming, session?.user, supabase]);

  const createPreview = () => {
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
  };

  const uploadVideo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPosting(true);

    const formData = new FormData(event.currentTarget);

    if (chunksRef.current.length === 0) {
      setError("No recorded data available");
      return;
    }

    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    const file = new File([blob], `event_${eventData.id}_${Date.now()}.webm`, {
      type: "video/webm",
    });

    try {
      const { data, error } = await supabase.storage
        .from("videos")
        .upload(`event_${eventData.id}/${file.name}`, file);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(data.path);

      const videoData = {
        username: formData.get("username") as string,
        description: formData.get("description") as string,
      }

      onVideoUploaded(publicUrl, videoData);
      chunksRef.current = []; // Clear chunks after successful upload
    } catch (err) {
      console.error("Error uploading video:", err);
      setError("Failed to upload video");
    } finally {
      setIsPosting(false);
      toast.success("Video posted successfully!");
    }
  };

  const updateStreamMediaRef = (stream: MediaStream) => {
    streamMediaRef.current = stream

    if (streamerVideoRef.current) {
      streamerVideoRef.current.srcObject = streamMediaRef.current;
    }
  }

  const generateDescription = async () => {
    const content = description || `I just finished streaming this event: ${eventData.name}!`;

    const videoBlob = previewUrl;
    // const videoBlob = (await chunksRef.current[0].text()).normalize();

    await append({
      content,
      role: "user",
    }, {
      body: {
        prompt: content,
        videoBlob,
        event: eventData,
      },
    })
  }

  // console.log(messages.filter((msg) => msg.role === "assistant") || 'No assistant message');
  const aiResponses = messages.filter(msg => msg.role === 'assistant');

  return (
    <>
      <VideoUI
        error={error}
        eventData={eventData}
        previewUrl={previewUrl}
        isUploading={isUploading}
        isStreaming={isStreaming}
        viewersCount={viewersCount}
        streamMediaRef={streamMediaRef}
        mediaRecorderRef={mediaRecorderRef}
        streamerVideoRef={streamerVideoRef}
        onCancelStream={onCancelStream}
        updateStreamMediaRef={updateStreamMediaRef}
        onStreamingStop={stopStreamingAndRecording}
        onStreamingStart={startStreamingAndRecording}
        onToggleAiNarrator={() => console.log("Toggle AI narrator")}
        streamer
      />
      <Dialog open={isUploading} onOpenChange={(open) => setIsUploading(open)}>
        <DialogContent className="p-0 bg-card">
          <DialogHeader className="gap-0">
            {/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
            <video
              className="video-preview video-preview--upload"
              src={previewUrl}
              controls
              autoPlay
              loop
            />
            <div className="w-full bg-background flex gap-2 !my-0 py-1.5 px-6 items-center justify-start">
              <Avatar className="size-8 border-2 bg-accent m-0">
                <AvatarImage
                  src={session?.user.user_metadata.avatar}
                  alt={`@${session?.user.user_metadata.username}`}
                />
                <AvatarFallback>UN</AvatarFallback>
              </Avatar>
              <p className="font-bold text-sm">@{session?.user.user_metadata.username}</p>
            </div>
          </DialogHeader>
          <DialogDescription className="px-6">
            <form className="flex flex-col gap-5" onSubmit={uploadVideo} id="new-video-upload">
              <Label htmlFor="username" className="sr-only">
                Video title
              </Label>
              <Input
                type="hidden"
                id="username"
                name="username"
                placeholder="Enter a title for your video"
                className="hidden"
                value={session?.user.user_metadata.username}
                defaultValue={session?.user.user_metadata.username}
              />

              <Label htmlFor="description" className="sr-only">
                Video description
              </Label>
              <Button type="button" variant="ghost" size="sm" className="w-max hover:[&_svg]:animate-pulse" onClick={generateDescription}>
                Generate description <WandSparklesIcon className="size-4" />
                {isLoading && (
                  <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full" />
                )}
              </Button>
              <textarea
                id="description"
                name="description"
                placeholder="Enter a description for your video"
                maxLength={280}
                className={cn(inputBaseClasses, "h-24 resize-none")}
                value={manualDescription ? description : aiResponses[aiResponses.length - 1]?.content ?? description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => setManualDescription(true)}
                onBlur={() => setManualDescription(false)}
              />
            </form>
          </DialogDescription>
          <DialogFooter className="p-6 w-full flex flex-row gap-4 !justify-evenly">
            {/* loader spinner */}
            <Button type="button" variant="destructive" size="lg" onClick={() => !isPosting && setIsUploading(false)}>
              Cancel
              <XIcon className="size-8" />
            </Button>
            <Button type="submit" form="new-video-upload" size="lg" disabled={isPosting}>
              {isPosting ? (
                <>
                  Posting
                  <div className="size-6 border-[3px] border-t-transparent border-accent-foreground rounded-full animate-spin" />
                </>
              ) : (
                <>
                  Post
                  <UploadIcon className="size-8" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
