-- Alter hackathons table to support rich detail fields
ALTER TABLE hackathons 
ADD COLUMN problem_statement TEXT,
ADD COLUMN prizes TEXT,
ADD COLUMN schedule TEXT,
ADD COLUMN sponsors TEXT,
ADD COLUMN min_team_size INT DEFAULT 1,
ADD COLUMN max_team_size INT DEFAULT 4,
ADD COLUMN registration_fee VARCHAR(50) DEFAULT 'Free';
