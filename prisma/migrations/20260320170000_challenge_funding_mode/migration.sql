-- Add funding mode to support creator-funded and split participant deposit flows
CREATE TYPE "ChallengeFundingMode" AS ENUM ('SPLIT_PARTICIPANT', 'CREATOR_FUNDED');

ALTER TABLE "Challenge"
ADD COLUMN "fundingMode" "ChallengeFundingMode" NOT NULL DEFAULT 'SPLIT_PARTICIPANT';
