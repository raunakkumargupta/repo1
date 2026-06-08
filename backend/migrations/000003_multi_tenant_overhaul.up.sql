-- Alter users role check constraint to support new multi-tenant roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('SuperAdmin', 'Organizer', 'Judge', 'Mentor', 'Hacker', 'Admin', 'Manager', 'Agent', 'User', 'Moderator'));

-- Drop old tables to recreate with multi-tenant structure
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS hackathons CASCADE;
DROP TABLE IF EXISTS hack_staff CASCADE;
DROP TABLE IF EXISTS hackathon_staff CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;

-- 1. Hackathons Table
CREATE TABLE hackathons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image VARCHAR(255),
    tracks JSONB, -- e.g., ["AI", "Web3", "Mobile", "Quantum"]
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (registration_status IN ('open', 'closed')),
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Event-Specific Registrations
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
    github_url VARCHAR(255),
    linkedin_url VARCHAR(255),
    skills JSONB, -- Array of skills: ["React", "Go"]
    team_preference VARCHAR(50) NOT NULL DEFAULT 'Solo' CHECK (team_preference IN ('Solo', 'Looking for Team', 'Has Team')),
    approval_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Accepted', 'Rejected')),
    resume_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, hackathon_id)
);

-- 3. Teams Table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
    team_name VARCHAR(255) NOT NULL,
    invite_code VARCHAR(50) UNIQUE NOT NULL,
    repository_url VARCHAR(255),
    is_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Team Members Link Table
CREATE TABLE team_members (
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, user_id)
);

-- 5. Help Request Tickets Table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    assigned_mentor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Active', 'Resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Project Evaluation Scoring Table
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    judge_id UUID REFERENCES users(id) ON DELETE CASCADE,
    technical_score INT NOT NULL CHECK (technical_score >= 1 AND technical_score <= 10),
    design_score INT NOT NULL CHECK (design_score >= 1 AND design_score <= 10),
    innovation_score INT NOT NULL CHECK (innovation_score >= 1 AND innovation_score <= 10),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (team_id, judge_id)
);

-- 7. Hackathon Specific Staff Roles
CREATE TABLE hackathon_staff (
    hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Judge', 'Mentor')),
    PRIMARY KEY (hackathon_id, user_id)
);

-- 8. Platform Announcements / Broadcasts Table
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
