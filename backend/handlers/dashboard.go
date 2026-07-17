package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	dashboardCache     *DashboardStats
	dashboardCacheTime time.Time
	dashboardMu        sync.Mutex
)

const dashboardCacheTTL = 30 * time.Second

type DashboardStats struct {
	TotalOrders      int           `json:"total_orders"`
	ProcessingOrders int           `json:"processing_orders"`
	CompletedOrders  int           `json:"completed_orders"`
	LateOrders       int           `json:"late_orders"`
	RevenueToday     float64       `json:"revenue_today"`
	WeeklyData       []WeeklyOrder `json:"weekly_data"`
	RecentOrders     []RecentOrder `json:"recent_orders"`
}

type WeeklyOrder struct {
	Day   string `json:"day"`
	Count int    `json:"count"`
}

type RecentOrder struct {
	ID         int     `json:"id"`
	Code       string  `json:"code"`
	Customer   string  `json:"customer"`
	Weight     float64 `json:"weight"`
	Status     string  `json:"status"`
	TotalPrice float64 `json:"total_price"`
}

func GetDashboardStats(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		dashboardMu.Lock()
		if dashboardCache != nil && time.Since(dashboardCacheTime) < dashboardCacheTTL {
			cached := *dashboardCache
			dashboardMu.Unlock()
			c.JSON(http.StatusOK, cached)
			return
		}
		dashboardMu.Unlock()

		ctx, cancel := context.WithTimeout(c.Request.Context(), dbTimeout)
		defer cancel()

		stats := DashboardStats{}

		// Batch semua COUNT dalam 1 query — hemat 4 round-trip ke Turso
		db.QueryRowContext(ctx, `
			SELECT
				COUNT(*),
				COUNT(CASE WHEN status NOT IN ('completed','cancelled') THEN 1 END),
				COUNT(CASE WHEN status = 'completed' THEN 1 END),
				COALESCE(SUM(CASE WHEN DATE(created_at) = DATE('now') AND status = 'completed' THEN total_price END), 0)
			FROM orders
		`).Scan(&stats.TotalOrders, &stats.ProcessingOrders, &stats.CompletedOrders, &stats.RevenueToday)

		db.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM orders o
			JOIN services s ON o.service_id = s.id
			WHERE o.created_at < datetime('now', '-' || s.estimated_day || ' days')
			AND o.status NOT IN ('completed', 'cancelled')
		`).Scan(&stats.LateOrders)

		days := []string{"Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"}
		stats.WeeklyData = make([]WeeklyOrder, 7)
		for i := range stats.WeeklyData {
			stats.WeeklyData[i].Day = days[i]
		}
		rows, err := db.QueryContext(ctx, `
			SELECT strftime('%w', created_at) as day, COUNT(*)
			FROM orders
			WHERE created_at >= date('now', '-6 days')
			GROUP BY strftime('%w', created_at)
			ORDER BY day
		`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var day, count int
				rows.Scan(&day, &count)
				if day >= 0 && day < 7 {
					stats.WeeklyData[day].Count = count
				}
			}
		}

		rows, err = db.QueryContext(ctx, `
			SELECT o.id, o.code, c.name, o.weight, o.status, o.total_price
			FROM orders o
			JOIN customers c ON o.customer_id = c.id
			ORDER BY o.created_at DESC
			LIMIT 5
		`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var order RecentOrder
				rows.Scan(&order.ID, &order.Code, &order.Customer, &order.Weight, &order.Status, &order.TotalPrice)
				stats.RecentOrders = append(stats.RecentOrders, order)
			}
		}

		dashboardMu.Lock()
		dashboardCache = &stats
		dashboardCacheTime = time.Now()
		dashboardMu.Unlock()

		c.JSON(http.StatusOK, stats)
	}
}
