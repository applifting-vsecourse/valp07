-- AlterTable
ALTER TABLE "quack" ADD COLUMN "replyToId" TEXT,
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "quack_replyToId_idx" ON "quack"("replyToId");
CREATE INDEX "quack_createdAt_idx" ON "quack"("createdAt");

-- AddForeignKey
ALTER TABLE "quack" ADD CONSTRAINT "quack_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "quack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
