package main

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type DatabaseService struct {
	db *pgx.Conn
}

func (d *DatabaseService) ListTable() []string {
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

func (d *DatabaseService) ListData(tablename string) []map[string]string {
	var data []map[string]string

	columnQuery := `
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position`

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

		// cast to text to avoid type error
		selectParts = append(selectParts, colName+"::text")
	}

	query := fmt.Sprintf("SELECT %s FROM %s LIMIT $1", strings.Join(selectParts, ", "), tablename)

	rows, err := d.db.Query(context.Background(), query, 50)
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

func (d *DatabaseService) ListStructure(tablename string) []map[string]string {
	var data []map[string]string

	query := `
	SELECT column_name, data_type, is_nullable, column_default
	FROM information_schema.columns
	WHERE table_name = $1`

	rows, err := d.db.Query(context.Background(), query, tablename)
	if err != nil {
		fmt.Println(err)
		return data
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
		data = append(data, row)
	}

	return data
}
