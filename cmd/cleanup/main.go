package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/VectorSigmaOmega/photon/internal/cleanup"
	"github.com/VectorSigmaOmega/photon/internal/config"
	dbrepo "github.com/VectorSigmaOmega/photon/internal/db"
	"github.com/VectorSigmaOmega/photon/internal/platform/app"
	"github.com/VectorSigmaOmega/photon/internal/platform/postgres"
	"github.com/VectorSigmaOmega/photon/internal/queue"
	"github.com/VectorSigmaOmega/photon/internal/storage"
)

func main() {
	if len(os.Args) != 2 || (os.Args[1] != "run" && os.Args[1] != "serve") {
		fmt.Fprintln(os.Stderr, "usage: go run ./cmd/cleanup [run|serve]")
		os.Exit(2)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load("cleanup")
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

	runner := cleanup.NewRunner(
		cfg.Cleanup,
		log,
		dbrepo.NewJobsRepository(db),
		storageClient,
		redisQueue,
	)

	switch os.Args[1] {
	case "run":
		if err := runner.RunOnce(ctx); err != nil {
			log.Error("run cleanup", "err", err)
			os.Exit(1)
		}
	case "serve":
		if err := runner.Serve(ctx); err != nil {
			log.Error("serve cleanup", "err", err)
			os.Exit(1)
		}
	}
}
