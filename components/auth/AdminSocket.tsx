"use client";
import { useEffect } from "react";
import { io } from "socket.io-client";

export function AdminSocket({
  onUserLogin,
  onUserLogout,
  onUserBlock,
}: {
  onUserLogin?: () => void;
  onUserLogout?: (userId: number) => void;
  onUserBlock?: (userId: number, isBlock: boolean) => void;
}) {
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL!, {
      path: "/socket.io",
      transports: ["websocket"],
    });

    socket.emit("joinAdmin");

    socket.on("user_login", () => {
      if (onUserLogin) onUserLogin();
    });

    socket.on("user_logout", (data) => {
      if (onUserLogout) onUserLogout(data.userId);
    });

    socket.on("user_block", (data) => {
      if (onUserBlock) onUserBlock(data.userId, data.isBlock);
    });

    return () => {
      socket.disconnect();
    };
  }, [onUserLogin, onUserLogout, onUserBlock]);

  return null;
}