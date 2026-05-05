package queue

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/VectorSigmaOmega/photon/internal/config"
)

type RedisQueue struct {
	client   *redis.Client
	queueKey string
	dlqKey   string
}

type DLQEntry struct {
	Attempt       int       `json:"attempt"`
	FailedAt      time.Time `json:"failed_at"`
	FailureReason string    `json:"failure_reason"`
	JobID         string    `json:"job_id"`
}

func NewRedisQueue(cfg config.RedisConfig) *RedisQueue {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Addr,
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	return &RedisQueue{
		client:   client,
		queueKey: cfg.QueueKey,
		dlqKey:   cfg.DLQKey,
	}
}

func (q *RedisQueue) Ping(ctx context.Context) error {
	return q.client.Ping(ctx).Err()
}

func (q *RedisQueue) Enqueue(ctx context.Context, jobID string) error {
	return q.client.RPush(ctx, q.queueKey, jobID).Err()
}

func (q *RedisQueue) Dequeue(ctx context.Context, timeout time.Duration) (string, bool, error) {
	result, err := q.client.BLPop(ctx, timeout, q.queueKey).Result()
	if errors.Is(err, redis.Nil) {
		return "", false, nil
	}

	if err != nil {
		return "", false, err
	}

	if len(result) != 2 {
		return "", false, nil
	}

	return result[1], true, nil
}

func (q *RedisQueue) EnqueueDLQ(ctx context.Context, entry DLQEntry) error {
	payload, err := json.Marshal(entry)
	if err != nil {
		return err
	}

	return q.client.RPush(ctx, q.dlqKey, payload).Err()
}

func (q *RedisQueue) QueueDepth(ctx context.Context) (int64, error) {
	return q.client.LLen(ctx, q.queueKey).Result()
}

func (q *RedisQueue) DLQDepth(ctx context.Context) (int64, error) {
	return q.client.LLen(ctx, q.dlqKey).Result()
}

func (q *RedisQueue) PruneDLQBefore(ctx context.Context, cutoff time.Time) (int, error) {
	entries, err := q.client.LRange(ctx, q.dlqKey, 0, -1).Result()
	if err != nil {
		return 0, err
	}

	if len(entries) == 0 {
		return 0, nil
	}

	kept := make([]string, 0, len(entries))
	removed := 0
	for _, raw := range entries {
		var entry DLQEntry
		if err := json.Unmarshal([]byte(raw), &entry); err != nil {
			kept = append(kept, raw)
			continue
		}

		if entry.FailedAt.Before(cutoff) {
			removed++
			continue
		}

		kept = append(kept, raw)
	}

	if removed == 0 {
		return 0, nil
	}

	pipe := q.client.TxPipeline()
	pipe.Del(ctx, q.dlqKey)
	if len(kept) > 0 {
		values := make([]any, 0, len(kept))
		for _, entry := range kept {
			values = append(values, entry)
		}
		pipe.RPush(ctx, q.dlqKey, values...)
	}

	if _, err := pipe.Exec(ctx); err != nil {
		return 0, err
	}

	return removed, nil
}

func (q *RedisQueue) Close() error {
	return q.client.Close()
}

func (q *RedisQueue) QueueKey() string {
	return q.queueKey
}

func (q *RedisQueue) DLQKey() string {
	return q.dlqKey
}
