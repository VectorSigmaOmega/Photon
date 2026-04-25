package queue

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/carousell/swiftbatch/internal/config"
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

func (q *RedisQueue) Close() error {
	return q.client.Close()
}

func (q *RedisQueue) QueueKey() string {
	return q.queueKey
}

func (q *RedisQueue) DLQKey() string {
	return q.dlqKey
}
