-- CreateTable
CREATE TABLE "JourneyQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteText" TEXT NOT NULL,
    "source" TEXT,
    "actionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JourneyQuote_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "JourneyAction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
