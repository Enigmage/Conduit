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
    if (roomName.length > 3)
      router.push(`/room/${roomName + Math.random().toString(36).slice(2)}`);
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
        <h1>Peer-to-peer calls</h1>
        <div className={styles.roomForm}>
          <h3>Room Name</h3>
          <input
            type="text"
            onChange={e => setRoomName(e.target.value)}
            value={roomName}
          />
          <button onClick={joinRoom} type="button">
            Join
          </button>
        </div>
      </main>
    </>
  );
}
