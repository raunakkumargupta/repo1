DROP TABLE IF EXISTS team_invitations;
DROP TABLE IF EXISTS team_join_requests;
ALTER TABLE teams DROP COLUMN IF EXISTS leader_id;
