"use client";

import type { Prisma } from "@prisma/client";
import { getOutcomes } from "../actions/actions";
import { useEffect, useState } from "react";

interface LayoutItem {
    decision1ID: number | null;
    decision2ID: number | null;
    title: string;
    offset: number;
    distance: number;
    height: number;
}

const calculateLayout = (outcomes: Prisma.OutcomeGetPayload<{}>[]): Record<number, LayoutItem> => {
    const storage: Record<number, LayoutItem> = {};

    const root = outcomes[0];
    if (!root) return {};

    const discover = (id: number, offset: number, height: number=0) => {
        const outcome = outcomes.find(outcome => outcome.id === id);
        if (!outcome) return 0;

        const existingOutcome = storage[outcome.id];
        if (existingOutcome) {
            const distance = offset - existingOutcome.offset;
            existingOutcome.distance = Math.max(existingOutcome.distance, distance);
            return existingOutcome.height;
        }

        const layoutItem: LayoutItem = {
            decision1ID: outcome.decision1ID,
            decision2ID: outcome.decision2ID,
            title: outcome.title,
            offset,
            distance: 0,
            height: height
        };
        storage[outcome.id] = layoutItem;

        if (outcome.decision1ID && outcome.decision2ID) {
            discover(outcome.decision1ID, offset+1, height);
            discover(outcome.decision2ID, offset+1, height + 1);
        } else if (outcome.decision1ID) {
            discover(outcome.decision1ID, offset+1, height);
        } else if (outcome.decision2ID) {
            discover(outcome.decision2ID, offset+1, height);
        } 
    };

    discover(root.id, 0);
    return storage;
};

const findOutcomeInLayout = (layout: Record<number, LayoutItem>, id: number): LayoutItem | null => {
    return layout[id] || null;
};

export default function Graph() {
    const [outcomes, setOutcomes] = useState<Prisma.OutcomeGetPayload<{}>[]>([]);
    const [layout, setLayout] = useState<Record<number, LayoutItem>>({});

    useEffect(() => {
        const fetchOutcomes = async () => {
            const data = await getOutcomes();
            setOutcomes(data);
        };
        fetchOutcomes();
    }, []);

    useEffect(() => {
        const calculatedLayout = calculateLayout(outcomes);
        setLayout(calculatedLayout);
        console.log(calculatedLayout);
    }, [outcomes]);

   

    return (
        <div className="relative w-full h-screen">
            {/* for each outcome display it */}
            {layout && Object.values(layout).map((item, index) => {
                const x = (item.offset + item.distance) * 100;
                const y = item.height * 100;
                return (
                    <div key={index} className="absolute bg-gray-200 p-2 rounded-md" style={{left: `${x}px`, top: `${y}px`}}>
                        {item.title}
                    </div>
                );
            })
            }
        </div>
    );
}
