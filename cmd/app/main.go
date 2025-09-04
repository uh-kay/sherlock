package main

import (
	"context"
	_ "embed"
	"log"
	"os"
	"sqlexplorer/frontend"
	"sqlexplorer/internal/db"
	"sqlexplorer/views"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func main() {
	db := db.New()
	defer db.Close(context.Background())

	err := os.Chdir("./frontend")
	if err != nil {
		log.Fatal(err)
	}

	f, err := os.Create("index.html")
	if err != nil {
		log.Fatal(err)
	}

	err = views.Index().Render(context.Background(), f)
	if err != nil {
		log.Fatal(err)
	}

	// ginEngine := gin.New()
	// ginEngine.Use(gin.Recovery())

	assets := frontend.Assets

	// distFS, err := fs.Sub(assets, "dist")
	// if err != nil {
	// 	log.Fatal(err)
	// }
	// ginEngine.StaticFS("/", http.FS(distFS))

	app := application.New(application.Options{
		Name:        "sqlexplorer",
		Description: "Explore SQL databases",
		Services: []application.Service{
			application.NewService(&DatabaseService{db: db}),
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

	err = app.Run()
	if err != nil {
		log.Fatal(err)
	}
}

// func GinMiddleware(ginEngine *gin.Engine) application.Middleware {
// 	return func(next http.Handler) http.Handler {
// 		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 			if strings.HasPrefix(r.URL.Path, "/wails") {
// 				next.ServeHTTP(w, r)
// 				return
// 			}

// 			ginEngine.ServeHTTP(w, r)
// 		})
// 	}
// }
