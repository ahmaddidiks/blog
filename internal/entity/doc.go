package entity

import (
	"html/template"
	"time"
)

// SidebarLink represents a single doc link
type SidebarLink struct {
	Title string
	Path  string
	Date  time.Time
}

// SidebarSection groups links by category
type SidebarSection struct {
	Title string
	Links []SidebarLink
}

type PageData struct {
	Title       string
	CurrentPath string
	Sections    []SidebarSection
	Content     template.HTML
	Views       int
}

type SearchResult struct {
	Title   string
	Path    string
	Snippet template.HTML
}
