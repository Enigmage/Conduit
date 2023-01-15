import { useEffect, useRef } from "react";

// Hook to initialize connection with a socket.
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
