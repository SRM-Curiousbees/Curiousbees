-- CuriousBees V2 — DATABASE SCHEMA & SEED INITIALIZATION SCRIPT
-- ==============================================================================
-- Run this script in your Supabase project's SQL Editor to set up all tables,
-- relations, indexes, and beautiful default mock data instantly.
-- ==============================================================================

-- 1. DROP EXISTING TABLES (IF REDEPLOYING)
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS threads CASCADE;
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS user_interests CASCADE;
DROP TABLE IF EXISTS research_interests CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. CREATE DATABASE TABLES
-- A. Users Table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    email_verified TIMESTAMP WITH TIME ZONE,
    image TEXT,
    role TEXT NOT NULL DEFAULT 'PHD_SCHOLAR' CHECK (role IN ('FACULTY', 'PHD_SCHOLAR')),
    department TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- B. Research Interests Lookup Table
CREATE TABLE research_interests (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- C. User Interests Junction Table (Many-to-Many relationship)
CREATE TABLE user_interests (
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    interest_id TEXT REFERENCES research_interests(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, interest_id)
);

-- D. Research Proposal Threads Table
CREATE TABLE threads (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- E. Thread Comments Table
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    thread_id TEXT REFERENCES threads(id) ON DELETE CASCADE,
    author_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- F. Opportunities Table (PhD/RA positions)
CREATE TABLE opportunities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    department TEXT NOT NULL,
    research_domain TEXT NOT NULL,
    author_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- G. Events Table
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    event TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    venue TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREATE DYNAMIC UPDATE TIMESTAMP FUNCTIONS
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_threads_modtime BEFORE UPDATE ON threads FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_comments_modtime BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_opportunities_modtime BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_events_modtime BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 4. INSERT MOCK SEED DATA FOR IMMEDIATE OUT-OF-THE-BOX USE
-- A. Seed Users
INSERT INTO users (id, name, email, image, role, department, bio)
VALUES
('u1', 'Dr. Anand Ramachandran', 'dr.anand@srmist.edu.in', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'FACULTY', 'Computing Technologies (CSE / IT / Swe)', 'Professor of Computer Science. Researching distributed systems, edge computing, and large language model optimizations for low-resource environments.'),
('u2', 'Dr. Priya Subramanian', 'dr.priya@srmist.edu.in', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'FACULTY', 'Biotechnology & Bioengineering', 'Associate Professor of Bioengineering. Focused on genomic sequencing algorithms, targeted drug delivery, and computational oncology.'),
('u3', 'Suresh Karthik', 'scholar.suresh@srmist.edu.in', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'PHD_SCHOLAR', 'Computing Technologies (CSE / IT / Swe)', 'PhD Candidate supervised by Dr. Anand. Working on parameter-efficient fine-tuning (PEFT) methods for vision-language models.');

-- B. Seed Research Interests
INSERT INTO research_interests (id, name)
VALUES
('1', 'Generative AI & LLMs'),
('2', 'Quantum Computing'),
('3', 'Silicon Photonics'),
('4', 'Nanomaterials & Thin Films'),
('5', 'Cancer Immunotherapy'),
('6', '5G/6G Wireless Networks'),
('7', 'VLSI System Design'),
('8', 'Bioinformatics');

-- C. Seed User Interests Connections
INSERT INTO user_interests (user_id, interest_id)
VALUES
('u1', '1'),
('u1', '8'),
('u2', '5'),
('u2', '8'),
('u3', '1');

-- D. Seed Research Discussions & Threads
INSERT INTO threads (id, title, content, author_id, tags, created_at)
VALUES
('t1', 
 'Call for Collaboration: GPGPU Resource Sharing for LLM Fine-Tuning', 
 'Hello Colleagues,

Our lab in the Computing Technologies department has recently set up a cluster of 4x NVIDIA H100 GPUs for fine-tuning custom models on institutional datasets. 

We are currently looking to collaborate with faculty members in the Biotechnology & Bioengineering department who need GPU cycles to accelerate protein fold sequencing or drug discovery workflows. 

If your PhD scholars have computationally demanding deep learning workloads (written in PyTorch or JAX), please reach out. We would love to co-author and share these resources to produce high-impact joint publications.

Best regards,
Dr. Anand Ramachandran', 
 'u1', 
 ARRAY['GPU Cluster', 'Generative AI & LLMs', 'Bioinformatics', 'Collaboration'],
 NOW() - INTERVAL '3 hours'),
('t2', 
 'Interdisciplinary Study on Silicon Photonics-based Genomic Sequencing Chips', 
 'Hi everyone,

I am drafting a proposal for the upcoming DST-SERB Core Research Grant focusing on creating high-throughput genomic sequencing sensors integrated directly on-chip using silicon photonics.

This is a highly cross-disciplinary endeavor requiring:
1. ECE experts with experience in silicon waveguide fabrication and optical resonators (Dr. Ramesh''s team).
2. Biotech experts with experience in bio-functionalizing chip surfaces to bind DNA molecules (my team).
3. Computer Science experts to design fast signal decoding algorithms directly running on raw optical sensor data.

We are holding an initial brainstorming session in the ECE Seminar Hall next Friday at 2:00 PM. Please reply to this thread if you are interested in joining the proposal!

Best,
Dr. Priya Subramanian', 
 'u2', 
 ARRAY['Silicon Photonics', 'Bioinformatics', 'Research Grant', 'DST-SERB'],
 NOW() - INTERVAL '24 hours');

-- E. Seed Thread Comments
INSERT INTO comments (id, content, thread_id, author_id, created_at)
VALUES
('c1', 'Dr. Anand, my PhD scholar Divya Nambiar is currently running molecular modeling using very heavy Graph Neural Networks. Our current local RTX 3090s are taking weeks to complete the epochs. Access to your H100 cluster would speed up her thesis work by at least 10x. We would be absolutely thrilled to collaborate!', 't1', 'u2', NOW() - INTERVAL '2 hours'),
('c2', 'Thank you Dr. Priya! Yes, Divya is welcome to share our cluster. I have asked my PhD scholar Suresh to set up Docker containers and provision SSH keys for her. Let''s schedule a Zoom call this Monday to align on the technical details.', 't1', 'u1', NOW() - INTERVAL '1 hours');

-- F. Seed Academic Opportunities
INSERT INTO opportunities (id, title, description, department, research_domain, author_id, created_at)
VALUES
('o1', 
 'PhD Position: Reinforcement Learning for Smart Grid Optimization', 
 'We are seeking an outstanding PhD candidate to join the EEE department under the joint supervision of EEE and CSE faculty.

The project involves designing multi-agent reinforcement learning (MARL) algorithms to optimize energy distribution and load balancing in next-generation microgrids.

Required Qualifications:
- B.Tech/M.Tech in EEE, ECE, or CSE with a strong academic track record.
- Exceptional programming skills in Python (PyTorch or TensorFlow).
- Solid foundation in linear algebra, probability, and control systems.

Funding: Monthly stipend of ₹38,000 + HRA as per SRM Institute norms for the first 2 years, upgradable to SRF in the 3rd year.', 
 'Electrical & Electronics Engineering (EEE)', 
 'Reinforcement Learning', 
 'u1', 
 NOW() - INTERVAL '12 hours'),
('o2', 
 'Research Assistant: 2D Nanomaterials for Energy Storage', 
 'The Materials Science Lab is recruiting a full-time Research Assistant (RA) for a sponsored project on synthesizing transition metal dichalcogenide (TMD) thin films for supercapacitor electrodes.

Key Responsibilities:
- Physical vapor deposition (PVD) and chemical vapor deposition (CVD) synthesis of thin films.
- Characterization using XRD, SEM, and Raman spectroscopy.
- Electrochemical performance evaluation using cyclic voltammetry.

Duration: 12 Months (extendable based on performance and fund availability).
Stipend: ₹31,000 consolidated per month.', 
 'Chemistry & Materials Science', 
 'Nanomaterials & Thin Films', 
 'u2', 
 NOW() - INTERVAL '48 hours');

-- G. Seed Calendar Events
INSERT INTO events (id, event, date, time, venue, created_at)
VALUES
('e1', 'PhD Viva Defense: GPGPU Virtualization & LLM Tuning', TO_CHAR(NOW(), 'YYYY-MM-DD'), '10:00 AM', 'ECE Seminar Hall (PG Block)', NOW()),
('e2', 'Seminar: DNA-functionalized Silicon Photonics Ring Resonators', TO_CHAR(NOW() + INTERVAL '1 day', 'YYYY-MM-DD'), '02:30 PM', 'Biotech Conference Room', NOW()),
('e3', 'Workshop: DST-SERB Proposal Drafting & Grant Compliance', TO_CHAR(NOW() + INTERVAL '2 day', 'YYYY-MM-DD'), '11:15 AM', 'Main Auditorium (Administrative Block)', NOW());

-- ==============================================================================
-- SCHEMA COMPLETED SUCCESSFULLY
-- ==============================================================================
