ALTER TABLE hacker_profiles
ADD COLUMN industry VARCHAR(255) DEFAULT '',
ADD COLUMN years_of_experience INT DEFAULT 0,
ADD COLUMN mentor_expertise TEXT DEFAULT '';
