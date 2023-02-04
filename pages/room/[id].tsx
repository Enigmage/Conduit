import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import useSocket from "../../hooks/useSocket";
import { io, type Socket } from "socket.io-client";
import { type DefaultEventsMap } from "socket.io/dist/typed-events";
import styles from "../../styles/Room.module.css";

const connectionConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:openrelay.metered.ca:80",
    },
    {
      urls: "stun:google.com:19302",
    },
  ],
};

const ChatRoom = () => {
  useSocket();

  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const router = useRouter();
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const peerVideoRef = useRef<HTMLVideoElement>(null);
  const rtcConnectionRef = useRef<RTCPeerConnection | null>();
  const socketRef = useRef<Socket<DefaultEventsMap, DefaultEventsMap>>();
  const userStreamRef = useRef<MediaStream>();
  const hostRef = useRef(false);
  const { id: roomName } = router.query;
  // console.log(roomName);

  useEffect(() => {
    // empty io() means it will send request to the
    // server that sent it.
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
    rtcConnectionRef.current
      ?.addIceCandidate(candidate)
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
    const connection = new RTCPeerConnection(connectionConfig);

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
      peerVideoRef.current!.play();
    };
  };

  const handleRoomJoin = () => {
    console.log("streaming peer");
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: /* { width: 500, height: 500 } */ true,
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
        video: /* { width: 500, height: 500 } */ true,
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
      rtcConnectionRef.current = null;
    }
  };
  const leaveCall = () => {
    cleanConnection();
    router.push("/");
  };

  const onPeerLeave = () => {
    console.log("should reload");
    cleanConnection(false);
    hostRef.current = true;
    // temporary fix!!
    router.reload();
  };

  const toggleMedia = (type: any, currState: any) => {
    userStreamRef.current?.getTracks().forEach((track: any) => {
      if (track.kind === type) track.enabled = !currState;
    });
  };

  const toggleMic = () => {
    toggleMedia("audio", micActive);
    setMicActive(prev => !prev);
  };
  const toggleCam = () => {
    toggleMedia("video", camActive);
    setCamActive(prev => !prev);
  };

  return (
    <div className={styles.main}>
      <div className={styles.vidContainer}>
        <div>
          <video autoPlay ref={userVideoRef} />
        </div>
        <div>
          <video autoPlay ref={peerVideoRef} />
        </div>
      </div>
      <div className={styles.buttonGrid}>
        <button onClick={toggleCam} type="button" className={styles.button11}>
          {camActive ? "Camera On" : "Camera Off"}
        </button>
        <button onClick={leaveCall} type="button" className={styles.button10}>
          Leave Call
        </button>
        <button onClick={toggleMic} type="button" className={styles.button11}>
          {micActive ? "Mic On" : "Mic Off"}
        </button>
      </div>
    </div>
  );
};

export default ChatRoom;
