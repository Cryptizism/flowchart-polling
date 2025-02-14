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
    await db.state.update({
        where: { id: 1 },
        data: { currentOutcomeid: id }
    });
    const socketInstance = await socket.getInstance(3001);
    socketInstance.emit("outcome:change", id);
}

export const startPoll = async (duration: number) => {
    const socketInstance = await socket.getInstance(3001);
    socket.startPoll(duration, socketInstance);
}

export const startCustomPoll = async (title: string, duration: number, decision1: string, decision2: string) => {
    const socketInstance = await socket.getInstance(3001);
    socket.startCustomPoll(title, duration, socketInstance, decision1, decision2);
}

export const toggleOverlay = async (active: boolean) => {
    const socketInstance = await socket.getInstance(3001);
    socket.toggleOverlay(active, socketInstance);
}

export const initSocket = async () => {
    await socket.getInstance(3001);
    return;
}