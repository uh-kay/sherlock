package db

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
)

func New() *pgx.Conn {
	conn, err := pgx.Connect(context.Background(), "postgres://root:password@localhost:5433/social?sslmode=disable")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
	}

	if err = conn.Ping(context.Background()); err != nil {
		fmt.Printf("no response from db: %v", err)
	}

	log.Println("connected to db")

	return conn
}
