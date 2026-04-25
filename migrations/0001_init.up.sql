CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS jobs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	status TEXT NOT NULL,
	source_object_key TEXT NOT NULL,
	requested_transforms JSONB NOT NULL DEFAULT '[]'::jsonb,
	output_format TEXT NOT NULL,
	failure_reason TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT jobs_status_check CHECK (
		status IN ('queued', 'processing', 'completed', 'failed', 'dead_lettered')
	),
	CONSTRAINT jobs_output_format_check CHECK (
		output_format IN ('jpg', 'png', 'webp', 'avif')
	)
);

CREATE INDEX IF NOT EXISTS jobs_status_created_at_idx ON jobs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS job_attempts (
	id BIGSERIAL PRIMARY KEY,
	job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
	attempt_number INTEGER NOT NULL,
	status TEXT NOT NULL,
	started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	finished_at TIMESTAMPTZ,
	error_message TEXT,
	CONSTRAINT job_attempts_status_check CHECK (
		status IN ('queued', 'processing', 'completed', 'failed', 'dead_lettered')
	),
	CONSTRAINT job_attempts_attempt_number_check CHECK (attempt_number > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS job_attempts_job_id_attempt_number_idx
	ON job_attempts (job_id, attempt_number);

CREATE TABLE IF NOT EXISTS job_outputs (
	id BIGSERIAL PRIMARY KEY,
	job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
	variant_name TEXT NOT NULL,
	object_key TEXT NOT NULL,
	content_type TEXT NOT NULL,
	size_bytes BIGINT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT job_outputs_size_bytes_check CHECK (size_bytes >= 0)
);

CREATE INDEX IF NOT EXISTS job_outputs_job_id_idx ON job_outputs (job_id);
