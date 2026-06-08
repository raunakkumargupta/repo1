-- Rollback rich detail fields from hackathons table
ALTER TABLE hackathons 
DROP COLUMN IF EXISTS problem_statement,
DROP COLUMN IF EXISTS prizes,
DROP COLUMN IF EXISTS schedule,
DROP COLUMN IF EXISTS sponsors,
DROP COLUMN IF EXISTS min_team_size,
DROP COLUMN IF EXISTS max_team_size,
DROP COLUMN IF EXISTS registration_fee;
