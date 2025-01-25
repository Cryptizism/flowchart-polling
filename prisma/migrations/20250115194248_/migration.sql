-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_State" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "currentOutcomeid" INTEGER,
    CONSTRAINT "State_currentOutcomeid_fkey" FOREIGN KEY ("currentOutcomeid") REFERENCES "Outcome" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_State" ("currentOutcomeid", "id") SELECT "currentOutcomeid", "id" FROM "State";
DROP TABLE "State";
ALTER TABLE "new_State" RENAME TO "State";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
