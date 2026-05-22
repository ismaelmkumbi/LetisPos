package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ismaelmkumbi/lsa/api"
	"github.com/ismaelmkumbi/lsa/collector"
	"github.com/ismaelmkumbi/lsa/config"
	"github.com/ismaelmkumbi/lsa/logs"
	"github.com/ismaelmkumbi/lsa/manager"
	"github.com/ismaelmkumbi/lsa/reporter"
)

func main() {
	cfgPath := flag.String("config", "/etc/lsa/config.yaml", "path to config file")
	flag.Parse()

	cfg, err := config.Load(*cfgPath)
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		log.Println("shutting down...")
		cancel()
	}()

	sysMgr := manager.NewDocker(cfg.ComposeDir)
	log.Printf("docker manager: using compose dir %s", cfg.ComposeDir)
	logStreamer := logs.New()
	srv := api.New(cfg, sysMgr, logStreamer)

	// Background metrics collection
	interval, _ := time.ParseDuration(cfg.MetricsInterval)
	if interval == 0 {
		interval = 5 * time.Second
	}
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		// Collect immediately on start
		if m, err := collector.Snapshot(); err == nil {
			srv.UpdateMetrics(m)
		}
		for {
			select {
			case <-ticker.C:
				if m, err := collector.Snapshot(); err == nil {
					srv.UpdateMetrics(m)
				} else {
					log.Printf("collector error: %v", err)
				}
			case <-ctx.Done():
				return
			}
		}
	}()

	// Start heartbeat reporter (non-fatal if Hub URL not configured)
	if cfg.HubURL != "" && cfg.HubSecret != "" {
		rep := reporter.New(cfg)
		go rep.Loop(ctx, interval, collector.Snapshot)
	}

	go func() {
		if err := srv.Start(); err != nil {
			log.Fatalf("api: %v", err)
		}
	}()

	log.Printf("lsa %s started on %s", cfg.ServerName, cfg.ListenAddr)
	<-ctx.Done()
	srv.Shutdown(context.Background())
}
