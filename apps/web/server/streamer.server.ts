import type { Server } from "node:http";
import { type Socket, Server as SocketIOServer } from "socket.io";

export class Streamer {
  private server: Server;
  private io: SocketIOServer;
  private socket?: Socket;
  private streamers: Map<string, Set<string>> = new Map();
  private streamSessions: Map<string, { roomId: string; streamId: string; username: string }> = new Map();
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor({ server }: { server: Server }) {
    console.log("Streamer is created");

    this.server = server;
    this.io = new SocketIOServer(this.server);

    this.io.on("connection", (socket) => {
      this.socket = socket;

      console.log("A user connected ", socket.id);

      socket.on("join-room", this.joinRoom.bind(this, socket));

      socket.on("start-stream", this.startStream.bind(this, socket));

      socket.on("end-stream", this.endStream.bind(this, socket));

      socket.on("stream-chunk", this.streamChunk.bind(this, socket));

      socket.on("disconnect", this.disconnect.bind(this, socket));
    });
  }

  private async joinRoom(
    socket: Socket,
    { roomId, username }: { roomId: string; username: string }
  ) {
    await socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    const streamerIds = this.streamers.get(roomId);

    if (streamerIds) {
      for (const streamerId of streamerIds) {
        if (streamerId !== socket.id) {
          const viewers = this.io.sockets.adapter.rooms.get(roomId)?.size || 0;
          socket.to(streamerId).emit("viewer-joined", { viewers, username });
        }
      }
    }
  }

  private startStream(
    socket: Socket,
    {
      roomId,
      streamId,
      username,
    }: { roomId: string; streamId: string; username: string }
  ) {
    if (!this.streamers.has(roomId)) {
      this.streamers.set(roomId, new Set());
    }
    this.streamers.get(roomId)?.add(socket.id);
    this.streamSessions.set(socket.id, { roomId, streamId, username });
    const t = this.disconnectTimers.get(socket.id);
    if (t) {
      clearTimeout(t);
      this.disconnectTimers.delete(socket.id);
    }
    socket.to(roomId).emit("start-stream", { streamId, username });
    const viewers = this.io.sockets.adapter.rooms.get(roomId)?.size || 0;
    socket.to(roomId).emit("viewer-joined", { viewers, username });
  }

  private endStream(
    socket: Socket,
    {
      roomId,
      streamId,
      username,
    }: { roomId: string; streamId: string; username: string }
  ) {
    this.streamers.get(roomId)?.delete(socket.id);
    this.streamSessions.delete(socket.id);
    socket.to(roomId).emit("end-stream", { streamId, username });
    const viewers = this.io.sockets.adapter.rooms.get(roomId)?.size || 0;
    socket.to(roomId).emit("viewer-joined", { viewers, streamerId: socket.id });
  }

  private disconnect(socket: Socket) {
    const session = this.streamSessions.get(socket.id);
    if (!session) return;
    const { roomId, streamId, username } = session;
    const t = setTimeout(() => {
      this.streamers.get(roomId)?.delete(socket.id);
      socket.to(roomId).emit("end-stream", { streamId, username });
      this.streamSessions.delete(socket.id);
      this.disconnectTimers.delete(socket.id);
      const viewers = this.io.sockets.adapter.rooms.get(roomId)?.size || 0;
      socket.to(roomId).emit("viewer-joined", { viewers, streamerId: socket.id });
    }, Number(process.env.STREAM_RECONNECT_GRACE_MS || 10000));
    this.disconnectTimers.set(socket.id, t);
  }

  private streamChunk(
    socket: Socket,
    {
      roomId,
      streamId,
      chunk,
      username,
    }: {
      roomId: string;
      streamId: string;
      chunk: ArrayBuffer;
      username: string;
    }
  ) {
    // console.log(
    //   `Broadcasting stream chunk to room ${roomId} from stream ${streamId}`
    // );
    socket
      .to(roomId)
      .emit("stream-chunk", { roomId, streamId, chunk, username });
  }
}
