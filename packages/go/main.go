package main

import "fmt"

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
		fmt.Println("💤 Somnolence is running at http://localhost:", port)
	}
	return somnolenceServer
}

func main() {
	somnolenceServer := CreateSomnolenceServer(8080, []Route{})
	somnolenceServer.Start()
}
