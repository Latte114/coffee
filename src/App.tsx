// src/App.tsx
import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Room from "./pages/Room";

export default function App() {
  const [path, setPath] = useState<string>(location.hash || "#");

  useEffect(() => {
    const onHash = () => setPath(location.hash || "#");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // เส้นทางแบบง่าย:  #/room/{id}
  if (path.startsWith("#/room/")) {
    const id = path.replace("#/room/", "");
    return <Room roomId={id} />;
  }
  return <Home />;
}
