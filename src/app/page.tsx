"use client";

import dynamic from 'next/dynamic';
import { io } from 'socket.io-client';
import type { Prisma } from "@prisma/client";
import { getCurrentOutcome, getOutcomes, initSocket, startPoll, setCurrentOutcome, startCustomPoll, toggleOverlay, selectWinnerManually } from "./actions/actions";
import { JSX, use, useEffect, useState } from "react";

interface LayoutItem {
    id: number;
    decision1ID: number | null;
    decision2ID: number | null;
    decision1Text: string | null;
    decision2Text: string | null;
    title: string;
    offset: number;
    distance: number;
    height: number;
}

const calculateLayout = (outcomes: Prisma.OutcomeGetPayload<{}>[]): Record<number, LayoutItem> => {
    const storage: Record<number, LayoutItem> = {};

    const root = outcomes[0];
    if (!root) return {};

    const discover = (id: number, offset: number, height: number = 0) => {
        const outcome = outcomes.find(outcome => outcome.id === id);
        if (!outcome) return;

        const existingOutcome = storage[outcome.id];
        if (existingOutcome) {
            const distance = offset - existingOutcome.offset;
            existingOutcome.distance = Math.max(existingOutcome.distance, distance);
            // update decision1 and decision2 with new offset if it is larger
            if (outcome.decision1ID) {
                const decision1 = storage[outcome.decision1ID];
                if (decision1) {
                    const oldoffset = decision1.offset;
                    decision1.offset = Math.max(decision1.offset, existingOutcome.offset + existingOutcome.distance + 1);
                    if (oldoffset !== decision1.offset) {
                        discover(decision1.id, decision1.offset, decision1.height);
                    }
                }
            }

            if (outcome.decision2ID) {
                const decision2 = storage[outcome.decision2ID];
                if (decision2) {
                    const oldoffset = decision2.offset;
                    decision2.offset = Math.max(decision2.offset, existingOutcome.offset + existingOutcome.distance + 1);
                    if (oldoffset !== decision2.offset) {
                        discover(decision2.id, decision2.offset, decision2.height);
                    }
                }
            }
            return;
        }

        const layoutItem: LayoutItem = {
            id: outcome.id,
            decision1ID: outcome.decision1ID,
            decision2ID: outcome.decision2ID,
            decision1Text: outcome.decision1Text,
            decision2Text: outcome.decision2Text,
            title: outcome.title,
            offset,
            distance: 0,
            height: height
        };
        storage[outcome.id] = layoutItem;

        if (outcome.decision1ID && outcome.decision2ID) {
            if ( outcome.decision1ID === 6) {
                console.log(`Outcome ${outcome.id} has decision1 ${outcome.decision1ID} and decision2 ${outcome.decision2ID}`);
                console.log(`Offset: ${offset}, Height: ${height}`);
            }
            discover(outcome.decision1ID, offset + 1, height);
            discover(outcome.decision2ID, offset + 1, height + 1);
        }
    };

    discover(root.id, 0);
    return storage;
};

function Graph() {
    const [outcomes, setOutcomes] = useState<Prisma.OutcomeGetPayload<{}>[]>([]);
    const [layout, setLayout] = useState<Record<number, LayoutItem>>({});
    const [current, setCurrent] = useState<number | null>(1);
    const [pollActive, setPollActive] = useState<boolean>(false);
    const [pollDuration, setPollDuration] = useState<number>(0);
    const [votes, setVotes] = useState<{ "1": number, "2": number }>({ "1": 0, "2": 0 });

    useEffect(() => {
        const fetchOutcomes = async () => {
            await initSocket();
            const data = await getOutcomes();
            setOutcomes(data);
            const currentId = await getCurrentOutcome();
            setCurrent(currentId || current);
        };
        fetchOutcomes();

        const socket = io('http://localhost:3001');

        socket.on("outcome:change", (id: number) => {
            setCurrent(id);
        });

        socket.on("poll:active", (isPollActive: boolean) => {
            setPollActive(isPollActive);
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


    useEffect(() => {
        const calculatedLayout = calculateLayout(outcomes);
        setLayout(calculatedLayout);
        console.log(calculatedLayout);
    }, [outcomes]);
    

    const calcLines = (referenceElem: HTMLElement, cx: number, cy: number, targetId: number, targetText: string, identifier: string, lines: JSX.Element[]) => {
        const target = document.getElementById(`graph-item-${targetId}`) as HTMLElement;

        if (!target) return;

        const ex = target.getBoundingClientRect().right - 48;
        const ey = target.getBoundingClientRect().top - 48;

        const mx = (cx + ex) / 2;

        const isCurrentOutcome = referenceElem.id.replace('graph-item-', '') === current?.toString();

        lines.push(
            <g id={`${referenceElem.id}-${target.id}-${identifier}`} key={`${referenceElem.id}-${target.id}-${identifier}`}>
                <foreignObject x={cx + 10} y={identifier === "top" ? cy : cy + referenceElem.getBoundingClientRect().height / 2} width={mx-cx-16} height="20">
                    <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-gray-400 pointer-events-auto" title={targetText}>
                        {targetText}
                    </p>
                </foreignObject>
                <line x1={cx} y1={cy + referenceElem.getBoundingClientRect().height / 2} x2={mx} y2={cy + referenceElem.getBoundingClientRect().height / 2} stroke={isCurrentOutcome ? '#22c55e' : `#3f3f47`} />
                <line x1={mx} y1={cy + referenceElem.getBoundingClientRect().height / 2} x2={mx} y2={ey + target.getBoundingClientRect().height / 2} stroke={isCurrentOutcome ? '#22c55e' : `#3f3f47`} />
                <line x1={mx} y1={ey + target.getBoundingClientRect().height / 2} x2={target.getBoundingClientRect().left - 48} y2={ey + target.getBoundingClientRect().height / 2} stroke={isCurrentOutcome ? '#22c55e' : `#3f3f47`} markerEnd="url(#arrow)" />
            </g>
        );
    };


    const renderLines = () => {
        const lines: JSX.Element[] = [];
        let maxWidth = 0;
        let maxHeight = 0;
        const graphElement = document.getElementById('graph') as HTMLElement | null;

        if (!graphElement) return lines;

        lines.push(
            <defs key="defs">
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L0,6 L9,3 z" fill="#3f3f47" />
                </marker>
            </defs>
        );

        document.querySelectorAll('.graph-item').forEach((item) => {
            const id = parseInt(item.id.replace('graph-item-', ''));
            const layoutItem = layout[id];
            if (!layoutItem) return;

            const cx = (item as HTMLElement).getBoundingClientRect().right - 48;
            const cy = (item as HTMLElement).getBoundingClientRect().top - 48;

            const bottom = (item as HTMLElement).getBoundingClientRect().bottom;

            if (cx > maxWidth) maxWidth = cx;
            if (bottom > maxHeight) maxHeight = bottom;

            if (layoutItem.decision1ID && layoutItem.decision1Text) {
                calcLines((item as HTMLElement), cx, cy, layoutItem.decision1ID, layoutItem.decision1Text, "top", lines);
            }

            if (layoutItem.decision2ID && layoutItem.decision2Text) {
                calcLines((item as HTMLElement), cx, cy, layoutItem.decision2ID, layoutItem.decision2Text, "bottom", lines);
            }
        });

        const svgElement = document.getElementById('graph-lines') as SVGElement | null;
        if (svgElement) {
            svgElement.setAttribute('height', `${maxHeight}px`);
            svgElement.setAttribute('width', `${maxWidth}px`);
        }

        if (graphElement) {
            graphElement.style.height = `${(maxHeight < window.innerHeight/2)? maxHeight : window.innerHeight/2}px`;
            graphElement.style.width = `${maxWidth}px`;
        }

        return lines;
    };

    return (
        <div className='flex flex-col bg-zinc-900 text-white w-screen min-h-screen p-6'>
            <div className='p-6 overflow-auto' style={
                {
                    backgroundImage: "linear-gradient(to right, rgba(63, 63, 71, 0.2) 1px, transparent 1px),linear-gradient(to bottom, rgba(63, 63, 71, 0.2) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                }
            }>
                <div className="relative h-screen w-screen" id="graph">
                    {layout && Object.values(layout).map((item) => {
                        const x = (item.offset + item.distance) * 420;
                        const y = item.height * 100;
                        return (
                            <div key={item.id} id={`graph-item-${item.id}`} className={`graph-item absolute border-zinc-700 bg-zinc-800 border p-2 rounded-md z-10 ${current === item.id && "outline outline-2 outline-green-500"}`} style={{ left: `${x}px`, top: `${y}px`, width: "200px" }}>
                                ({item.id}) {item.title}
                            </div>
                        );
                    })
                    }
                    <svg className="absolute top-0 left-0 min-w-full h-screen pointer-events-none z-0" id="graph-lines">
                        {renderLines()}
                    </svg>
                </div>
            </div>
            <div className='flex'>
                <div className="flex flex-col m-3 p-3 rounded-md w-fit max-w-96 gap-2  bg-zinc-800">
                    <h2 className="text-2xl">Outcomes</h2>
                    <ul className='flex flex-col gap-1 overflow-y-scroll max-h-[30vh] border-2 rounded-md border-zinc-500'>
                        {outcomes.map(outcome => (
                            <li 
                                key={outcome.id} 
                                className='odd:bg-zinc-700 even:bg-zinc-800 px-2 py-1 cursor-pointer hover:bg-zinc-600'
                                onClick={() => {
                                    const element = document.getElementById(`graph-item-${outcome.id}`);
                                    if (element) {
                                        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                                    }
                                }}
                            >
                                {outcome.title}
                            </li>
                        ))}
                    </ul>
                    {/* TODO: Implement */}
                    {/* <button className='border border-zinc-700 bg-zinc-800 hover:bg-zinc-600 w-fit px-2 py-1 rounded-lg'>Create Outcome</button> */}
                </div>
                <div className="flex flex-col m-3 p-3 rounded-md w-fit max-w-96 gap-2 h-fit max-h-[40vh] overflow-auto bg-zinc-800">
                    <h2 className="text-2xl">Current State</h2>
                    <p><span className='font-bold'>Outcome: </span>({current}) {layout[current!]?.title}</p>
                    <p><span className='font-bold'>Decision 1: </span>({layout[current!]?.decision1ID}) {layout[layout[current!]?.decision1ID || -1]?.title}</p>
                    <p><span className='font-bold'>Decision 2: </span>({layout[current!]?.decision2ID}) {layout[layout[current!]?.decision2ID || -1]?.title}</p>
                    <label htmlFor="outcome" className='mt-4'>Change Outcome</label>
                    <input id="outcome" type="number" className='px-1 border border-zinc-700 bg-zinc-800' defaultValue={current!}/>
                    <button 
                        disabled={pollActive}
                        className={`${pollActive && 'hover:cursor-not-allowed'} border border-zinc-700 bg-zinc-800 hover:bg-zinc-600 w-fit px-2 py-1 rounded-lg`}
                        onClick={() => {
                            const outcomeInput = document.getElementById('outcome') as HTMLInputElement;
                            const newOutcome = parseInt(outcomeInput.value);
                            setCurrentOutcome(newOutcome);
                        }}
                    >
                        Set Outcome
                    </button>
                </div> 
                <div className="flex flex-col m-3 p-3 rounded-md w-fit max-w-96 gap-2 h-fit max-h-[40vh] overflow-auto bg-zinc-800">
                    {/* TODO: Implement dynamic values and save values */}
                    <h2 className="text-2xl">Polling</h2>
                    <div className='flex gap-2'>
                        <label htmlFor="overlay" className='mt-4'>Toggle Overlay:</label>
                        <input id="overlay" type="checkbox" className='mt-3 px-1 border border-zinc-700 bg-zinc-800'
                        onChange={(e) => {
                            toggleOverlay(e.target.checked);
                        }}/>
                    </div>
                    <p>Poll Active: {pollActive ? 'True' : 'False'}</p>
                    <p>Duration: {pollDuration} seconds</p>
                    <p>Decision 1 Votes: {votes["1"]}</p>
                    <p>Decision 2 Votes: {votes["2"]}</p>
                    <button onClick={() => startPoll()} disabled={pollActive} className={`${pollActive && 'hover:cursor-not-allowed'} border border-zinc-700 bg-zinc-800 hover:bg-zinc-600 w-fit px-2 py-1 rounded-lg`}>Start Outcome Poll</button>
                </div>
                <div className="flex flex-col m-3 p-3 rounded-md max-w-96 gap-2 h-fit max-h-[40vh] overflow-auto bg-zinc-800">
                    <h2 className="text-2xl">Custom Poll</h2>
                    <label htmlFor="poll-title">Poll Title</label>
                    <input id="poll-title" type="text" className='px-1 border border-zinc-700 bg-zinc-800'/>
                    <label htmlFor="decision1">Decision 1</label>
                    <input id="decision1" type="text" className='px-1 border border-zinc-700 bg-zinc-800'/>
                    <label htmlFor="decision2">Decision 2</label>
                    <input id="decision2" type="text" className='px-1 border border-zinc-700 bg-zinc-800'/>
                    <label htmlFor='duration'>Duration (seconds)</label>
                    <input id='duration' type='number' className='px-1 border border-zinc-700 bg-zinc-800' defaultValue={30}/>
                    <button onClick={() => {
                        const titleInput = document.getElementById('poll-title') as HTMLInputElement;
                        const decision1Input = document.getElementById('decision1') as HTMLInputElement;
                        const decision2Input = document.getElementById('decision2') as HTMLInputElement;
                        const durationInput = document.getElementById('duration') as HTMLInputElement;
                        startCustomPoll(titleInput.value, parseInt(durationInput.value), decision1Input.value, decision2Input.value);
                    }}
                    disabled={pollActive}
                    className={`${pollActive && 'hover:cursor-not-allowed'} border border-zinc-700 bg-zinc-800 hover:bg-zinc-600 w-fit px-2 py-1 rounded-lg`}>Start Poll</button>
                </div>
                {!pollActive && (
                    <div className="flex flex-col m-3 p-3 rounded-md max-w-96 gap-2 h-fit max-h-[40vh] overflow-auto bg-zinc-800">
                        <h2 className="text-2xl">Select A Winner</h2>
                        <p className='text-sm w-48'>Will go based on what's under "Current State" not what's on the poll overlay<span className="text-red-400">*</span></p>
                        <div className="flex gap-2">
                            <button onClick={() => selectWinnerManually(1)} className='border border-zinc-700 bg-zinc-800 hover:bg-zinc-600 w-fit px-2 py-1 rounded-lg'>Decision 1</button>
                            <button onClick={() => selectWinnerManually(2)} className='border border-zinc-700 bg-zinc-800 hover:bg-zinc-600 w-fit px-2 py-1 rounded-lg'>Decision 2</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
// Todo: Implement right click context menu for outcomes

export default dynamic(() => Promise.resolve(Graph), { ssr: false });
