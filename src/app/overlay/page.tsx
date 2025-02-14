"use client";

import { io } from 'socket.io-client';
import { useEffect, useState } from "react";
import {PT_Serif} from "next/font/google"

const pt_serif = PT_Serif({ weight: '700' });
const pt_serif_light = PT_Serif({ weight: '400' });


export default function Overlay() {
    const [dislayOverlay, setDisplayOverlay] = useState<boolean>(false);
    const [pollActive, setPollActive] = useState<boolean>(false);
    const [pollDuration, setPollDuration] = useState<number>(0);
    const [pollDetails, setPollDetails] = useState<{ title: string, decisions: { "1": string, "2": string } }>({ title: "", decisions: { "1": "", "2": "" } });
    const [votes, setVotes] = useState<{ "1": number, "2": number }>({ "1": 0, "2": 0 });
    const [winner, setWinner] = useState<number | null>(null);

    useEffect(() => {
        const socket = io('http://localhost:3001');

        socket.on("poll:details", (details: { decisions : { "1": string, "2": string }, title: string, duration: number }) => {
            setPollDetails({ title: details.title, decisions: details.decisions });
        });

        socket.on("poll:overlay", (overlay: boolean) => {
            setDisplayOverlay(overlay);
        });

        socket.on("poll:active", (isPollActive: boolean) => {
            setPollActive(isPollActive);
            if (isPollActive) {
                setWinner(null);
            }
        });

        socket.on("poll:winner", (winner: number) => {
            setWinner(winner);
        });

        socket.on("poll:votes", (votes: { "1": number, "2": number }) => {
            setVotes(votes);
        });

        socket.on("poll:countdown", (duration: number) => {
            setPollDuration(duration);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <div className={`${pt_serif.className} flex flex-col h-screen ${dislayOverlay || pollActive ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200 ease-in-out justify-end`}>
            <h1 className="text-4xl text-center text-yellow-300 italic tracking-wider" style={
                { textShadow: '0 0 10px #000, 0 0 10px #000, 0 0 10px #000' }
            }>
                {pollDetails.title}
            </h1>
            <div className={`flex justify-around items-center ${Object.values(pollDetails.decisions).reduce((a, b) => a.length > b.length ? a : b, "").length > 60 ? '' : 'mx-72'} mb-12`}>
                {(["1", "2"] as const).map((key) => (
                    <div key={key} className={`flex flex-col ${pollDetails.decisions[key].length > 50 ? 'text-4xl' : 'text-5xl'} italic justify-between flex-1 m-4 p-3 h-64 text-center rounded-2xl ${pollActive || winner === parseInt(key) ? 'bg-[rgba(0,0,0,0.7)]' : 'bg-[rgba(0,0,0,0.5)]'} ${pollActive || winner === parseInt(key) ? 'scale-90 text-white' : 'scale-[0.85] text-zinc-400'} transition-all duration-300 ease-in-out`}> {/* border-2 border-solid border-zinc-400 */}
                        <h1 className='text-left italic'>{key}</h1>
                        <h2 className='italic'>{pollDetails.decisions[key]}</h2>
                        <div className="italic text-right mr-2">
                            {votes[key] / (votes["1"] + votes["2"]) * 100 || 0}%
                        </div>
                    </div>
                ))}
            </div>
            <div className="absolute bottom-6 w-screen text-center text-4xl text-yellow-300 italic" style={
                { textShadow: '0 0 10px #000, 0 0 10px #000, 0 0 10px #000' }
            }>
                {pollDuration}s
            </div>
        </div>
    );
}
