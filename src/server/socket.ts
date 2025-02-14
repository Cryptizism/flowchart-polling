import { Server } from "socket.io";
import { db } from "@/server/db";
import tmi from "tmi.js";

declare global {
    var socketServer: Server | undefined;
    var tmiClient: tmi.Client | undefined;
}

class SocketServer {
    private static pollActive: boolean = false;
    private static overlayActive: boolean = false;
    private static pollDetails: { title: string, decision1: string, decision2: string } | null = null;
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

        const tmiClient = globalThis.socketServer || tmi.client({
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

            // Send current states
            socket.emit("poll:active", this.pollActive);
            socket.emit("poll:overlay", this.overlayActive);
            socket.emit("poll:votes", {
                "1": this.votes["1"].length,
                "2": this.votes["2"].length,
            });
            if (this.pollDetails) {
                socket.emit("poll:details", {
                    decisions: {
                        "1": this.pollDetails.decision1,
                        "2": this.pollDetails.decision2,
                    },
                    title: this.pollDetails.title,
                });
            }

            socket.on("disconnect", () => {
                console.log("A user disconnected:", socket.id);
            });
        });

        globalThis.socketServer = io;
        return io;
    }

    public static async toggleOverlay(active: boolean, socket: any) {
        this.overlayActive = active;
        socket.emit("poll:overlay", active);
    }

    public static startCustomPoll(title: string, duration: number, socket: any, decision1: string, decision2: string) {
        this.startPollCommon(duration, socket, { title, decision1, decision2 });
    }

    public static async startPoll(socket: any) {
        const currentOutcome = await db.state.findFirst({
            include: {
                currentOutcome: true,
            }
        });

        const duration = currentOutcome?.currentOutcome?.duration || 30;
        const title = currentOutcome?.currentOutcome?.title;
        const decision1 = currentOutcome?.currentOutcome?.decision1Text;
        const decision2 = currentOutcome?.currentOutcome?.decision2Text;

        if (!title || !decision1 || !decision2) {
            return;
        }

        this.startPollCommon(duration, socket, { title, decision1, decision2 }, currentOutcome);
    }

    private static startPollCommon(duration: number, socket: any, details: { title: string, decision1: string, decision2: string }, currentOutcome?: any) {
        this.pollActive = true;
        this.votes = { "1": [], "2": [] };
        socket.emit("poll:active", true);
        this.pollDetails = details;
        socket.emit("poll:details", {
            decisions: {
                "1": details.decision1,
                "2": details.decision2,
            },
            title: details.title,
            duration
        });
        socket.emit("poll:votes", {
            "1": this.votes["1"].length,
            "2": this.votes["2"].length,
        })
        socket.emit("poll:countdown", duration);


        console.log("Poll active for", duration, "seconds.");
        
        const interval = setInterval(() => {
            duration--;
            socket.emit("poll:countdown", duration);
            if (duration <= 0) {
                clearInterval(interval);
                if (currentOutcome) {
                    this.endPoll(socket, currentOutcome);
                } else {
                    this.endCustomPoll(socket);
                }
            }
        }, 1000);
    }

    private static async endPoll(socket: any, currentOutcome?: any) {
        this.pollActive = false;
        socket.emit("poll:active", false);
        console.log("Poll ended. Results:", {
            "1": this.votes["1"].length,
            "2": this.votes["2"].length,
        });

        if (this.votes["1"].length == this.votes["2"].length) {
            return;
        } else if (this.votes["1"].length > this.votes["2"].length) {
            socket.emit("poll:winner", 1);
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

    private static endCustomPoll(socket: any) {
        this.pollActive = false;
        socket.emit("poll:active", false);
        console.log("Poll ended. Results:", {
            "1": this.votes["1"].length,
            "2": this.votes["2"].length,
        });

        if (this.votes["1"].length == this.votes["2"].length) {
            return;
        } else if (this.votes["1"].length > this.votes["2"].length) {
            socket.emit("poll:winner", 1);
        } else {
            socket.emit("poll:winner", 2);
        }
    }

    public static async selectWinnerManually(socket: any, winner: number) {
        if (winner !== 1 && winner !== 2) {
            return;
        }

        this.pollActive = false;
        socket.emit("poll:active", false);
        socket.emit("poll:winner", winner);

        const currentOutcome = await db.state.findFirst({
            include: {
                currentOutcome: true,
            }
        });

        if (winner === 1) {
            const newOutcome = currentOutcome?.currentOutcome?.decision1ID;
            if (newOutcome) {
                socket.emit("outcome:change", newOutcome);
                await db.state.update({
                    where: { id: 1 },
                    data: { currentOutcomeid: newOutcome }
                });
            }
        } else if (winner === 2) {
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
