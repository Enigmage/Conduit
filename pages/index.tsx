import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import styles from "../styles/Home.module.css";
// import Image from 'next/image'

export default function Home() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const joinRoom = (e: any) => {
    e.preventDefault();
    if (roomName.length >= 3) router.push(`/room/${roomName}`);
  };
  return (
    <>
      <Head>
        <title>Conduit</title>
        <meta name="description" content="p2p webrtc video call" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <div>
          <h1>Conduit</h1>
          <p>Peer-to-peer calls</p>
        </div>
        <div className={styles.roomForm}>
          <span>
            <h3>Room Name</h3>
          </span>
          <span>
            <input
              type="text"
              onChange={e => setRoomName(e.target.value)}
              value={roomName}
            />
          </span>
          <span>
            <button
              onClick={joinRoom}
              type="button"
              disabled={roomName.length < 3}
            >
              Join
            </button>
          </span>
        </div>
      </main>
    </>
  );
}
