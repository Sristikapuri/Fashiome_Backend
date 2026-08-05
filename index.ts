import app from "./src/app";
import { connectToMongoDB } from "./src/database/mongodb";
import { PORT, validateProductionEnvironment } from "./src/configs/constant";
import * as dgram from "dgram";
import * as os from "os";

// ─── UDP Backend Discovery ────────────────────────────────────────────────────
// The Flutter app broadcasts "FASHIOME_DISCOVER" on the local WiFi subnet.
// This server replies with "FASHIOME_SERVER:<local-ip>:<port>" so the app
// can find the backend without a hardcoded IP — works whenever phone + Mac
// are on the same WiFi network.
const DISCOVERY_PORT = 9988;
const DISCOVERY_MSG = "FASHIOME_DISCOVER";
const DISCOVERY_PREFIX = "FASHIOME_SERVER:";

function getLocalIp(): string {
  const nets = os.networkInterfaces();
  const priorityOrder = ["en0", "en1", "wlan0", "eth0", "wifi0", "ethernet0"];
  
  const keys = Object.keys(nets).sort((a, b) => {
    const aIdx = priorityOrder.indexOf(a.toLowerCase());
    const bIdx = priorityOrder.indexOf(b.toLowerCase());
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });

  for (const name of keys) {
    const iface = nets[name];
    if (!iface) continue;
    for (const net of iface) {
      // Pick the first non-internal IPv4 address on physical interfaces
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}


function startDiscoveryServer(): void {
  const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

  socket.on("error", (err) => {
    console.error(`[Discovery] UDP error: ${err.message}`);
  });

  socket.on("message", (msg, rinfo) => {
    const text = msg.toString().trim();
    if (text === DISCOVERY_MSG) {
      const ip = getLocalIp();
      const reply = Buffer.from(`${DISCOVERY_PREFIX}${ip}:${PORT}`);
      socket.send(reply, rinfo.port, rinfo.address, (err) => {
        if (!err) {
          console.log(`[Discovery] Replied to ${rinfo.address}:${rinfo.port} → ${ip}:${PORT}`);
        }
      });
    }
  });

  socket.bind(DISCOVERY_PORT, "0.0.0.0", () => {
    socket.setBroadcast(true);
    const ip = getLocalIp();
    console.log(`[Discovery] UDP server listening on port ${DISCOVERY_PORT}`);
    console.log(`[Discovery] This machine's IP: ${ip}`);
    console.log(`[Discovery] Flutter app will auto-discover at http://${ip}:${PORT}/api/v1`);
  });
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────
async function startServer() {
  validateProductionEnvironment();
  await connectToMongoDB();

  // Start UDP discovery alongside the HTTP server
  startDiscoveryServer();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(` Server running on port ${PORT} (0.0.0.0)`);
  });
}

startServer().catch((error) => {
  console.error("Backend startup failed:", error);
  process.exitCode = 1;
});
