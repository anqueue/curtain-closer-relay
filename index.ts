import express from "express";
import { Response } from "express-serve-static-core";

const PORT = 5734;
const app = express();

// Store all connected clients
let clients = new Set<Response>();

// Helper function to send events to all connected clients
const broadcast = (eventType: string, data: string) => {
  clients.forEach((client) => {
    client.write(`event: ${eventType}\ndata: ${data}\n\n`);
  });
};

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <body>
        <button onclick="fetch('/events?state=open', { method: 'POST' })">Open</button>
        <button onclick="fetch('/events?state=close', { method: 'POST' })">Close</button>
    </body>
    </html>
    `);
});

app.post("/events", (req, res) => {
  const rawState = req.query.state;

  if (!rawState || typeof rawState !== "string") {
    res.status(400).send("invalid state query parameter");
    return;
  }

  if (rawState === "open" || rawState === "close") {
    // Broadcast the state change to all connected clients
    broadcast("stateChange", rawState.toUpperCase());
    res.status(200).send("OK");
  } else {
    res.status(400).send("state must be 'open' or 'close'");
  }
});

app.get("/events", (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Add this client to the clients set
  clients.add(res);

  // Send initial connection message
  res.write("event: connected\ndata: connected to event stream\n\n");

  // Handle client disconnect
  req.on("close", () => {
    clients.delete(res);
  });
});

setInterval(() => {
  console.log("pinging clients");
  clients.forEach((client) => {
    console.log("pinging client");
    client.write("event: ping\ndata: ping\n\n");
  });
}, 60e3);

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
