package db

import (
	"encoding/json"
	"errors"
	"time"
)

type JobStatus string

const (
	JobStatusQueued       JobStatus = "queued"
	JobStatusProcessing   JobStatus = "processing"
	JobStatusCompleted    JobStatus = "completed"
	JobStatusFailed       JobStatus = "failed"
	JobStatusDeadLettered JobStatus = "dead_lettered"
)

type Job struct {
	ID                  string          `json:"id"`
	Status              JobStatus       `json:"status"`
	SourceObjectKey     string          `json:"source_object_key"`
	RequestedTransforms json.RawMessage `json:"requested_transforms"`
	OutputFormat        string          `json:"output_format"`
	FailureReason       string          `json:"failure_reason,omitempty"`
	CreatedAt           time.Time       `json:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at"`
}

type JobAttempt struct {
	ID            int64      `json:"id"`
	JobID         string     `json:"job_id"`
	AttemptNumber int        `json:"attempt_number"`
	Status        JobStatus  `json:"status"`
	StartedAt     time.Time  `json:"started_at"`
	FinishedAt    *time.Time `json:"finished_at,omitempty"`
	ErrorMessage  string     `json:"error_message,omitempty"`
}

type JobOutput struct {
	ID          int64     `json:"id"`
	JobID       string    `json:"job_id"`
	VariantName string    `json:"variant_name"`
	ObjectKey   string    `json:"object_key"`
	ContentType string    `json:"content_type"`
	SizeBytes   int64     `json:"size_bytes"`
	CreatedAt   time.Time `json:"created_at"`
}

var (
	ErrJobNotFound      = errors.New("job not found")
	ErrRetryNotAllowed  = errors.New("retry is only allowed for failed or dead_lettered jobs")
	ErrInvalidJobStatus = errors.New("invalid job status transition")
)
