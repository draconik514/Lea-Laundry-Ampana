package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type ServiceRequest struct {
	Name         string  `json:"name" binding:"required"`
	Category     string  `json:"category"`
	Description  string  `json:"description"`
	Unit         string  `json:"unit"`
	PricePerKg   float64 `json:"price_per_kg" binding:"required"`
	EstimatedDay int     `json:"estimated_day" binding:"required"`
}

type ServiceResponse struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	Category     string    `json:"category"`
	Description  string    `json:"description"`
	Unit         string    `json:"unit"`
	PricePerKg   float64   `json:"price_per_kg"`
	EstimatedDay int       `json:"estimated_day"`
	CreatedAt    time.Time `json:"created_at"`
}

func GetServices(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), dbTimeout)
		defer cancel()

		rows, err := db.QueryContext(ctx, `
            SELECT id, name, COALESCE(category,'Umum'), COALESCE(description,''), COALESCE(unit,'Kg'), price_per_kg, estimated_day, created_at 
            FROM services 
            ORDER BY category, price_per_kg
        `)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		services := []ServiceResponse{}
		for rows.Next() {
			var s ServiceResponse
			rows.Scan(&s.ID, &s.Name, &s.Category, &s.Description, &s.Unit, &s.PricePerKg, &s.EstimatedDay, &s.CreatedAt)
			services = append(services, s)
		}

		c.JSON(http.StatusOK, services)
	}
}

func CreateService(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ServiceRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if req.Category == "" {
			req.Category = "Umum"
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), dbTimeout)
		defer cancel()

		result, err := db.ExecContext(ctx,
			`INSERT INTO services (name, category, description, unit, price_per_kg, estimated_day) VALUES (?, ?, ?, ?, ?, ?)`,
			req.Name, req.Category, req.Description, req.Unit, req.PricePerKg, req.EstimatedDay,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create service"})
			return
		}

		id, _ := result.LastInsertId()
		c.JSON(http.StatusCreated, gin.H{"message": "Service created", "id": id})
	}
}

func UpdateService(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		var req ServiceRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if req.Category == "" {
			req.Category = "Umum"
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), dbTimeout)
		defer cancel()

		_, err := db.ExecContext(ctx,
			`UPDATE services SET name = ?, category = ?, description = ?, unit = ?, price_per_kg = ?, estimated_day = ? WHERE id = ?`,
			req.Name, req.Category, req.Description, req.Unit, req.PricePerKg, req.EstimatedDay, id,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update service"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Service updated"})
	}
}

func DeleteService(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))

		ctx, cancel := context.WithTimeout(c.Request.Context(), dbTimeout)
		defer cancel()

		// Cek apakah service masih dipakai oleh order
		var count int
		db.QueryRowContext(ctx, "SELECT COUNT(*) FROM orders WHERE service_id = ?", id).Scan(&count)
		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Layanan tidak bisa dihapus karena masih digunakan oleh " + strconv.Itoa(count) + " pesanan",
			})
			return
		}

		_, err := db.ExecContext(ctx, "DELETE FROM services WHERE id = ?", id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete service"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Service deleted"})
	}
}
