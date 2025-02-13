import { Server } from "socket.io";
import { db } from "@/server/db";
import tmi from "tmi.js";

declare global {
    var socketServer: Server | undefined;
    var tmiClient: tmi.Client | undefined;
}

class SocketServer {
    private static pollActive: boolean = false;
    private static votes: { "1": string[], "2": string[] } = { "1": [], "2": [] };

    private constructor() {
    }

    public static async getInstance(port: number): Promise<Server> {
        if (globalThis.socketServer) return globalThis.socketServer;

        const io = new Server(port, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });

        const tmiClient = tmi.client({
            channels: ["CrypticCriticism"],
        });

        tmiClient.connect();

        tmiClient.on("message", (channel, tags, message, self) => {
            // console.log("Received message:", message);
            if (self || !this.pollActive) return;
            
            if (message.startsWith("1") || message.startsWith("2")) {
                const username = tags["user-id"];
                if (!username) return;
                if (message.startsWith("1") && !this.votes["1"].includes(username)) {
                    this.votes["1"].push(username);
                    if (this.votes["2"].includes(username)) {
                        this.votes["2"].splice(this.votes["2"].indexOf(username), 1);
                    }
                } else if (message.startsWith("2") && !this.votes["2"].includes(username)) {
                    this.votes["2"].push(username);
                    if (this.votes["1"].includes(username)) {
                        this.votes["1"].splice(this.votes["1"].indexOf(username), 1);
                    }
                } else {
                    return;
                }
                io.emit("poll:votes", {
                    "1": this.votes["1"].length,
                    "2": this.votes["2"].length,
                });
            }
        });

        io.on("connection", (socket) => {
            console.log("A user connected:", socket.id);

            socket.on("disconnect", () => {
                console.log("A user disconnected:", socket.id);
            });

            socket.on("poll:start", (duration: number) => {
                console.log("Poll started.");
                this.startPoll(duration, socket);
            });
        });

        globalThis.socketServer = io;
        return io;
    }

    public static startPoll(duration: number, socket: any) {
        this.pollActive = true;
        this.votes = { "1": [], "2": [] };
        socket.emit("poll:started");
        console.log("Poll active for", duration, "seconds.");

        setTimeout(async () => {
            await this.endPoll(socket);
        }, duration * 1000);
    }

    private static async endPoll(socket: any) {
        this.pollActive = false;
        socket.emit("poll:ended");
        console.log("Poll ended. Results:", {
            "1": this.votes["1"].length,
            "2": this.votes["2"].length,
        });

        if (this.votes["1"].length == this.votes["2"].length) {
            return;
        } else if (this.votes["1"].length > this.votes["2"].length) {
            socket.emit("poll:winner", 1);
            const currentOutcome = await db.state.findFirst({
                include: {
                    currentOutcome: true,
                }
            })
            const newOutcome = currentOutcome?.currentOutcome?.decision1ID;
            if (newOutcome) {
                socket.emit("outcome:change", newOutcome);
                await db.state.update({
                    where: { id: 1 },
                    data: { currentOutcomeid: newOutcome }
                });
            }
        } else {
            socket.emit("poll:winner", 2);
            const currentOutcome = await db.state.findFirst({
                include: {
                    currentOutcome: true,
                }
            })
            const newOutcome = currentOutcome?.currentOutcome?.decision2ID;
            if (newOutcome) {
                socket.emit("outcome:change", newOutcome);
                await db.state.update({
                    where: { id: 1 },
                    data: { currentOutcomeid: newOutcome }
                });
            }
        }
    }

    public static async close(): Promise<void> {
        if (globalThis.socketServer) {
            await new Promise((resolve) => {
                globalThis.socketServer!.close(() => {
                    console.log("Socket server closed due to hot-reload.");
                    globalThis.socketServer = undefined;
                    resolve(null);
                });
            });
        }
    }
}

export default SocketServer;
