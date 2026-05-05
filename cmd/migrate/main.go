package main

import (
	"context"
	"fmt"
	"os"

	"github.com/VectorSigmaOmega/photon/internal/config"
	"github.com/VectorSigmaOmega/photon/internal/platform/app"
	"github.com/VectorSigmaOmega/photon/internal/platform/migrations"
	"github.com/VectorSigmaOmega/photon/internal/platform/postgres"
)

func main() {
	if len(os.Args) != 2 || os.Args[1] != "up" {
		fmt.Fprintln(os.Stderr, "usage: go run ./cmd/migrate up")
		os.Exit(2)
	}

	ctx := context.Background()

	cfg, err := config.Load("migrate")
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

	runner := migrations.NewRunner(db, "migrations")
	if err := runner.Up(ctx); err != nil {
		log.Error("apply migrations", "err", err)
		os.Exit(1)
	}

	log.Info("migrations applied successfully")
}
