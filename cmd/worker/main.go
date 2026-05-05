package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/VectorSigmaOmega/photon/internal/config"
	"github.com/VectorSigmaOmega/photon/internal/observability"
	"github.com/VectorSigmaOmega/photon/internal/platform/app"
	"github.com/VectorSigmaOmega/photon/internal/platform/postgres"
	"github.com/VectorSigmaOmega/photon/internal/queue"
	"github.com/VectorSigmaOmega/photon/internal/storage"
	"github.com/VectorSigmaOmega/photon/internal/worker"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load("worker")
	if err != nil {
		fmt.Fprintf(os.Stderr, "load config: %v\n", err)
		os.Exit(1)
	}

	log := app.NewLogger(cfg.Env, cfg.AppName)

	db, err := postgres.Open(ctx, cfg.Postgres)
	if err != nil {
		log.Error("connect postgres", "err", err)
		os.Exit(1)
	}
	defer db.Close()

	redisQueue := queue.NewRedisQueue(cfg.Redis)
	defer redisQueue.Close()

	if err := redisQueue.Ping(ctx); err != nil {
		log.Error("connect redis", "err", err)
		os.Exit(1)
	}

	storageClient, err := storage.NewMinIOClient(cfg.Storage)
	if err != nil {
		log.Error("initialize storage client", "err", err)
		os.Exit(1)
	}

	if err := storageClient.Ping(ctx); err != nil {
		log.Error("connect storage", "err", err)
		os.Exit(1)
	}

	workerMetrics, err := observability.NewWorkerMetrics("photon_worker")
	if err != nil {
		log.Error("initialize worker metrics", "err", err)
		os.Exit(1)
	}

	metricsServer := newMetricsServer(cfg.Worker.MetricsAddr, workerMetrics)
	metricsErr := make(chan error, 1)
	go func() {
		log.Info("worker metrics server listening", "addr", cfg.Worker.MetricsAddr)
		if err := metricsServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			metricsErr <- err
			stop()
		}
	}()

	runner := worker.NewRunner(cfg.Worker, log, db, redisQueue, cfg.Redis.MaxRetries, storageClient, workerMetrics)
	if err := runner.Run(ctx); err != nil {
		log.Error("worker stopped unexpectedly", "err", err)
		os.Exit(1)
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := metricsServer.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Error("shutdown worker metrics server", "err", err)
		os.Exit(1)
	}

	select {
	case err := <-metricsErr:
		log.Error("worker metrics server stopped unexpectedly", "err", err)
		os.Exit(1)
	default:
	}
}

func newMetricsServer(addr string, metrics *observability.WorkerMetrics) *http.Server {
	mux := http.NewServeMux()
	mux.Handle("GET /metrics", metrics.Handler())
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	return &http.Server{
		Addr:              addr,
		Handler:           mux,
		IdleTimeout:       60 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
	}
}
