package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func New(addr string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(context.Background(), addr)
	if err != nil {
		return nil, err
	}

	return pool, nil
}
