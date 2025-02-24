package main

import "fmt"

type Route struct {
	Input any
	Output any
	Handler func(input any) any
	Authorizer func(req any, input any) bool
}

type SomnolenceServer interface {
	Start() any
}

func CreateSomnolenceServer(port int, routes []Route) SomnolenceServer {
	return SomnolenceServer{
		Start: func() {
			fmt.Println("Starting server on port", port)
		},
	}
}

func main() {
	somnolenceServer := CreateSomnolenceServer(8080, []Route{})
	somnolenceServer.Start()
}
