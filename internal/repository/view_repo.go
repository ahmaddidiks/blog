package repository

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

type ViewRepository interface {
	Increment(path string) error
	Get(path string) (int, error)
	Close() error
}

type sqliteViewRepo struct {
	db         *sql.DB
	memCounts  map[string]int
	dirtyPaths map[string]bool // Set of paths that have changed since last sync
	mu         sync.RWMutex
	done       chan struct{}
}

func NewSqliteViewRepo(dataDir string) (ViewRepository, error) {
	// Ensure data directory exists
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data dir: %w", err)
	}

	dbPath := filepath.Join(dataDir, "blog.db")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open db: %w", err)
	}

	// Enable WAL mode for better concurrency
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		return nil, fmt.Errorf("failed to enable WAL mode: %w", err)
	}
	// Set busy timeout to wait for locks
	if _, err := db.Exec("PRAGMA busy_timeout=5000;"); err != nil {
		return nil, fmt.Errorf("failed to set busy timeout: %w", err)
	}

	// Create table if not exists
	query := `
	CREATE TABLE IF NOT EXISTS page_views (
		path TEXT PRIMARY KEY,
		count INTEGER DEFAULT 0
	);
	`
	_, err = db.Exec(query)
	if err != nil {
		return nil, fmt.Errorf("failed to create table: %w", err)
	}

	repo := &sqliteViewRepo{
		db:         db,
		memCounts:  make(map[string]int),
		dirtyPaths: make(map[string]bool),
		done:       make(chan struct{}),
	}

	// Load all counts from DB to memory on startup
	if err := repo.loadCounts(); err != nil {
		return nil, fmt.Errorf("failed to load counts: %w", err)
	}

	// Start background sync
	go repo.startBackgroundSync()

	return repo, nil
}

func (r *sqliteViewRepo) loadCounts() error {
	rows, err := r.db.Query("SELECT path, count FROM page_views")
	if err != nil {
		return err
	}
	defer rows.Close()

	r.mu.Lock()
	defer r.mu.Unlock()

	for rows.Next() {
		var path string
		var count int
		if err := rows.Scan(&path, &count); err != nil {
			return err
		}
		r.memCounts[path] = count
	}
	return rows.Err()
}

func (r *sqliteViewRepo) Increment(path string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.memCounts[path]++
	r.dirtyPaths[path] = true
	return nil
}

func (r *sqliteViewRepo) Get(path string) (int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.memCounts[path], nil
}

func (r *sqliteViewRepo) startBackgroundSync() {
	// Sync every 1 second as requested
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			r.syncToDB()
		case <-r.done:
			r.syncToDB() // Final sync
			return
		}
	}
}

func (r *sqliteViewRepo) syncToDB() {
	r.mu.Lock()
	if len(r.dirtyPaths) == 0 {
		r.mu.Unlock()
		return
	}

	// Snapshot dirty items to sync
	toSync := make(map[string]int)
	for path := range r.dirtyPaths {
		toSync[path] = r.memCounts[path]
	}
	// Clear dirty set
	r.dirtyPaths = make(map[string]bool)
	r.mu.Unlock()

	// Batch update to DB
	tx, err := r.db.Begin()
	if err != nil {
		log.Printf("Failed to begin sync tx: %v", err)
		// We could try to restore dirty flags here if critical, but for views subsequent updates will fix it
		return
	}

	// Prepare UPSERT statement
	stmt, err := tx.Prepare(`
		INSERT INTO page_views (path, count) VALUES (?, ?)
		ON CONFLICT(path) DO UPDATE SET count = excluded.count;
	`)
	if err != nil {
		log.Printf("Failed to prepare sync stmt: %v", err)
		tx.Rollback()
		return
	}
	defer stmt.Close()

	for path, count := range toSync {
		if _, err := stmt.Exec(path, count); err != nil {
			log.Printf("Failed to sync count for %s: %v", path, err)
		}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Failed to commit sync tx: %v", err)
		// Retry logic could be added here
	}
}

func (r *sqliteViewRepo) Close() error {
	close(r.done)
	// Give a small grace period for the final sync to finish
	time.Sleep(100 * time.Millisecond)
	return r.db.Close()
}
