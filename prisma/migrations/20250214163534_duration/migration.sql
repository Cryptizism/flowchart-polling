-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Outcome" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "decision1Text" TEXT,
    "decision2Text" TEXT,
    "decision1ID" INTEGER,
    "decision2ID" INTEGER,
    "flairid" INTEGER,
    "duration" INTEGER NOT NULL DEFAULT 30,
    CONSTRAINT "Outcome_decision1ID_fkey" FOREIGN KEY ("decision1ID") REFERENCES "Outcome" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Outcome_decision2ID_fkey" FOREIGN KEY ("decision2ID") REFERENCES "Outcome" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Outcome_flairid_fkey" FOREIGN KEY ("flairid") REFERENCES "Flair" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Outcome" ("decision1ID", "decision1Text", "decision2ID", "decision2Text", "flairid", "id", "title") SELECT "decision1ID", "decision1Text", "decision2ID", "decision2Text", "flairid", "id", "title" FROM "Outcome";
DROP TABLE "Outcome";
ALTER TABLE "new_Outcome" RENAME TO "Outcome";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
