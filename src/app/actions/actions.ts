"use server";

import { db } from "@/server/db";
import socket from '@/server/socket';


export const getOutcomes = async () => {
    return await db.outcome.findMany();
}

export const getCurrentOutcome = async () => {
    return (await db.state.findFirst())?.currentOutcomeid;
}

export const setCurrentOutcome = async (id: number) => {
    return await db.state.update({
        where: { id: 1 },
        data: { currentOutcomeid: id }
    });
}

export const startPoll = async (duration: number) => {
    const socketInstance = await socket.getInstance(3001);
    socket.startPoll(duration, socketInstance);
}

export const initSocket = async () => {
    await socket.getInstance(3001);
    return;
}