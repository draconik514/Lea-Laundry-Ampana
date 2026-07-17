package main

import (
    "log"
    "os"

    "github.com/gin-gonic/gin"
    "github.com/joho/godotenv"
    "laundryflow/config"
    "laundryflow/routes"
)

func main() {
    // Load .env
    if err := godotenv.Load(); err != nil {
        log.Println("Warning: .env file not found")
    }

    if os.Getenv("GIN_MODE") == "" {
        gin.SetMode(gin.ReleaseMode)
    }

    // Initialize database
    config.InitDB()
    defer config.DB.Close()

    // Setup router
    router := routes.SetupRouter(config.DB)

    // Start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("Server running on port %s", port)
    if err := router.Run(":" + port); err != nil {
        log.Fatal("Failed to start server:", err)
    }
}