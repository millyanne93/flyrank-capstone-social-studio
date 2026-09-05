CREATE TABLE slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheduled_for TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_slots_scheduled_for ON slots(scheduled_for);

ALTER TABLE variants ADD CONSTRAINT fk_variants_slot_id FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE SET NULL;
ALTER TABLE variants ADD CONSTRAINT uq_variants_slot_id UNIQUE (slot_id);
