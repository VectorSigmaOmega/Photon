package cleanup

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math/rand/v2"
	"time"

	"github.com/VectorSigmaOmega/photon/internal/config"
	"github.com/VectorSigmaOmega/photon/internal/db"
)

type jobsRepository interface {
	ListCleanupCandidates(ctx context.Context, cutoff time.Time, limit int) ([]db.CleanupCandidate, error)
	DeleteJob(ctx context.Context, id string) error
}

type objectStorage interface {
	DeleteObject(ctx context.Context, objectKey string) error
}

type dlqPruner interface {
	PruneDLQBefore(ctx context.Context, cutoff time.Time) (int, error)
}

type Runner struct {
	cfg     config.CleanupConfig
	jobs    jobsRepository
	log     *slog.Logger
	queue   dlqPruner
	storage objectStorage
}

func NewRunner(
	cfg config.CleanupConfig,
	log *slog.Logger,
	jobs jobsRepository,
	storage objectStorage,
	queue dlqPruner,
) *Runner {
	return &Runner{
		cfg:     cfg,
		jobs:    jobs,
		log:     log,
		queue:   queue,
		storage: storage,
	}
}

func (r *Runner) RunOnce(ctx context.Context) error {
	now := time.Now().UTC()
	jobCutoff := now.Add(-r.cfg.JobRetention)
	dlqCutoff := now.Add(-r.cfg.DLQRetention)
	totalJobsDeleted := 0
	totalObjectsDeleted := 0

	for {
		candidates, err := r.jobs.ListCleanupCandidates(ctx, jobCutoff, r.cfg.BatchSize)
		if err != nil {
			return fmt.Errorf("list cleanup candidates: %w", err)
		}

		if len(candidates) == 0 {
			break
		}

		for _, candidate := range candidates {
			objectsDeleted, err := r.deleteCandidate(ctx, candidate)
			if err != nil {
				return err
			}

			totalJobsDeleted++
			totalObjectsDeleted += objectsDeleted
		}
	}

	prunedDLQ, err := r.queue.PruneDLQBefore(ctx, dlqCutoff)
	if err != nil {
		return fmt.Errorf("prune dlq: %w", err)
	}

	r.log.Info(
		"cleanup pass finished",
		"deleted_jobs", totalJobsDeleted,
		"deleted_objects", totalObjectsDeleted,
		"pruned_dlq_entries", prunedDLQ,
		"job_retention", r.cfg.JobRetention.String(),
		"dlq_retention", r.cfg.DLQRetention.String(),
	)

	return nil
}

func (r *Runner) Serve(ctx context.Context) error {
	if !r.cfg.Enabled {
		r.log.Info("cleanup runner disabled")
		<-ctx.Done()
		return nil
	}

	if r.cfg.StartupJitter > 0 {
		delay := time.Duration(rand.Int64N(r.cfg.StartupJitter.Nanoseconds() + 1))
		r.log.Info("cleanup startup jitter", "delay", delay.String())
		timer := time.NewTimer(delay)
		defer timer.Stop()
		select {
		case <-ctx.Done():
			return nil
		case <-timer.C:
		}
	}

	if err := r.RunOnce(ctx); err != nil {
		return err
	}

	ticker := time.NewTicker(r.cfg.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			if err := r.RunOnce(ctx); err != nil {
				return err
			}
		}
	}
}

func (r *Runner) deleteCandidate(ctx context.Context, candidate db.CleanupCandidate) (int, error) {
	objectKeys := make([]string, 0, 1+len(candidate.OutputObjectKeys))
	if candidate.SourceObjectKey != "" {
		objectKeys = append(objectKeys, candidate.SourceObjectKey)
	}
	objectKeys = append(objectKeys, candidate.OutputObjectKeys...)

	deletedObjects := 0
	for _, objectKey := range objectKeys {
		if objectKey == "" {
			continue
		}

		if err := r.storage.DeleteObject(ctx, objectKey); err != nil {
			return deletedObjects, fmt.Errorf("delete object %s for job %s: %w", objectKey, candidate.ID, err)
		}

		deletedObjects++
	}

	if err := r.jobs.DeleteJob(ctx, candidate.ID); err != nil && !errors.Is(err, db.ErrJobNotFound) {
		return deletedObjects, fmt.Errorf("delete job %s: %w", candidate.ID, err)
	}

	r.log.Info(
		"cleanup deleted expired job",
		"job_id", candidate.ID,
		"status", candidate.Status,
		"updated_at", candidate.UpdatedAt,
		"deleted_objects", deletedObjects,
	)

	return deletedObjects, nil
}
