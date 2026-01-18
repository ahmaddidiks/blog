package repository

import (
	"testing"
)

func TestMemoryFirstViewRepo(t *testing.T) {
	tmpDir := t.TempDir()
	repo, err := NewSqliteViewRepo(tmpDir)
	if err != nil {
		t.Fatalf("Failed to create repo: %v", err)
	}
	defer repo.Close()

	path := "/test-path"

	// 1. Test Increment (Memory Only)
	if err := repo.Increment(path); err != nil {
		t.Errorf("Increment failed: %v", err)
	}

	// 2. Test Get (Immediate Consistency)
	count, err := repo.Get(path)
	if err != nil {
		t.Errorf("Get failed: %v", err)
	}
	if count != 1 {
		t.Errorf("Expected 1, got %d", count)
	}

	// 3. Test Persistence (Wait for Sync)
	// We'll manually trigger sync or wait longer than 1s.
	// To avoid slow tests, we can call syncToDB directly by casting.
	r, ok := repo.(*sqliteViewRepo)
	if !ok {
		t.Fatal("Repo is not *sqliteViewRepo")
	}

	// Check that it's dirty
	r.mu.RLock()
	if !r.dirtyPaths[path] {
		t.Error("Path should be marked dirty")
	}
	r.mu.RUnlock()

	// Force Sync
	r.syncToDB()

	// Check DB
	var dbCount int
	err = r.db.QueryRow("SELECT count FROM page_views WHERE path = ?", path).Scan(&dbCount)
	if err != nil {
		t.Fatalf("Failed to query DB: %v", err)
	}
	if dbCount != 1 {
		t.Errorf("Expected DB count 1, got %d", dbCount)
	}

	// Check it's clean
	r.mu.RLock()
	if r.dirtyPaths[path] {
		t.Error("Path should be clean after sync")
	}
	r.mu.RUnlock()
}
