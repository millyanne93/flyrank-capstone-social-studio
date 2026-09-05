CREATE TYPE publish_attempt_status AS ENUM ('pending', 'succeeded', 'failed');

CREATE TABLE publish_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL UNIQUE,
    status publish_attempt_status NOT NULL DEFAULT 'pending',
    platform_message_ref TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_publish_attempts_variant_id ON publish_attempts(variant_id);
CREATE INDEX idx_publish_attempts_slot_id ON publish_attempts(slot_id);
CREATE INDEX idx_publish_attempts_idempotency_key ON publish_attempts(idempotency_key);
