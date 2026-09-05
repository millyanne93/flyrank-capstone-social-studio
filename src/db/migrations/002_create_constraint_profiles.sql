CREATE TABLE constraint_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL UNIQUE,
    max_length INTEGER NOT NULL,
    tone TEXT NOT NULL,
    min_hashtags INTEGER NOT NULL DEFAULT 0,
    max_hashtags INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_constraint_profiles_platform ON constraint_profiles(platform);
