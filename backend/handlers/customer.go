package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CustomerOrderRequest struct {
	CustomerName    string   `json:"customer_name" binding:"required"`
	CustomerPhone   string   `json:"customer_phone" binding:"required"`
	CustomerAddress string   `json:"customer_address" binding:"required"`
	Latitude        *float64 `json:"latitude"`
	Longitude       *float64 `json:"longitude"`
	LocationURL     string   `json:"location_url"`
	ServiceID       int      `json:"service_id" binding:"required"`
	Weight          float64  `json:"weight"`
	Note            string   `json:"note"`
	OrderSource     string   `json:"order_source"`
}

type CustomerOrderResponse struct {
	ID              int       `json:"id"`
	Code            string    `json:"code"`
	CustomerName    string    `json:"customer_name"`
	CustomerPhone   string    `json:"customer_phone"`
	CustomerAddress string    `json:"customer_address"`
	Weight          float64   `json:"weight"`
	TotalPrice      float64   `json:"total_price"`
	Status          string    `json:"status"`
	Note            string    `json:"note"`
	OrderSource     string    `json:"order_source"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	ServiceName     string    `json:"service_name"`
	ServiceID       int       `json:"service_id"`
	EstimatedDay    int       `json:"estimated_day"`
	ServiceUnit     string    `json:"service_unit"`
}

type CustomerStatusHistory struct {
	Status    string    `json:"status"`
	UpdatedAt time.Time `json:"updated_at"`
}

func CreateCustomerOrder(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CustomerOrderRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if req.OrderSource == "" {
			req.OrderSource = "website"
		}

		// Gabungkan alamat dengan info GPS jika ada
		addressWithGPS := req.CustomerAddress
		if req.LocationURL != "" {
			addressWithGPS = req.CustomerAddress + " | GPS: " + req.LocationURL
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), dbTimeout)
		defer cancel()

		// Cari customer yang sudah ada berdasarkan nomor HP, kalau tidak ada buat baru
		var customerID int64
		if req.CustomerPhone != "" {
			var existingID int
			err := db.QueryRowContext(ctx, `SELECT id FROM customers WHERE phone = ?`, req.CustomerPhone).Scan(&existingID)
			if err == nil {
				customerID = int64(existingID)
				db.ExecContext(ctx, `UPDATE customers SET address = ? WHERE id = ?`, addressWithGPS, existingID)
			}
		}

		if customerID == 0 {
			result, err := db.ExecContext(ctx,
				`INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)`,
				req.CustomerName, req.CustomerPhone, addressWithGPS,
			)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create customer"})
				return
			}
			customerID, _ = result.LastInsertId()
		}

		// Get service details
		var serviceName, serviceUnit string
		var pricePerKg float64
		var estimatedDay int
		if err := db.QueryRowContext(ctx,
			`SELECT name, price_per_kg, estimated_day, COALESCE(unit,'Kg') FROM services WHERE id = ?`,
			req.ServiceID,
		).Scan(&serviceName, &pricePerKg, &estimatedDay, &serviceUnit); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid service"})
			return
		}

		totalPrice := pricePerKg * req.Weight
		code := fmt.Sprintf("LW%s", strings.ToUpper(uuid.New().String()[:8]))

		orderResult, err := db.ExecContext(ctx,
			`INSERT INTO orders (code, customer_id, service_id, weight, total_price, status, note, order_source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			code, customerID, req.ServiceID, req.Weight, totalPrice, "pending_pickup", req.Note, req.OrderSource,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
			return
		}
		orderID, _ := orderResult.LastInsertId()

		db.ExecContext(ctx, `INSERT INTO status_histories (order_id, status) VALUES (?, ?)`, orderID, "pending_pickup")

		response := CustomerOrderResponse{
			ID:              int(orderID),
			Code:            code,
			CustomerName:    req.CustomerName,
			CustomerPhone:   req.CustomerPhone,
			CustomerAddress: addressWithGPS,
			Weight:          req.Weight,
			TotalPrice:      totalPrice,
			Status:          "pending_pickup",
			Note:            req.Note,
			OrderSource:     req.OrderSource,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
			ServiceName:     serviceName,
			ServiceID:       req.ServiceID,
			EstimatedDay:    estimatedDay,
			ServiceUnit:     serviceUnit,
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": "Order created successfully",
			"order":   response,
			"code":    code,
		})
	}
}

func GetCustomerOrder(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		code := strings.TrimSpace(c.Param("code"))

		ctx, cancel := context.WithTimeout(c.Request.Context(), dbTimeout)
		defer cancel()

		var order CustomerOrderResponse
		var createdAt, updatedAt time.Time

		err := db.QueryRowContext(ctx, `
            SELECT o.id, o.code, o.weight, o.total_price, o.status, o.note, 
                   o.order_source, o.created_at, o.updated_at,
                   c.name, c.phone, c.address,
                   s.id, s.name, s.estimated_day, COALESCE(s.unit,'Kg')
            FROM orders o 
            JOIN customers c ON o.customer_id = c.id 
            JOIN services s ON o.service_id = s.id 
            WHERE o.code = ?
        `, code).Scan(
			&order.ID, &order.Code, &order.Weight, &order.TotalPrice,
			&order.Status, &order.Note, &order.OrderSource,
			&createdAt, &updatedAt,
			&order.CustomerName, &order.CustomerPhone, &order.CustomerAddress,
			&order.ServiceID, &order.ServiceName, &order.EstimatedDay, &order.ServiceUnit,
		)

		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		order.CreatedAt = createdAt
		order.UpdatedAt = updatedAt

		rows, err := db.QueryContext(ctx, `
            SELECT status, updated_at 
            FROM status_histories 
            WHERE order_id = ? 
            ORDER BY updated_at ASC
        `, order.ID)

		history := []CustomerStatusHistory{}
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var h CustomerStatusHistory
				rows.Scan(&h.Status, &h.UpdatedAt)
				history = append(history, h)
			}
		}

		c.JSON(http.StatusOK, gin.H{"order": order, "history": history})
	}
}

func GetCustomerOrders(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.Query("phone")
		if phone == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number required"})
			return
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), dbTimeout)
		defer cancel()

		rows, err := db.QueryContext(ctx, `
            SELECT o.id, o.code, o.weight, o.total_price, o.status, o.note, 
                   o.order_source, o.created_at, o.updated_at,
                   c.name, c.phone, c.address,
                   s.id, s.name, s.estimated_day, COALESCE(s.unit,'Kg')
            FROM orders o 
            JOIN customers c ON o.customer_id = c.id 
            JOIN services s ON o.service_id = s.id 
            WHERE c.phone = ?
            ORDER BY o.created_at DESC
            LIMIT 20
        `, phone)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		orders := []CustomerOrderResponse{}
		for rows.Next() {
			var o CustomerOrderResponse
			var createdAt, updatedAt time.Time
			rows.Scan(
				&o.ID, &o.Code, &o.Weight, &o.TotalPrice,
				&o.Status, &o.Note, &o.OrderSource,
				&createdAt, &updatedAt,
				&o.CustomerName, &o.CustomerPhone, &o.CustomerAddress,
				&o.ServiceID, &o.ServiceName, &o.EstimatedDay, &o.ServiceUnit,
			)
			o.CreatedAt = createdAt
			o.UpdatedAt = updatedAt
			orders = append(orders, o)
		}

		c.JSON(http.StatusOK, orders)
	}
}
