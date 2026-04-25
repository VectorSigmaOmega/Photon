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
	Worker   WorkerConfig
	Postgres PostgresConfig
	Redis    RedisConfig
	Storage  StorageConfig
}

type HTTPServerConfig struct {
	Addr            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
}

type WorkerConfig struct {
	Concurrency int
	JobTimeout  time.Duration
	MetricsAddr string
	PollTimeout time.Duration
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
		AppName: fmt.Sprintf("swiftbatch-%s", service),
		Env:     getEnv("SWIFTBATCH_ENV", "development"),
		API: HTTPServerConfig{
			Addr:            getEnv("SWIFTBATCH_API_ADDR", ":8080"),
			ReadTimeout:     getDuration("SWIFTBATCH_API_READ_TIMEOUT", 10*time.Second),
			WriteTimeout:    getDuration("SWIFTBATCH_API_WRITE_TIMEOUT", 15*time.Second),
			ShutdownTimeout: getDuration("SWIFTBATCH_API_SHUTDOWN_TIMEOUT", 10*time.Second),
		},
		Worker: WorkerConfig{
			Concurrency: getInt("SWIFTBATCH_WORKER_CONCURRENCY", 4),
			JobTimeout:  getDuration("SWIFTBATCH_WORKER_JOB_TIMEOUT", 2*time.Minute),
			MetricsAddr: getEnv("SWIFTBATCH_WORKER_METRICS_ADDR", ":8081"),
			PollTimeout: getDuration("SWIFTBATCH_WORKER_POLL_TIMEOUT", 5*time.Second),
		},
		Postgres: PostgresConfig{
			Host:     getEnv("SWIFTBATCH_POSTGRES_HOST", "localhost"),
			Port:     getInt("SWIFTBATCH_POSTGRES_PORT", 5432),
			User:     getEnv("SWIFTBATCH_POSTGRES_USER", "swiftbatch"),
			Password: getEnv("SWIFTBATCH_POSTGRES_PASSWORD", "swiftbatch"),
			Database: getEnv("SWIFTBATCH_POSTGRES_DB", "swiftbatch"),
			SSLMode:  getEnv("SWIFTBATCH_POSTGRES_SSLMODE", "disable"),
		},
		Redis: RedisConfig{
			Addr:       getEnv("SWIFTBATCH_REDIS_ADDR", "localhost:6379"),
			Password:   getEnv("SWIFTBATCH_REDIS_PASSWORD", ""),
			DB:         getInt("SWIFTBATCH_REDIS_DB", 0),
			QueueKey:   getEnv("SWIFTBATCH_REDIS_QUEUE_KEY", "swiftbatch:jobs"),
			DLQKey:     getEnv("SWIFTBATCH_REDIS_DLQ_KEY", "swiftbatch:jobs:dlq"),
			MaxRetries: getInt("SWIFTBATCH_REDIS_MAX_RETRIES", 3),
		},
		Storage: StorageConfig{
			Endpoint:           getEnv("SWIFTBATCH_STORAGE_ENDPOINT", "localhost:9000"),
			PublicBaseURL:      getEnv("SWIFTBATCH_STORAGE_PUBLIC_BASE_URL", ""),
			AccessKey:          getEnv("SWIFTBATCH_STORAGE_ACCESS_KEY", "minioadmin"),
			SecretKey:          getEnv("SWIFTBATCH_STORAGE_SECRET_KEY", "minioadmin"),
			Bucket:             getEnv("SWIFTBATCH_STORAGE_BUCKET", "swiftbatch"),
			Region:             getEnv("SWIFTBATCH_STORAGE_REGION", "us-east-1"),
			UseSSL:             getBool("SWIFTBATCH_STORAGE_USE_SSL", false),
			UploadPresignTTL:   getDuration("SWIFTBATCH_STORAGE_UPLOAD_URL_TTL", 15*time.Minute),
			DownloadPresignTTL: getDuration("SWIFTBATCH_STORAGE_DOWNLOAD_URL_TTL", 30*time.Minute),
		},
	}

	if cfg.Worker.Concurrency <= 0 {
		return Config{}, fmt.Errorf("SWIFTBATCH_WORKER_CONCURRENCY must be greater than zero")
	}

	if strings.TrimSpace(cfg.Redis.QueueKey) == "" {
		return Config{}, fmt.Errorf("SWIFTBATCH_REDIS_QUEUE_KEY must not be empty")
	}

	if strings.TrimSpace(cfg.Redis.DLQKey) == "" {
		return Config{}, fmt.Errorf("SWIFTBATCH_REDIS_DLQ_KEY must not be empty")
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
