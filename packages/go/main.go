package main

import (
	"errors"
	"fmt"
	"net/http"
	"os"
)

type Route struct {
	Input any
	Output any
	Handler func(input any) any
	Authorizer func(req any, input any) bool
}

type SomnolenceServer struct {
	Port int
	Start func()
}

func CreateSomnolenceServer(port int, routes []Route) SomnolenceServer {
	somnolenceServer := SomnolenceServer{
		Port: port,
	}
	somnolenceServer.Start = func() {
		fmt.Printf("💤 Somnolence is running at http://localhost:%v", port)

		http.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "Hello, %s!", r.URL.Query().Get("name"))
		})

		err := http.ListenAndServe(":3333", nil)
		if errors.Is(err, http.ErrServerClosed) {
			fmt.Printf("server closed\n")
		} else if err != nil {
			fmt.Printf("error starting server: %s\n", err)
			os.Exit(1)
		}
	}
	return somnolenceServer
}

func main() {
	somnolenceServer := CreateSomnolenceServer(8080, []Route{})
	somnolenceServer.Start()
}
