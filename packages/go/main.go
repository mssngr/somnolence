package main

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	// "github.com/swaggest/jsonschema-go"
)

type Route[I any, O any] struct {
	Handler func(I) O
	// Authorizer func(req *http.Request, input I) bool
}

type Routes map[string]any

type SomnolenceServer struct {
	Port int
	Start func()
}

func CreateSomnolenceServer(port int, routes Routes) SomnolenceServer {
	// reflector := jsonschema.Reflector{}
	somnolenceServer := SomnolenceServer{
		Port: port,
	}
	somnolenceServer.Start = func() {
		fmt.Printf("💤 Somnolence is running at http://localhost:%v\n", port)

		for path, route := range routes {
			typedRoute := route.(Route[any, any])
			http.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
				// if path == "/__schema" {
				// 	input := reflector.New(route.Input)
				// 	err := json.NewDecoder(r.Body).Decode(input)
				// 	if err != nil {
				// 		http.Error(w, err.Error(), http.StatusBadRequest)
				// 		return
				// 	}

				// 	if route.Authorizer != nil && !route.Authorizer(r, input) {
				// 		http.Error(w, "Unauthorized", http.StatusUnauthorized)
				// 		return
				// 	}

				// 	output := reflector.New(route.Output)
				// 	output = route.Handler(input)

				// 	json.NewEncoder(w).Encode(output)
				// } else {
				fmt.Fprintf(w, "%s", typedRoute.Handler(r.URL.Query()))
				// }
			})
		}

		err := http.ListenAndServe(fmt.Sprintf(":%v", port), nil)
		if errors.Is(err, http.ErrServerClosed) {
			fmt.Println("server closed")
		} else if err != nil {
			fmt.Printf("error starting server: %s\n", err)
			os.Exit(1)
		}
	}
	return somnolenceServer
}

func CreateRoute[I any, O any](route Route[I, O]) Route[I, O]{
	return Route[I, O]{
		Handler: route.Handler,
		// Authorizer: route.Authorizer,
	}
}

func main() {
	somnolenceServer := CreateSomnolenceServer(3000, Routes{
		"/hello": CreateRoute(Route[
			struct {
				name string
			},
			struct {
				message string
			},
		]{
			Handler: func(input struct {name string}) struct {message string} {
			return struct {message string}{
				message: fmt.Sprintf("Hello, %s!", input.name),
			}
		}}),
	})
	somnolenceServer.Start()
}
