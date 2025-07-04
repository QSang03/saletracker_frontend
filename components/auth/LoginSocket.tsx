import { useEffect } from "react";
import { io } from "socket.io-client";

export function LoginSocket({ userId, onBlocked }: { userId: number, onBlocked?: () => void }) {
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      path: "/socket.io",
      transports: ["websocket"],
    });

    socket.emit("join", { userId });

    socket.on("user_block", () => {
      if (onBlocked) onBlocked();
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, onBlocked]);

  return null;
}