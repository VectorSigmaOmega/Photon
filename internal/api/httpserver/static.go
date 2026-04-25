package httpserver

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed static/*
var staticFiles embed.FS

func frontendHandler() http.Handler {
	staticFS, err := fs.Sub(staticFiles, "static")
	if err != nil {
		panic("embed static frontend: " + err.Error())
	}

	return http.FileServerFS(staticFS)
}
