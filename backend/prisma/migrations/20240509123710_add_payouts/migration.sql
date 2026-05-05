/*
  Warnings:

  - Changed the type of `amount` on the `Submission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TxnStatus" AS ENUM ('Processing', 'Success', 'Failure');

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "amount",
ADD COLUMN     "amount" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Payouts" (
    "id" SERIAL NOT NULL,
    "worker_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "signature" TEXT NOT NULL,
    "status" "TxnStatus" NOT NULL,

    CONSTRAINT "Payouts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Payouts" ADD CONSTRAINT "Payouts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
