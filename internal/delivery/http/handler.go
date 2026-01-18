package http

import (
	_ "embed"
	"encoding/json"
	"html/template"
	"net/http"
	"strings"

	"github.com/ahmaddidiks/blog/internal/entity"
	"github.com/ahmaddidiks/blog/internal/usecase"
)

type DocHandler struct {
	usecase usecase.DocUsecase
}

func NewDocHandler(u usecase.DocUsecase) *DocHandler {
	return &DocHandler{
		usecase: u,
	}
}

//go:embed doc_layout.html
var docLayout string

func (h *DocHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Check for Search
	query := r.URL.Query().Get("q")
	if query != "" {
		results, err := h.usecase.Search(query)
		if err != nil {
			http.Error(w, "Search failed", 500)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(results)
		return
	}

	// Path comes in as "/", "/index", "/golang/intro"
	vars := strings.TrimPrefix(r.URL.Path, "/")
	if vars == "" {
		vars = "index"
	}

	content, views, err := h.usecase.GetContent(vars)
	if err != nil {
		if vars == "favicon.ico" {
			return
		}
		http.Error(w, "Doc not found: "+vars, 404)
		return
	}

	sections, err := h.usecase.GetSidebar()
	if err != nil {
		http.Error(w, "Failed to load sidebar", 500)
		return
	}

	data := entity.PageData{
		Title:       vars,
		CurrentPath: "/" + vars,
		Sections:    sections,
		Content:     content,
		Views:       views,
	}

	// Check for API request
	if r.URL.Query().Get("format") == "json" || r.Header.Get("Accept") == "application/json" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(data)
		return
	}

	tmpl, err := template.New("docs").Parse(docLayout)
	if err != nil {
		http.Error(w, "Failed to parse template", 500)
		return
	}
	tmpl.Execute(w, data)
}
