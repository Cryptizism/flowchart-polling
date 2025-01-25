"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getOutcomes = async () => {
    return await prisma.outcome.findMany();
}