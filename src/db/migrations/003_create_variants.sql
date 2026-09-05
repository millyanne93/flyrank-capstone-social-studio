CREATE TYPE variant_status AS ENUM ('draft', 'approved', 'rejected', 'published');

CREATE TABLE variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL REFERENCES constraint_profiles(platform),
    content TEXT NOT NULL,
    status variant_status NOT NULL DEFAULT 'draft',
    slot_id UUID NULL,
    validation_errors JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variants_post_id ON variants(post_id);
CREATE INDEX idx_variants_status ON variants(status);
