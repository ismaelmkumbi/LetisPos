package api

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/ismaelmkumbi/lsa/collector"
	"github.com/ismaelmkumbi/lsa/config"
	"github.com/ismaelmkumbi/lsa/logs"
	"github.com/ismaelmkumbi/lsa/manager"
)

type Server struct {
	cfg         *config.Config
	http        *http.Server
	mu          sync.RWMutex
	lastMetrics *collector.SystemMetrics
}

func New(cfg *config.Config, mgr manager.ServiceManager, logStreamer *logs.Streamer) *Server {
	s := &Server{cfg: cfg}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/metrics", s.handleMetrics)

	svcH := &ServicesHandler{Mgr: mgr}
	mux.HandleFunc("/services", svcH.List)
	mux.HandleFunc("/services/", svcH.Action)

	mux.HandleFunc("/processes", s.handleProcesses)
	mux.HandleFunc("/logs/clear-all", logStreamer.HandleClearAll)
	mux.HandleFunc("/logs/clear/", logStreamer.HandleClearService)

	mux.HandleFunc("/logs/", func(w http.ResponseWriter, r *http.Request) {
		service := strings.TrimPrefix(r.URL.Path, "/logs/")
		logStreamer.ServeLogs(w, r, service)
	})

	s.http = &http.Server{
		Addr:    cfg.ListenAddr,
		Handler: withLogging(mux),
	}
	return s
}

func (s *Server) UpdateMetrics(m *collector.SystemMetrics) {
	s.mu.Lock()
	s.lastMetrics = m
	s.mu.Unlock()
}

func (s *Server) Start() error {
	ln, err := net.Listen("tcp", s.cfg.ListenAddr)
	if err != nil {
		return err
	}
	log.Printf("api: listening on %s", s.cfg.ListenAddr)
	return s.http.Serve(ln)
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.http.Shutdown(ctx)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "ok",
		"server":  s.cfg.ServerName,
		"version": "1.0.0",
	})
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	m := s.lastMetrics
	s.mu.RUnlock()
	w.Header().Set("Content-Type", "application/json")
	if m == nil {
		http.Error(w, `{"error":"no metrics yet"}`, http.StatusServiceUnavailable)
		return
	}
	json.NewEncoder(w).Encode(m)
}

func (s *Server) handleProcesses(w http.ResponseWriter, r *http.Request) {
	procs, err := collector.CollectProcesses()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(procs)
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("api: %s %s %v", r.Method, r.URL.Path, time.Since(start))
	})
}
