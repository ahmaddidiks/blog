package usecase

import (
	"fmt"
	"html/template"

	"github.com/ahmaddidiks/blog/internal/entity"
	"github.com/ahmaddidiks/blog/internal/repository"
)

type DocUsecase interface {
	GetSidebar() ([]entity.SidebarSection, error)
	GetContent(path string) (template.HTML, int, error)
	Search(query string) ([]entity.SearchResult, error)
}

type docUsecase struct {
	repo     repository.DocRepository
	viewRepo repository.ViewRepository
}

func NewDocUsecase(repo repository.DocRepository, viewRepo repository.ViewRepository) DocUsecase {
	return &docUsecase{
		repo:     repo,
		viewRepo: viewRepo,
	}
}

func (u *docUsecase) GetSidebar() ([]entity.SidebarSection, error) {
	return u.repo.GetStructure()
}

func (u *docUsecase) GetContent(path string) (template.HTML, int, error) {
	// Get content first
	content, err := u.repo.GetContent(path)
	if err != nil {
		return "", 0, err
	}

	// Handle View Count (Fire and forget error logging? Or return error? Let's just log print internally or ignore for now to keep it simple, but we need to return the count)
	// We'll try to increment and get.
	if err := u.viewRepo.Increment(path); err != nil {
		// In production, log this. For now we proceed.
		fmt.Printf("Error incrementing view: %v\n", err)
	}

	views, err := u.viewRepo.Get(path)
	if err != nil {
		fmt.Printf("Error getting views: %v\n", err)
		views = 0
	}

	return content, views, nil
}

func (u *docUsecase) Search(query string) ([]entity.SearchResult, error) {
	return u.repo.Search(query)
}
