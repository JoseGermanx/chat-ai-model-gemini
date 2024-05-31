import { Server } from "socket.io";
import express from "express";
import { createServer } from "http";

const app = express();
const server = createServer(app);
const socketio = new Server(server);

socketio.on("connection", (socket) => {
    console.log("New client connected");
    
    socket.on("chat message", (message) => {
        socketio.emit("chat message", message);
    });
    
    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

app.use(express.static("public"));

server.listen(5000, () => console.log("Server is running on localhost:5000"));
