import { NextApiRequest, NextApiResponse } from "next";
import { Server } from "socket.io";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  if ((res.socket as any).server.io) {
    console.log("Socket already attached");
    return res.end();
  }

  const io = new Server((res.socket as any).server);
  (res.socket as any).server.io = io;

  io.on("connection", socket => {
    console.log(`Someone connected ${socket.id}`);
    // a user joined a room
    socket.on("join", room => {
      const { rooms } = io.sockets.adapter;
      const currentRoom = rooms.get(room);
      if (currentRoom === undefined) {
        //create room
        socket.join(room);
        socket.emit("created");
      } else if (currentRoom.size === 1) {
        // join room
        socket.join(room);
        socket.emit("joined");
      } else {
        // more than 2 persons cannot join as of yet.
        socket.emit("full");
      }
      console.log(rooms);
    });
    // user ready to communicate
    socket.on("ready", (room: string) => {
      // send to the other user in the room.
      socket.broadcast.to(room).emit("ready");
      console.log("Ready sent");
    });
    socket.on("ice-candidate", (candidate: RTCIceCandidate, room: string) => {
      console.log(candidate);
      socket.broadcast.to(room).emit("ice-candidate", candidate);
    });
    socket.on("offer", (offer, room: string) => {
      socket.broadcast.to(room).emit("offer", offer);
    });
    socket.on("answer", (answer, room: string) => {
      socket.broadcast.to(room).emit("answer", answer);
    });
    socket.on("leave", (room: string) => {
      socket.broadcast.to(room).emit("leave");
      socket.leave(room);
    });
  });
  return res.end();
}
