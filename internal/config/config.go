package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppName  string
	Env      string
	API      HTTPServerConfig
	Cleanup  CleanupConfig
	Worker   WorkerConfig
	Postgres PostgresConfig
	Redis    RedisConfig
	Storage  StorageConfig
}

type HTTPServerConfig struct {
	Addr            string
	RateLimit       HTTPRateLimitConfig
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
}

type HTTPRateLimitConfig struct {
	Enabled                  bool
	ClientTTL                time.Duration
	PresignBurst             int
	PresignRequestsPerMinute int
	CreateBurst              int
	CreateRequestsPerMinute  int
	RetryBurst               int
	RetryRequestsPerMinute   int
}

type WorkerConfig struct {
	Concurrency int
	JobTimeout  time.Duration
	MetricsAddr string
	PollTimeout time.Duration
}

type CleanupConfig struct {
	BatchSize     int
	DLQRetention  time.Duration
	Enabled       bool
	Interval      time.Duration
	JobRetention  time.Duration
	StartupJitter time.Duration
}

type PostgresConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Database string
	SSLMode  string
}

type RedisConfig struct {
	Addr       string
	Password   string
	DB         int
	QueueKey   string
	DLQKey     string
	MaxRetries int
}

type StorageConfig struct {
	Endpoint           string
	PublicBaseURL      string
	AccessKey          string
	SecretKey          string
	Bucket             string
	Region             string
	UseSSL             bool
	UploadPresignTTL   time.Duration
	DownloadPresignTTL time.Duration
}

func Load(service string) (Config, error) {
	cfg := Config{
		AppName: fmt.Sprintf("photon-%s", service),
		Env:     getEnv("PHOTON_ENV", "development"),
		API: HTTPServerConfig{
			Addr: getEnv("PHOTON_API_ADDR", ":8080"),
			RateLimit: HTTPRateLimitConfig{
				Enabled:                  getBool("PHOTON_API_RATE_LIMIT_ENABLED", true),
				ClientTTL:                getDuration("PHOTON_API_RATE_LIMIT_CLIENT_TTL", 30*time.Minute),
				PresignBurst:             getInt("PHOTON_API_PRESIGN_RATE_LIMIT_BURST", 5),
				PresignRequestsPerMinute: getInt("PHOTON_API_PRESIGN_RATE_LIMIT_PER_MINUTE", 20),
				CreateBurst:              getInt("PHOTON_API_JOBS_CREATE_RATE_LIMIT_BURST", 10),
				CreateRequestsPerMinute:  getInt("PHOTON_API_JOBS_CREATE_RATE_LIMIT_PER_MINUTE", 30),
				RetryBurst:               getInt("PHOTON_API_JOBS_RETRY_RATE_LIMIT_BURST", 2),
				RetryRequestsPerMinute:   getInt("PHOTON_API_JOBS_RETRY_RATE_LIMIT_PER_MINUTE", 6),
			},
			ReadTimeout:     getDuration("PHOTON_API_READ_TIMEOUT", 10*time.Second),
			WriteTimeout:    getDuration("PHOTON_API_WRITE_TIMEOUT", 15*time.Second),
			ShutdownTimeout: getDuration("PHOTON_API_SHUTDOWN_TIMEOUT", 10*time.Second),
		},
		Worker: WorkerConfig{
			Concurrency: getInt("PHOTON_WORKER_CONCURRENCY", 4),
			JobTimeout:  getDuration("PHOTON_WORKER_JOB_TIMEOUT", 2*time.Minute),
			MetricsAddr: getEnv("PHOTON_WORKER_METRICS_ADDR", ":8081"),
			PollTimeout: getDuration("PHOTON_WORKER_POLL_TIMEOUT", 5*time.Second),
		},
		Cleanup: CleanupConfig{
			BatchSize:     getInt("PHOTON_CLEANUP_BATCH_SIZE", 50),
			DLQRetention:  getDuration("PHOTON_CLEANUP_DLQ_RETENTION", 168*time.Hour),
			Enabled:       getBool("PHOTON_CLEANUP_ENABLED", true),
			Interval:      getDuration("PHOTON_CLEANUP_INTERVAL", 6*time.Hour),
			JobRetention:  getDuration("PHOTON_CLEANUP_JOB_RETENTION", 168*time.Hour),
			StartupJitter: getDuration("PHOTON_CLEANUP_STARTUP_JITTER", 0),
		},
		Postgres: PostgresConfig{
			Host:     getEnv("PHOTON_POSTGRES_HOST", "localhost"),
			Port:     getInt("PHOTON_POSTGRES_PORT", 5432),
			User:     getEnv("PHOTON_POSTGRES_USER", "photon"),
			Password: getEnv("PHOTON_POSTGRES_PASSWORD", "photon"),
			Database: getEnv("PHOTON_POSTGRES_DB", "photon"),
			SSLMode:  getEnv("PHOTON_POSTGRES_SSLMODE", "disable"),
		},
		Redis: RedisConfig{
			Addr:       getEnv("PHOTON_REDIS_ADDR", "localhost:6379"),
			Password:   getEnv("PHOTON_REDIS_PASSWORD", ""),
			DB:         getInt("PHOTON_REDIS_DB", 0),
			QueueKey:   getEnv("PHOTON_REDIS_QUEUE_KEY", "photon:jobs"),
			DLQKey:     getEnv("PHOTON_REDIS_DLQ_KEY", "photon:jobs:dlq"),
			MaxRetries: getInt("PHOTON_REDIS_MAX_RETRIES", 3),
		},
		Storage: StorageConfig{
			Endpoint:           getEnv("PHOTON_STORAGE_ENDPOINT", "localhost:9000"),
			PublicBaseURL:      getEnv("PHOTON_STORAGE_PUBLIC_BASE_URL", ""),
			AccessKey:          getEnv("PHOTON_STORAGE_ACCESS_KEY", "minioadmin"),
			SecretKey:          getEnv("PHOTON_STORAGE_SECRET_KEY", "minioadmin"),
			Bucket:             getEnv("PHOTON_STORAGE_BUCKET", "photon"),
			Region:             getEnv("PHOTON_STORAGE_REGION", "us-east-1"),
			UseSSL:             getBool("PHOTON_STORAGE_USE_SSL", false),
			UploadPresignTTL:   getDuration("PHOTON_STORAGE_UPLOAD_URL_TTL", 15*time.Minute),
			DownloadPresignTTL: getDuration("PHOTON_STORAGE_DOWNLOAD_URL_TTL", 30*time.Minute),
		},
	}

	if cfg.Worker.Concurrency <= 0 {
		return Config{}, fmt.Errorf("PHOTON_WORKER_CONCURRENCY must be greater than zero")
	}

	if cfg.Cleanup.BatchSize <= 0 {
		return Config{}, fmt.Errorf("PHOTON_CLEANUP_BATCH_SIZE must be greater than zero")
	}

	if cfg.Cleanup.Interval <= 0 {
		return Config{}, fmt.Errorf("PHOTON_CLEANUP_INTERVAL must be greater than zero")
	}

	if cfg.Cleanup.JobRetention <= 0 {
		return Config{}, fmt.Errorf("PHOTON_CLEANUP_JOB_RETENTION must be greater than zero")
	}

	if cfg.Cleanup.DLQRetention <= 0 {
		return Config{}, fmt.Errorf("PHOTON_CLEANUP_DLQ_RETENTION must be greater than zero")
	}

	if cfg.API.RateLimit.ClientTTL <= 0 {
		return Config{}, fmt.Errorf("PHOTON_API_RATE_LIMIT_CLIENT_TTL must be greater than zero")
	}

	if strings.TrimSpace(cfg.Redis.QueueKey) == "" {
		return Config{}, fmt.Errorf("PHOTON_REDIS_QUEUE_KEY must not be empty")
	}

	if strings.TrimSpace(cfg.Redis.DLQKey) == "" {
		return Config{}, fmt.Errorf("PHOTON_REDIS_DLQ_KEY must not be empty")
	}

	return cfg, nil
}

func (c PostgresConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host,
		c.Port,
		c.User,
		c.Password,
		c.Database,
		c.SSLMode,
	)
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}

	return fallback
}

func getInt(key string, fallback int) int {
	value := strings.TrimSpace(getEnv(key, ""))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getBool(key string, fallback bool) bool {
	value := strings.TrimSpace(getEnv(key, ""))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getDuration(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(getEnv(key, ""))
	if value == "" {
		return fallback
	}

	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}

	return parsed
}
