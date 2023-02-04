import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import styles from "../styles/Home.module.css";
import { v4 as uuid } from "uuid"
// import Image from 'next/image'

export default function Home() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const joinRoom = (e: any) => {
    e.preventDefault();
    router.push(`/room/${roomName || uuid()}`);
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
          <p>peer to peer chat</p>
        </div>
        <div className={styles.roomForm}>
          <span>
            <h3>Room</h3>
          </span>
          <div className={styles.inputContainer}>
            <input
              type="text"
              onChange={e => setRoomName(e.target.value)}
              value={roomName}
              placeholder="Enter room code to join"
            />
          </div>
          <span>
            <button
              className={styles.button10}
              onClick={joinRoom}
              type="button"
            >
              {roomName.length === 0 ? "Create" : "Join"}
            </button>
          </span>
        </div>
      </main>
    </>
  );
}
