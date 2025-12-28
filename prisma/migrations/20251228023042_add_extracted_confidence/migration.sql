-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "confidence" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "extracted" JSONB NOT NULL DEFAULT '{}';
