package main

import (
	"context"
	_ "embed"
	"log"
	"os"
	"path/filepath"
	"sqlexplorer/frontend"
	"sqlexplorer/views"

	"github.com/a-h/templ"
	"github.com/wailsapp/wails/v3/pkg/application"
)

func main() {
	// addr := "postgres://root:password@localhost:5433/social?sslmode=disable"

	// db := db.New(addr)
	// defer db.Close(context.Background())

	if err := renderTempltoFile("index.html", views.Index()); err != nil {
		log.Fatal(err)
	}

	if err := renderTempltoFile("postgres.html", views.Postgres()); err != nil {
		log.Fatal(err)
	}

	assets := frontend.Assets

	app := application.New(application.Options{
		Name:        "sqlexplorer",
		Description: "Explore SQL databases",
		Services: []application.Service{
			application.NewService(&PostgresService{}),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title: "sqlexplorer",
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
		Frameless:        true,
		DisableResize:    false,
	})

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}

func renderTempltoFile(filename string, component templ.Component) error {
	path := filepath.Join("./frontend", filename)
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	return component.Render(context.Background(), f)
}
