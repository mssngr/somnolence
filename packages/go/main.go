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

type Handler[I any, O any] func(I) O

type Route[I any, O any] struct {
	Handler Handler[I, O]
	// Authorizer func(req *http.Request, input I) bool
}

type SomnolenceServer struct {
	Start func()
}

func CreateSomnolenceServer[Routes any](port int, routes map[string]any) SomnolenceServer {
	somnolenceServer := SomnolenceServer{
		Start: func() {
			// Handle __schema route
			http.HandleFunc("/__schema", func(w http.ResponseWriter, req *http.Request) {
				reflector := jsonschema.Reflector{}
				var t Routes
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
					handler := route.(Handler[any, any])
					fmt.Fprintf(w, "%s", handler(req.URL.Query()))
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
	// Health route
	type HealthInput struct{}
	type HealthOutput string
	// Hello route
	type HelloInput struct {
		Name string `json:"name"`
	}
	type HelloOutput struct {
		Message string `json:"message"`
	}
	// Combined routes
	type Routes struct {
		Health struct {
			Input  HealthInput  `json:"input"`
			Output HealthOutput `json:"output"`
		} `json:"health"`
		Hello struct {
			Input  HelloInput  `json:"input"`
			Output HelloOutput `json:"output"`
		} `json:"hello"`
	}
	// Create and start server
	somnolenceServer := CreateSomnolenceServer[Routes](3000, map[string]any{
		"/health": func(input HealthInput) HealthOutput {
			return "OK"
		},
		"/hello": func(input HelloInput) HelloOutput {
			return HelloOutput{
				Message: fmt.Sprintf("Hello, %s!", input.Name),
			}
		},
	})
	somnolenceServer.Start()
}
