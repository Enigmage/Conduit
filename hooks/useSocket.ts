import { useEffect, useRef } from "react";

const useSocket = () => {
  const socketCreated = useRef(false);
  useEffect(() => {
    if (!socketCreated.current) {
      try {
        const initializeSocket = async () => {
          await fetch("/api/socket");
        };
        initializeSocket();
        socketCreated.current = true;
      } catch (error) {
        console.error(error);
      }
    }
  }, []);
};

export default useSocket;
