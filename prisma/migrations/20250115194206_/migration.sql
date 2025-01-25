-- CreateTable
CREATE TABLE "State" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "currentOutcomeid" INTEGER NOT NULL,
    CONSTRAINT "State_currentOutcomeid_fkey" FOREIGN KEY ("currentOutcomeid") REFERENCES "Outcome" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "decision1Text" TEXT,
    "decision2Text" TEXT,
    "decision1ID" INTEGER,
    "decision2ID" INTEGER,
    "flairid" INTEGER,
    CONSTRAINT "Outcome_decision1ID_fkey" FOREIGN KEY ("decision1ID") REFERENCES "Outcome" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Outcome_decision2ID_fkey" FOREIGN KEY ("decision2ID") REFERENCES "Outcome" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Outcome_flairid_fkey" FOREIGN KEY ("flairid") REFERENCES "Flair" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Flair" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "colour" TEXT NOT NULL
);
