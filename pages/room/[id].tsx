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
        urls: "stun:google.com:19302",
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

    socketRef.current.on("created", handleRoomCreation);
    socketRef.current.on("joined", handleRoomJoin);

    socketRef.current.on("full", handleRoomFull);

    socketRef.current.on("ready", startCall);
    socketRef.current.on("offer", handleOffer);
    socketRef.current.on("answer", handleAnswer);
    socketRef.current.on("leave", onPeerLeave);

    socketRef.current.on("ice-candidate", handlePeerIceCandidate);

    return () => {
      console.log("disconnecting");
      if (socketRef.current) {
        // socketRef.current.emit("leave");
        cleanConnection();
        socketRef.current.disconnect();
      }
    };
  }, [roomName]);

  const handleRoomFull = () => {
    alert("Room full!! redirecting...");
    router.push("/");
  };

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
      console.log("Peer recieving offer");
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
          console.log("Peer sending answer");
          rtcConnectionRef.current!.setLocalDescription(answer);
          socketRef.current!.emit("answer", answer, roomName);
        })
        .catch(err => console.error(err));
    }
  };

  const startCall = () => {
    // once host gets ready even from peer, it initiates the call.
    console.log("host should start call");
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
          console.log("Host sending offer");
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
      socketRef.current!.emit("ice-candidate", e.candidate, roomName);
    }
  };

  const handleTracks = (e: RTCTrackEvent) => {
    console.log("peer track recieved");
    peerVideoRef.current!.srcObject = e.streams[0];
    peerVideoRef.current!.onloadedmetadata = () => {
      userVideoRef.current!.play();
    };
  };

  const handleRoomJoin = () => {
    console.log("streaming peer");
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: { width: 500, height: 500 },
      })
      .then(stream => {
        userStreamRef.current = stream;
        userVideoRef.current!.srcObject = stream;
        userVideoRef.current!.onloadedmetadata = () => {
          userVideoRef.current!.play();
        };
        console.log("Peer sending ready");
        socketRef.current!.emit("ready", roomName);
      })
      .catch(err => console.error(err));
  };

  const handleRoomCreation = () => {
    console.log("streaming host");
    console.log("host is being set");
    hostRef.current = true;
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: { width: 500, height: 500 },
      })
      .then(stream => {
        userStreamRef.current = stream;
        userVideoRef.current!.srcObject = stream;
        userVideoRef.current!.onloadedmetadata = () => {
          userVideoRef.current!.play();
        };
      })
      .catch(err => console.error(err));
  };
  const cleanConnection = (both: boolean = true) => {
    if (both) {
      socketRef.current?.emit("leave", roomName);
      if (userVideoRef.current?.srcObject) {
        (userVideoRef.current.srcObject as any)
          .getTracks()
          .forEach((track: any) => track.stop());
      }
    }
    if (peerVideoRef.current?.srcObject) {
      (peerVideoRef.current.srcObject as any)
        .getTracks()
        .forEach((track: any) => track.stop());
    }
    // safely close connection

    if (rtcConnectionRef.current) {
      rtcConnectionRef.current.ontrack = null;
      rtcConnectionRef.current.onicecandidate = null;
      rtcConnectionRef.current.close();
      rtcConnectionRef.current = undefined;
    }
  };
  const leaveCall = () => {
    cleanConnection();
    router.push("/");
  };

  const onPeerLeave = () => {
    console.log("should reload");
    hostRef.current = true;
    cleanConnection(false);
  };
  return (
    <div>
      <video autoPlay ref={userVideoRef} />
      <video autoPlay ref={peerVideoRef} />
      <button onClick={leaveCall} type="button">
        Leave Call
      </button>
    </div>
  );
};

export default ChatRoom;
