package cleanup

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/VectorSigmaOmega/photon/internal/config"
	"github.com/VectorSigmaOmega/photon/internal/db"
)

type fakeJobsRepository struct {
	candidates    [][]db.CleanupCandidate
	deletedJobIDs []string
}

func (f *fakeJobsRepository) ListCleanupCandidates(_ context.Context, _ time.Time, _ int) ([]db.CleanupCandidate, error) {
	if len(f.candidates) == 0 {
		return nil, nil
	}

	next := f.candidates[0]
	f.candidates = f.candidates[1:]
	return next, nil
}

func (f *fakeJobsRepository) DeleteJob(_ context.Context, id string) error {
	f.deletedJobIDs = append(f.deletedJobIDs, id)
	return nil
}

type fakeObjectStorage struct {
	deleted []string
}

func (f *fakeObjectStorage) DeleteObject(_ context.Context, objectKey string) error {
	f.deleted = append(f.deleted, objectKey)
	return nil
}

type fakeDLQPruner struct {
	cutoffs []time.Time
}

func (f *fakeDLQPruner) PruneDLQBefore(_ context.Context, cutoff time.Time) (int, error) {
	f.cutoffs = append(f.cutoffs, cutoff)
	return 3, nil
}

func TestRunnerRunOnceDeletesExpiredJobsAndPrunesDLQ(t *testing.T) {
	t.Parallel()

	repo := &fakeJobsRepository{
		candidates: [][]db.CleanupCandidate{
			{
				{
					ID:               "job-1",
					SourceObjectKey:  "uploads/source-1.png",
					OutputObjectKeys: []string{"outputs/job-1/thumb.webp", "outputs/job-1/card.webp"},
					Status:           db.JobStatusCompleted,
					UpdatedAt:        time.Now().Add(-10 * time.Hour),
				},
			},
			nil,
		},
	}
	storage := &fakeObjectStorage{}
	queue := &fakeDLQPruner{}
	runner := NewRunner(
		config.CleanupConfig{
			BatchSize:    50,
			DLQRetention: 24 * time.Hour,
			JobRetention: 24 * time.Hour,
		},
		slog.New(slog.NewTextHandler(io.Discard, nil)),
		repo,
		storage,
		queue,
	)

	if err := runner.RunOnce(context.Background()); err != nil {
		t.Fatalf("RunOnce returned error: %v", err)
	}

	if len(repo.deletedJobIDs) != 1 || repo.deletedJobIDs[0] != "job-1" {
		t.Fatalf("unexpected deleted jobs: %#v", repo.deletedJobIDs)
	}

	expectedObjects := []string{
		"uploads/source-1.png",
		"outputs/job-1/thumb.webp",
		"outputs/job-1/card.webp",
	}
	if len(storage.deleted) != len(expectedObjects) {
		t.Fatalf("expected %d deleted objects, got %d", len(expectedObjects), len(storage.deleted))
	}

	for index, objectKey := range expectedObjects {
		if storage.deleted[index] != objectKey {
			t.Fatalf("unexpected deleted object at %d: got %q want %q", index, storage.deleted[index], objectKey)
		}
	}

	if len(queue.cutoffs) != 1 {
		t.Fatalf("expected DLQ pruning once, got %d", len(queue.cutoffs))
	}
}
