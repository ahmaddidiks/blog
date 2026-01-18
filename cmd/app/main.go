package main

import (
	"log"
	"net/http"

	delivery "github.com/ahmaddidiks/blog/internal/delivery/http"
	"github.com/ahmaddidiks/blog/internal/repository"
	"github.com/ahmaddidiks/blog/internal/usecase"
)

func main() {
	// 1. Initialize Repository (with contents directory)
	docRepo := repository.NewFileSystemDocRepo("./contents")
	viewRepo, err := repository.NewSqliteViewRepo("./data")
	if err != nil {
		log.Fatal(err)
	}
	defer viewRepo.Close()

	// 2. Initialize Usecase
	docUsecase := usecase.NewDocUsecase(docRepo, viewRepo)

	// 3. Initialize Handler
	docHandler := delivery.NewDocHandler(docUsecase)

	// 4. Register Routes
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	http.Handle("/", docHandler)

	log.Println("Docs server running at http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
