package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/swaggest/jsonschema-go"
)

type Route struct {
	Handler func(*http.Request) any
	// Authorizer func(req *http.Request, input I) bool
}

type SomnolenceServer struct {
	Start func()
}

func CreateSomnolenceServer[T any](port int, routes map[string]Route) SomnolenceServer {
	somnolenceServer := SomnolenceServer{
		Start: func() {
			// Handle __schema route
			http.HandleFunc("/__schema", func(w http.ResponseWriter, req *http.Request) {
				reflector := jsonschema.Reflector{}
				var t T
				schema, err := reflector.Reflect(t)
				if err != nil {
					log.Fatal(err)
				}
				j, err := json.MarshalIndent(schema, "", " ")
				if err != nil {
					log.Fatal(err)
				}
				fmt.Fprintf(w, "%s", string(j))
			})
	
			// Handle user-defined routes
			for path, route := range routes {
				http.HandleFunc(path, func(w http.ResponseWriter, req *http.Request) {
					fmt.Fprintf(w, "%s", route.Handler(req))
				})
			}
	
			// Start server
			fmt.Printf("💤 Somnolence is running at http://localhost:%v\n", port)
			err := http.ListenAndServe(fmt.Sprintf(":%v", port), nil)
			if errors.Is(err, http.ErrServerClosed) {
				fmt.Println("server closed")
			} else if err != nil {
				fmt.Printf("error starting server: %s\n", err)
				os.Exit(1)
			}
		},
	}
	return somnolenceServer
}



func main() {
	type ExampleRoutes struct {
		Hello struct {
			Input struct {
				Name string `json:"name"`
			} `json:"input"`
			Output struct {
				Message string `json:"message"`
			} `json:"output"`
		} `json:"/hello"`
	}
	somnolenceServer := CreateSomnolenceServer[ExampleRoutes](3000, map[string]Route{
		"/hello": {
			Handler: func(req *http.Request) any {
				return struct {message string}{
					message: fmt.Sprintf("Hello, %s!", req.URL.Query().Get("name")),
				}
			},
		},
	})
	somnolenceServer.Start()
}
