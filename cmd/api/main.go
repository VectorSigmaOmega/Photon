package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/VectorSigmaOmega/photon/internal/api/httpserver"
	"github.com/VectorSigmaOmega/photon/internal/config"
	"github.com/VectorSigmaOmega/photon/internal/observability"
	"github.com/VectorSigmaOmega/photon/internal/platform/app"
	"github.com/VectorSigmaOmega/photon/internal/platform/postgres"
	"github.com/VectorSigmaOmega/photon/internal/queue"
	"github.com/VectorSigmaOmega/photon/internal/storage"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load("api")
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

	metrics, err := observability.NewMetrics("photon_api")
	if err != nil {
		log.Error("initialize metrics", "err", err)
		os.Exit(1)
	}

	server := httpserver.New(cfg.API, log, db, metrics, redisQueue, storageClient, cfg.Storage)

	serverErr := make(chan error, 1)
	go func() {
		serverErr <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErr:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("api server stopped unexpectedly", "err", err)
			os.Exit(1)
		}
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.API.ShutdownTimeout)
		defer cancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Error("shutdown api server", "err", err)
			os.Exit(1)
		}
	}
}
