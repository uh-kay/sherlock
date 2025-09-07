package db

import (
	"context"

	"github.com/jackc/pgx/v5"
)

func New(addr string) (*pgx.Conn, error) {
	conn, err := pgx.Connect(context.Background(), addr)
	if err != nil {
		return nil, err
	}

	if err = conn.Ping(context.Background()); err != nil {
		return nil, err
	}
	return conn, nil
}
