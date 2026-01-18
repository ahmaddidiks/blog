package repository

import (
	"bytes"
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/ahmaddidiks/blog/internal/entity"

	"github.com/yuin/goldmark"
	highlighting "github.com/yuin/goldmark-highlighting/v2"
	meta "github.com/yuin/goldmark-meta"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
)

type DocRepository interface {
	GetStructure() ([]entity.SidebarSection, error)
	GetContent(path string) (template.HTML, error)
	Search(query string) ([]entity.SearchResult, error)
}

type docItem struct {
	Title   string
	Content string // Raw text for searching
	HTML    template.HTML
	Path    string
	Date    time.Time
}

type fileSystemDocRepo struct {
	basePath string
	md       goldmark.Markdown
	// cache    map[string]template.HTML // Replaced by docs map
	docs     map[string]docItem
	sections []entity.SidebarSection
}

func NewFileSystemDocRepo(basePath string) DocRepository {
	md := goldmark.New(
		goldmark.WithExtensions(
			extension.GFM,
			highlighting.NewHighlighting(
				highlighting.WithStyle("dracula"),
			),
			meta.Meta,
		),
	)

	repo := &fileSystemDocRepo{
		basePath: basePath,
		md:       md,
		docs:     make(map[string]docItem),
	}
	repo.scan()
	return repo
}

func (r *fileSystemDocRepo) GetStructure() ([]entity.SidebarSection, error) {
	if r.sections == nil {
		if err := r.scan(); err != nil {
			return nil, err
		}
	}
	return r.sections, nil
}

func (r *fileSystemDocRepo) GetContent(path string) (template.HTML, error) {
	doc, ok := r.docs[path]
	if !ok {
		return "", fmt.Errorf("doc not found: %s", path)
	}
	return doc.HTML, nil
}

func (r *fileSystemDocRepo) Search(query string) ([]entity.SearchResult, error) {
	query = strings.ToLower(query)
	var results []entity.SearchResult

	for _, doc := range r.docs {
		// Simple scoring: 10 points for title, 1 point for content
		score := 0
		titleLower := strings.ToLower(doc.Title)
		contentLower := strings.ToLower(doc.Content)

		if strings.Contains(titleLower, query) {
			score += 10
		}
		if strings.Contains(contentLower, query) {
			score += 1
		}

		if score > 0 {
			// Create snippet
			idx := strings.Index(contentLower, query)
			start := 0
			if idx > 50 {
				start = idx - 50
			}
			end := start + 100
			if end > len(doc.Content) {
				end = len(doc.Content)
			}
			snippet := doc.Content[start:end] + "..."

			// Highlight query in snippet (simple replacement)
			// Note: This is a bit naive for HTML safety, but for now we assume simple text.
			// Ideally we use a safer way or do highlighting on frontend.
			// Let's just return text for now.

			results = append(results, entity.SearchResult{
				Title:   doc.Title,
				Path:    doc.Path,
				Snippet: template.HTML(snippet),
			})
		}
	}

	// Sort by relevance? For now just return arbitrary order or maybe sort later.
	// Since it's a map iteration, order is random.

	return results, nil
}

func (r *fileSystemDocRepo) scan() error {
	rootLinks := []entity.SidebarLink{}
	categoryLinks := make(map[string][]entity.SidebarLink)
	categories := []string{}

	processFile := func(path string, fileInfo os.DirEntry) (*entity.SidebarLink, error) {
		if fileInfo.IsDir() || !strings.HasSuffix(fileInfo.Name(), ".md") {
			return nil, nil
		}

		mdData, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}

		context := parser.NewContext()
		var buf bytes.Buffer
		if err := r.md.Convert(mdData, &buf, parser.WithContext(context)); err != nil {
			return nil, err
		}

		metaData := meta.Get(context)
		var date time.Time
		var title string

		if t, ok := metaData["title"]; ok {
			title = fmt.Sprintf("%v", t)
		}
		if d, ok := metaData["date"]; ok {
			ds := fmt.Sprintf("%v", d)
			if t, err := time.Parse("2006-01-02", ds); err == nil {
				date = t
			}
		}

		// Calculate relative path from basePath for URL using / separators
		// path is like "contents/index.md" -> relative "index"
		// path is like "contents/golang/intro.md" -> relative "golang/intro"

		relPath, err := filepath.Rel(r.basePath, path)
		if err != nil {
			return nil, err
		}

		// Ensure internal path uses forward slashes
		relPath = filepath.ToSlash(relPath)
		urlPath := strings.TrimSuffix(relPath, ".md")

		if title == "" {
			baseName := filepath.Base(urlPath)
			title = strings.Title(strings.ReplaceAll(baseName, "-", " "))
		}

		displayTitle := title
		if !date.IsZero() {
			displayTitle = fmt.Sprintf("%s %s", date.Format("2006-01-02"), title)
		}

		// r.cache[urlPath] = template.HTML(buf.String())
		// Store raw content for search (naive reuse of mdData bytes as string)
		// Better: Strip HTML from rendered output to get clean text for search/snippets
		htmlContent := buf.String()
		plainText := stripTags(htmlContent)

		r.docs[urlPath] = docItem{
			Title:   displayTitle,
			Content: plainText,
			HTML:    template.HTML(htmlContent),
			Path:    "/" + urlPath,
			Date:    date,
		}

		return &entity.SidebarLink{
			Title: displayTitle,
			Path:  "/" + urlPath,
			Date:  date,
		}, nil
	}

	entries, err := os.ReadDir(r.basePath)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		fullPath := filepath.Join(r.basePath, entry.Name())
		if !entry.IsDir() {
			link, err := processFile(fullPath, entry)
			if err == nil && link != nil {
				if link.Path == "/index" {
					continue
				}
				rootLinks = append(rootLinks, *link)
			}
		} else {
			if strings.HasPrefix(entry.Name(), ".") || entry.Name() == "static" || entry.Name() == "templates" {
				continue
			}
			catName := entry.Name()
			categories = append(categories, catName)
			categoryLinks[catName] = []entity.SidebarLink{}

			subEntries, _ := os.ReadDir(fullPath)
			for _, subEntry := range subEntries {
				subFullPath := filepath.Join(fullPath, subEntry.Name())
				link, err := processFile(subFullPath, subEntry)
				if err == nil && link != nil {
					categoryLinks[catName] = append(categoryLinks[catName], *link)
				}
			}
		}
	}

	// Build sections
	var sections []entity.SidebarSection

	sortLinks := func(links []entity.SidebarLink) {
		sort.Slice(links, func(i, j int) bool {
			if strings.HasSuffix(links[i].Path, "/index") {
				return true
			}
			if strings.HasSuffix(links[j].Path, "/index") {
				return false
			}
			if !links[i].Date.Equal(links[j].Date) {
				return links[i].Date.After(links[j].Date)
			}
			return links[i].Title < links[j].Title
		})
	}

	if len(rootLinks) > 0 {
		sortLinks(rootLinks)
		sections = append(sections, entity.SidebarSection{
			Title: "General",
			Links: rootLinks,
		})
	}

	sort.Strings(categories)
	for _, cat := range categories {
		links := categoryLinks[cat]
		if len(links) > 0 {
			sortLinks(links)
			sections = append(sections, entity.SidebarSection{
				Title: strings.Title(cat),
				Links: links,
			})
		}
	}

	r.sections = sections
	return nil
}

// stripTags removes HTML tags from the content to produce plain text
func stripTags(content string) string {
	re := regexp.MustCompile(`<[^>]*>`)
	return re.ReplaceAllString(content, "")
}
