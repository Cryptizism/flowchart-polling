"use client";

import dynamic from 'next/dynamic';
import { io } from 'socket.io-client';
import type { Prisma } from "@prisma/client";
import { getCurrentOutcome, getOutcomes, initSocket, startPoll } from "../actions/actions";
import { JSX, useEffect, useState } from "react";

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
        if (!outcome) return 0;

        const existingOutcome = storage[outcome.id];
        if (existingOutcome) {
            const distance = offset - existingOutcome.offset;
            existingOutcome.distance = Math.max(existingOutcome.distance, distance);
            return existingOutcome.height;
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
            discover(outcome.decision1ID, offset + 1, height);
            discover(outcome.decision2ID, offset + 1, height + 1);
        } else if (outcome.decision1ID) {
            discover(outcome.decision1ID, offset + 1, height);
        } else if (outcome.decision2ID) {
            discover(outcome.decision2ID, offset + 1, height);
        }
    };

    discover(root.id, 0);
    return storage;
};

function Graph() {
    const [outcomes, setOutcomes] = useState<Prisma.OutcomeGetPayload<{}>[]>([]);
    const [layout, setLayout] = useState<Record<number, LayoutItem>>({});
    const [current, setCurrent] = useState<number | null>(1);

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

        const ex = target.getBoundingClientRect().right;
        const ey = target.getBoundingClientRect().top;

        const mx = (cx + ex) / 2;


        lines.push(
            <g id={`${referenceElem.id}-${target.id}-${identifier}`} key={`${referenceElem.id}-${target.id}-${identifier}`}>
                <text x={cx + 10} y={identifier === "top" ? cy : cy + referenceElem.getBoundingClientRect().height / 2} textAnchor="start" dy="1em" fill='#9f9fa9'>{targetText}</text>
                <line x1={cx} y1={cy + referenceElem.getBoundingClientRect().height / 2} x2={mx} y2={cy + referenceElem.getBoundingClientRect().height / 2} stroke="#3f3f47" />
                <line x1={mx} y1={cy + referenceElem.getBoundingClientRect().height / 2} x2={mx} y2={ey + target.getBoundingClientRect().height / 2} stroke="#3f3f47" />
                <line x1={mx} y1={ey + target.getBoundingClientRect().height / 2} x2={target.getBoundingClientRect().left} y2={ey + target.getBoundingClientRect().height / 2} stroke="#3f3f47" markerEnd="url(#arrow)" />
            </g>
        );
    };


    const renderLines = () => {
        const lines: JSX.Element[] = [];
        let maxWidth = 0;

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

            const cx = (item as HTMLElement).getBoundingClientRect().right;
            const cy = (item as HTMLElement).getBoundingClientRect().top;

            if (cx > maxWidth) maxWidth = cx;

            if (layoutItem.decision1ID && layoutItem.decision1Text) {
                calcLines((item as HTMLElement), cx, cy, layoutItem.decision1ID, layoutItem.decision1Text, "top", lines);
            }

            if (layoutItem.decision2ID && layoutItem.decision2Text) {
                calcLines((item as HTMLElement), cx, cy, layoutItem.decision2ID, layoutItem.decision2Text, "bottom", lines);
            }
        });

        const svgElement = document.getElementById('graph-lines') as SVGElement | null;
        if (svgElement) {
            svgElement.setAttribute('width', `${maxWidth}px`);
        }

        return lines;
    };

    return (
        <div className="relative w-[100%-1rem] h-screen overflow-auto bg-zinc-900 text-white" id="graph">
            {layout && Object.values(layout).map((item) => {
                const x = (item.offset + item.distance) * 420;
                const y = item.height * 100;
                return (
                    <div key={item.id} id={`graph-item-${item.id}`} className={`graph-item absolute border-zinc-700 bg-zinc-800 border p-2 rounded-md ${current === item.id && "outline outline-4 outline-green-500"}`} style={{ left: `${x}px`, top: `${y}px`, width: "200px" }}>
                        {item.title}
                    </div>
                );
            })
            }
            <svg className="absolute top-0 left-0 min-w-full h-[50vh]" id="graph-lines">
                {renderLines()}
            </svg>
            <button onClick={() => startPoll(10)} className="absolute bottom-0 right-0 p-2 bg-blue-500 text-white rounded-md">Start Poll</button>
        </div>
    );
}

export default dynamic(() => Promise.resolve(Graph), { ssr: false });
