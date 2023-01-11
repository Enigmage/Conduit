import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import useSocket from "../../hooks/useSocket";
import { io, type Socket } from "socket.io-client";
import { type DefaultEventsMap } from "socket.io/dist/typed-events";

const rtcConnectionConfig = () => {
  return {
    iceServers: [
      {
        urls: "stun:openrelay.metered.ca:80",
      },
      {
        urls: "stun.l.google.com:19302",
      },
    ],
  };
};

const ChatRoom = () => {
  useSocket();
  const router = useRouter();
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const peerVideoRef = useRef<HTMLVideoElement>(null);
  const rtcConnectionRef = useRef<RTCPeerConnection>();
  const socketRef = useRef<Socket<DefaultEventsMap, DefaultEventsMap>>();
  const userStreamRef = useRef<MediaStream>();
  const hostRef = useRef(false);
  const { id: roomName } = router.query;
  // console.log(roomName);
  useEffect(() => {
    socketRef.current = io();
    socketRef.current.emit("join", roomName);

    socketRef.current.on("created", handleRoomJoin(true));
    socketRef.current.on("joined", handleRoomJoin(false));

    socketRef.current.on("ready", startCall);
    socketRef.current.on("offer", handleOffer);
    socketRef.current.on("answer", handleAnswer);

    socketRef.current.on("ice-candidate", handlePeerIceCandidate);

    return () => {
      console.log("disconnecting");
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomName]);

  const handlePeerIceCandidate = (peerIceCandidate: RTCIceCandidate) => {
    const candidate = new RTCIceCandidate(peerIceCandidate);
    rtcConnectionRef
      .current!.addIceCandidate(candidate)
      .catch(err => console.error(err));
  };

  const handleAnswer = (answer: RTCSessionDescriptionInit) => {
    rtcConnectionRef
      .current!.setRemoteDescription(answer)
      .catch(err => console.error(err));
  };

  const handleOffer = (offer: RTCSessionDescriptionInit) => {
    if (!hostRef.current) {
      rtcConnectionRef.current = createRTCPeerConnection();
      // add audio and video tracks
      rtcConnectionRef.current.addTrack(
        userStreamRef.current!.getTracks()[0],
        userStreamRef.current!
      );
      rtcConnectionRef.current.addTrack(
        userStreamRef.current!.getTracks()[1],
        userStreamRef.current!
      );

      rtcConnectionRef
        .current!.setRemoteDescription(offer)
        .catch(err => console.error(err));

      rtcConnectionRef
        .current!.createAnswer()
        .then(answer => {
          rtcConnectionRef.current!.setLocalDescription(answer);
          socketRef.current!.emit("answer", answer, roomName);
        })
        .catch(err => console.error(err));
    }
  };

  const startCall = () => {
    // once host gets ready even from peer, it initiates the call.
    if (hostRef.current) {
      rtcConnectionRef.current = createRTCPeerConnection();
      // add audio and video tracks
      rtcConnectionRef.current.addTrack(
        userStreamRef.current!.getTracks()[0],
        userStreamRef.current!
      );
      rtcConnectionRef.current.addTrack(
        userStreamRef.current!.getTracks()[1],
        userStreamRef.current!
      );

      rtcConnectionRef.current
        .createOffer()
        .then(offer => {
          rtcConnectionRef.current!.setLocalDescription(offer);
          socketRef.current!.emit("offer", offer, roomName);
        })
        .catch(err => console.error(err));
    }
  };
  const createRTCPeerConnection = () => {
    const connection = new RTCPeerConnection(rtcConnectionConfig());

    connection.onicecandidate = handleIceCandidate;

    connection.ontrack = handleTracks;
    return connection;
  };

  const handleIceCandidate = (e: RTCPeerConnectionIceEvent) => {
    if (e.candidate) {
      socketRef.current!.emit("connect", e.candidate, roomName);
    }
  };

  const handleTracks = (e: RTCTrackEvent) => {
    console.log("peer track recieved" + e.streams);
    peerVideoRef.current!.srcObject = e.streams[0];
  };

  const handleRoomJoin = (isHost: boolean) => () => {
    console.log("streaming");
    if (isHost) hostRef.current = true;
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { width: 500, height: 500 },
      })
      .then(stream => {
        userStreamRef.current = stream;
        userVideoRef.current!.srcObject = stream;
        userVideoRef.current!.onloadedmetadata = () => {
          userVideoRef.current!.play();
        };
        if (!isHost) socketRef.current!.emit("ready");
      })
      .catch(err => console.error(err));
  };
  return (
    <div>
      <video autoPlay ref={userVideoRef} />
      <video autoPlay ref={peerVideoRef} />
    </div>
  );
};

export default ChatRoom;
