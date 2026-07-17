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
	reportCache     *FinancialReport
	reportCacheTime time.Time
	reportMu        sync.Mutex
)

const reportCacheTTL = 5 * time.Minute

type FinancialReport struct {
	DailyRevenue     float64            `json:"daily_revenue"`
	MonthlyRevenue   float64            `json:"monthly_revenue"`
	TotalRevenue     float64            `json:"total_revenue"`
	TotalOrders      int                `json:"total_orders"`
	DailyOrders      int                `json:"daily_orders"`
	MonthlyOrders    int                `json:"monthly_orders"`
	AverageOrder     float64            `json:"average_order"`
	RevenueByService []RevenueByService `json:"revenue_by_service"`
	DailyData        []DailyData        `json:"daily_data"`
}

type RevenueByService struct {
	ServiceName  string  `json:"service_name"`
	Category     string  `json:"category"`
	TotalOrders  int     `json:"total_orders"`
	TotalRevenue float64 `json:"total_revenue"`
}

type DailyData struct {
	Date    string  `json:"date"`
	Orders  int     `json:"orders"`
	Revenue float64 `json:"revenue"`
}

func GetFinancialReport(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		reportMu.Lock()
		if reportCache != nil && time.Since(reportCacheTime) < reportCacheTTL {
			cached := *reportCache
			reportMu.Unlock()
			c.JSON(http.StatusOK, cached)
			return
		}
		reportMu.Unlock()

		ctx, cancel := context.WithTimeout(c.Request.Context(), dbTimeout)
		defer cancel()

		report := FinancialReport{}

		db.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(total_price), 0) FROM orders
			WHERE DATE(created_at) = DATE('now') AND status = 'completed'
		`).Scan(&report.DailyRevenue)

		db.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(total_price), 0) FROM orders
			WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') AND status = 'completed'
		`).Scan(&report.MonthlyRevenue)

		db.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE status = 'completed'
		`).Scan(&report.TotalRevenue)

		db.QueryRowContext(ctx, `SELECT COUNT(*) FROM orders`).Scan(&report.TotalOrders)

		db.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM orders WHERE DATE(created_at) = DATE('now')
		`).Scan(&report.DailyOrders)

		db.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM orders
			WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
		`).Scan(&report.MonthlyOrders)

		if report.TotalOrders > 0 {
			report.AverageOrder = report.TotalRevenue / float64(report.TotalOrders)
		}

		rows, err := db.QueryContext(ctx, `
			SELECT s.name, COALESCE(s.category,'Umum'), COUNT(o.id), COALESCE(SUM(o.total_price), 0)
			FROM services s
			LEFT JOIN orders o ON s.id = o.service_id AND o.status = 'completed'
			GROUP BY s.name, s.category
			ORDER BY s.category, s.name
		`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var r RevenueByService
				rows.Scan(&r.ServiceName, &r.Category, &r.TotalOrders, &r.TotalRevenue)
				report.RevenueByService = append(report.RevenueByService, r)
			}
		}

		rows, err = db.QueryContext(ctx, `
			SELECT DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total_price), 0) as revenue
			FROM orders
			WHERE created_at >= date('now', '-29 days')
			GROUP BY DATE(created_at)
			ORDER BY date
		`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var d DailyData
				rows.Scan(&d.Date, &d.Orders, &d.Revenue)
				report.DailyData = append(report.DailyData, d)
			}
		}

		reportMu.Lock()
		reportCache = &report
		reportCacheTime = time.Now()
		reportMu.Unlock()

		c.JSON(http.StatusOK, report)
	}
}
