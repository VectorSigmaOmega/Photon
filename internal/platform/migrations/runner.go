package migrations

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type Runner struct {
	db  *sql.DB
	dir string
}

func NewRunner(db *sql.DB, dir string) *Runner {
	return &Runner{
		db:  db,
		dir: dir,
	}
}

func (r *Runner) Up(ctx context.Context) error {
	if err := r.ensureSchemaTable(ctx); err != nil {
		return err
	}

	applied, err := r.appliedVersions(ctx)
	if err != nil {
		return err
	}

	files, err := r.migrationFiles()
	if err != nil {
		return err
	}

	for _, file := range files {
		if applied[file] {
			continue
		}

		if err := r.applyFile(ctx, file); err != nil {
			return err
		}
	}

	return nil
}

func (r *Runner) ensureSchemaTable(ctx context.Context) error {
	const query = `
CREATE TABLE IF NOT EXISTS schema_migrations (
	version TEXT PRIMARY KEY,
	applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
`

	_, err := r.db.ExecContext(ctx, query)
	return err
}

func (r *Runner) appliedVersions(ctx context.Context) (map[string]bool, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return nil, err
		}

		applied[version] = true
	}

	return applied, rows.Err()
}

func (r *Runner) migrationFiles() ([]string, error) {
	entries, err := os.ReadDir(r.dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations dir: %w", err)
	}

	files := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		if strings.HasSuffix(name, ".up.sql") {
			files = append(files, name)
		}
	}

	sort.Strings(files)
	return files, nil
}

func (r *Runner) applyFile(ctx context.Context, file string) error {
	path := filepath.Join(r.dir, file)
	contents, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read migration %s: %w", file, err)
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, string(contents)); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("apply migration %s: %w", file, err)
	}

	if _, err := tx.ExecContext(
		ctx,
		`INSERT INTO schema_migrations(version, applied_at) VALUES($1, NOW())`,
		file,
	); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("record migration %s: %w", file, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration %s: %w", file, err)
	}

	return nil
}
