package main

import (
	"context"
	"database/sql"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/uh-kay/sherlock/db"
)

type PostgresService struct {
	db *pgxpool.Pool
}

func (d *PostgresService) Connect(addr string) error {
	conn, err := db.New(addr)
	if err != nil {
		return err
	}
	d.db = conn
	return nil
}

func (d *PostgresService) Close() {
	if d.db != nil {
		d.db.Close()
	}
}

func (d *PostgresService) ListTable() []string {
	var tables []string
	query := "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'"

	rows, err := d.db.Query(context.Background(), query)
	if err != nil {
		fmt.Println(err)
	}
	defer rows.Close()

	for rows.Next() {
		var tablename string
		if err := rows.Scan(&tablename); err != nil {
			fmt.Println(err)
			return nil
		}

		tables = append(tables, tablename)
	}

	return tables
}

func (d *PostgresService) ListData(tablename, columnName, direction string, offset int) []map[string]string {
	var data []map[string]string

	columnQuery := `
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = $1`

	columnRows, err := d.db.Query(context.Background(), columnQuery, tablename)
	if err != nil {
		fmt.Printf("Error getting column info: %v\n", err)
		return nil
	}
	defer columnRows.Close()

	var columns []string
	var selectParts []string

	for columnRows.Next() {
		var colName, dataType, udtName string
		if err := columnRows.Scan(&colName, &dataType, &udtName); err != nil {
			fmt.Printf("Error scanning column info: %v\n", err)
			return nil
		}

		columns = append(columns, colName)

		numericTypes := []string{
			"integer", "bigint", "smallint", "decimal", "numeric",
			"real", "double precision", "serial", "bigserial",
		}

		// cast to text except numeric types to avoid type error
		if slices.Contains(numericTypes, dataType) {
			selectParts = append(selectParts, colName)
		} else {
			selectParts = append(selectParts, colName+"::text")
		}
	}

	var query string
	if direction != "" {
		query = fmt.Sprintf("SELECT %s FROM %s ORDER BY %s %s LIMIT 50 OFFSET %d",
			strings.Join(selectParts, ", "),
			tablename,
			columnName,
			direction,
			offset,
		)
	} else {
		query = fmt.Sprintf("SELECT %s FROM %s LIMIT 50 OFFSET %d",
			strings.Join(selectParts, ", "),
			tablename,
			offset,
		)
	}

	rows, err := d.db.Query(context.Background(), query)
	if err != nil {
		fmt.Printf("Error querying table: %v\n", err)
		return nil
	}
	defer rows.Close()

	for rows.Next() {
		fieldDescriptions := rows.FieldDescriptions()
		values := make([]any, len(fieldDescriptions))
		valuePtrs := make([]any, len(fieldDescriptions))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			fmt.Printf("Scan error: %v\n", err)
			return nil
		}

		row := make(map[string]string)
		for i, fd := range fieldDescriptions {
			val := values[i]
			if val == nil {
				row[fd.Name] = "NULL"
			} else {
				switch v := val.(type) {
				case []byte:
					row[fd.Name] = string(v)
				case string:
					row[fd.Name] = v
				case time.Time:
					row[fd.Name] = v.Format(time.RFC3339)
				default:
					row[fd.Name] = fmt.Sprintf("%v", v)
				}
			}
		}
		data = append(data, row)
	}

	if err := rows.Err(); err != nil {
		fmt.Printf("Row iteration error: %v\n", err)
		return nil
	}

	return data
}

type Structure struct {
	Name     string
	Type     string
	Nullable string
	Default  sql.NullString
}

func (d *PostgresService) ListStructure(tablename string) []map[string]string {
	var structure []map[string]string

	query := `
	SELECT column_name, data_type, is_nullable, column_default
	FROM information_schema.columns
	WHERE table_name = $1`

	rows, err := d.db.Query(context.Background(), query, tablename)
	if err != nil {
		fmt.Println(err)
		return structure
	}
	defer rows.Close()

	var dbStructure Structure

	for rows.Next() {
		if err := rows.Scan(
			&dbStructure.Name,
			&dbStructure.Type,
			&dbStructure.Nullable,
			&dbStructure.Default,
		); err != nil {
			fmt.Println(err)
			continue
		}

		row := make(map[string]string)
		row["column_name"] = dbStructure.Name
		row["data_type"] = dbStructure.Type
		row["nullable"] = dbStructure.Nullable
		if dbStructure.Default.Valid {
			row["column_default"] = dbStructure.Default.String
		} else {
			row["column_default"] = ""
		}
		structure = append(structure, row)
	}

	return structure
}

func (d *PostgresService) ListCount(tablename string) int64 {
	var count int64
	query := fmt.Sprintf("SELECT COUNT(*) FROM %s", tablename)

	err := d.db.QueryRow(context.Background(), query).Scan(&count)
	if err != nil {
		return 0
	}
	return count
}
