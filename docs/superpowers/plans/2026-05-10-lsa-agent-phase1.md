# Letis Control Center — Phase 1: Server Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `lsa` — a Go daemon deployed on Ubuntu servers that collects system metrics, manages systemd/Docker services, streams logs, and reports to the Control Hub via REST.

**Architecture:** Single Go binary with modular packages for collectors (CPU, memory, disk, network), managers (systemd, Docker), log streaming, heartbeat reporting, and an HTTP API server. No external runtime dependencies — everything compiles into a ~10 MB static binary.

**Tech Stack:** Go 1.24+, `net/http` (stdlib), `github.com/coreos/go-systemd/v22`, `github.com/docker/docker/client`, `github.com/shirou/gopsutil/v3`, `github.com/spf13/viper`

---

## File Structure

| Path | Responsibility |
|------|---------------|
| `ops/agent/go.mod` | Go module definition |
| `ops/agent/main.go` | Entry point, CLI flags, startup |
| `ops/agent/config/config.go` | Config loading via Viper |
| `ops/agent/collector/cpu.go` | CPU metrics from gopsutil |
| `ops/agent/collector/memory.go` | Memory metrics |
| `ops/agent/collector/disk.go` | Disk I/O and usage |
| `ops/agent/collector/network.go` | Network throughput |
| `ops/agent/collector/types.go` | Shared metric types |
| `ops/agent/manager/systemd.go` | systemd via D-Bus |
| `ops/agent/manager/docker.go` | Docker via socket |
| `ops/agent/manager/types.go` | Service info types |
| `ops/agent/logs/streamer.go` | Journald + Docker log streaming |
| `ops/agent/api/server.go` | HTTP server, mux, middleware |
| `ops/agent/api/handlers.go` | Route handlers |
| `ops/agent/reporter/heartbeat.go` | Periodic push to Hub |
| `ops/agent/auth/hmac.go` | HMAC request signing |
| `ops/agent/install/lsa.service` | systemd unit file |
| `ops/agent/install/install.sh` | One-line install script |

---

### Task 1: Project scaffolding and config

**Files:**
- Create: `ops/agent/go.mod`
- Create: `ops/agent/main.go`
- Create: `ops/agent/config/config.go`

- [ ] **Step 1: Initialize Go module**

```bash
cd ops/agent && go mod init github.com/ismaelmkumbi/lsa
```

- [ ] **Step 2: Write config package**

```go
// config/config.go
package config

import "github.com/spf13/viper"

type Config struct {
	HubURL         string `mapstructure:"hub_url"`
	HubSecret      string `mapstructure:"hub_secret"`
	ListenAddr     string `mapstructure:"listen_addr"`
	ServerName     string `mapstructure:"server_name"`
	MetricsInterval string `mapstructure:"metrics_interval"`
	LogMaxLines    int    `mapstructure:"log_max_lines"`
}

func Load(path string) (*Config, error) {
	v := viper.New()
	v.SetDefault("listen_addr", "127.0.0.1:9100")
	v.SetDefault("metrics_interval", "5s")
	v.SetDefault("log_max_lines", 1000)
	v.SetConfigFile(path)
	if err := v.ReadInConfig(); err != nil {
		return nil, err
	}
	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
```

- [ ] **Step 3: Write main.go skeleton**

```go
// main.go
package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/ismaelmkumbi/lsa/config"
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

	log.Printf("lsa %s starting on %s", cfg.ServerName, cfg.ListenAddr)
	<-ctx.Done()
}
```

- [ ] **Step 4: Add dependencies and verify build**

```bash
cd ops/agent && go get github.com/spf13/viper && go build ./...
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add ops/agent/go.mod ops/agent/go.sum ops/agent/main.go ops/agent/config/
git commit -m "feat(lsa): project scaffolding with config loader"
```

---

### Task 2: System metrics collectors

**Files:**
- Create: `ops/agent/collector/types.go`
- Create: `ops/agent/collector/cpu.go`
- Create: `ops/agent/collector/memory.go`
- Create: `ops/agent/collector/disk.go`
- Create: `ops/agent/collector/network.go`

- [ ] **Step 1: Write shared types**

```go
// collector/types.go
package collector

import "time"

type SystemMetrics struct {
	Timestamp time.Time       `json:"timestamp"`
	CPU       CPUMetrics      `json:"cpu"`
	Memory    MemoryMetrics   `json:"memory"`
	Disk      DiskMetrics     `json:"disk"`
	Network   NetworkMetrics  `json:"network"`
	Uptime    uint64          `json:"uptime_seconds"`
	LoadAvg   LoadAvg         `json:"load_avg"`
}

type CPUMetrics struct {
	PercentUsed float64  `json:"percent_used"`
	PerCPU      []float64 `json:"per_cpu"`
	Count       int      `json:"count"`
}

type MemoryMetrics struct {
	Total     uint64 `json:"total_bytes"`
	Used      uint64 `json:"used_bytes"`
	Available uint64 `json:"available_bytes"`
	SwapTotal uint64 `json:"swap_total_bytes"`
	SwapUsed  uint64 `json:"swap_used_bytes"`
	Percent   float64 `json:"percent_used"`
}

type DiskMetrics struct {
	Mounts []DiskMount `json:"mounts"`
}

type DiskMount struct {
	Path        string  `json:"path"`
	TotalBytes  uint64  `json:"total_bytes"`
	UsedBytes   uint64  `json:"used_bytes"`
	FreeBytes   uint64  `json:"free_bytes"`
	PercentUsed float64 `json:"percent_used"`
}

type NetworkMetrics struct {
	Interfaces []NetInterface `json:"interfaces"`
}

type NetInterface struct {
	Name       string `json:"name"`
	RxBytes    uint64 `json:"rx_bytes"`
	TxBytes    uint64 `json:"tx_bytes"`
	RxPackets  uint64 `json:"rx_packets"`
	TxPackets  uint64 `json:"tx_packets"`
}

type LoadAvg struct {
	Load1  float64 `json:"load1"`
	Load5  float64 `json:"load5"`
	Load15 float64 `json:"load15"`
}
```

- [ ] **Step 2: Write CPU collector**

```go
// collector/cpu.go
package collector

import "github.com/shirou/gopsutil/v3/cpu"

func CollectCPU() (CPUMetrics, error) {
	percents, err := cpu.Percent(0, false)
	if err != nil {
		return CPUMetrics{}, err
	}
	perCPU, err := cpu.Percent(0, true)
	if err != nil {
		return CPUMetrics{}, err
	}
	info, err := cpu.Info()
	count := 0
	if err == nil {
		count = len(info)
	}
	var aggregate float64
	if len(percents) > 0 {
		aggregate = percents[0]
	}
	return CPUMetrics{
		PercentUsed: aggregate,
		PerCPU:      perCPU,
		Count:       count,
	}, nil
}
```

- [ ] **Step 3: Write memory collector**

```go
// collector/memory.go
package collector

import "github.com/shirou/gopsutil/v3/mem"

func CollectMemory() (MemoryMetrics, error) {
	v, err := mem.VirtualMemory()
	if err != nil {
		return MemoryMetrics{}, err
	}
	s, err := mem.SwapMemory()
	if err != nil {
		s = &mem.SwapMemoryStat{}
	}
	return MemoryMetrics{
		Total:     v.Total,
		Used:      v.Used,
		Available: v.Available,
		SwapTotal: s.Total,
		SwapUsed:  s.Used,
		Percent:   v.UsedPercent,
	}, nil
}
```

- [ ] **Step 4: Write disk collector**

```go
// collector/disk.go
package collector

import "github.com/shirou/gopsutil/v3/disk"

func CollectDisk() (DiskMetrics, error) {
	partitions, err := disk.Partitions(false)
	if err != nil {
		return DiskMetrics{}, err
	}
	var mounts []DiskMount
	for _, p := range partitions {
		usage, err := disk.Usage(p.Mountpoint)
		if err != nil {
			continue
		}
		mounts = append(mounts, DiskMount{
			Path:        p.Mountpoint,
			TotalBytes:  usage.Total,
			UsedBytes:   usage.Used,
			FreeBytes:   usage.Free,
			PercentUsed: usage.UsedPercent,
		})
	}
	return DiskMetrics{Mounts: mounts}, nil
}
```

- [ ] **Step 5: Write network collector**

```go
// collector/network.go
package collector

import "github.com/shirou/gopsutil/v3/net"

func CollectNetwork() (NetworkMetrics, error) {
	counters, err := net.IOCounters(true)
	if err != nil {
		return NetworkMetrics{}, err
	}
	var ifaces []NetInterface
	for _, c := range counters {
		ifaces = append(ifaces, NetInterface{
			Name:      c.Name,
			RxBytes:   c.BytesRecv,
			TxBytes:   c.BytesSent,
			RxPackets: c.PacketsRecv,
			TxPackets: c.PacketsSent,
		})
	}
	return NetworkMetrics{Interfaces: ifaces}, nil
}
```

- [ ] **Step 6: Add deps and verify build**

```bash
cd ops/agent && go get github.com/shirou/gopsutil/v3 && go build ./...
```

- [ ] **Step 7: Commit**

```bash
git add ops/agent/collector/
git commit -m "feat(lsa): system metrics collectors — CPU, memory, disk, network"
```

---

### Task 3: Metrics snapshot function

**Files:**
- Create: `ops/agent/collector/snapshot.go`

- [ ] **Step 1: Write snapshot collector that gathers all metrics**

```go
// collector/snapshot.go
package collector

import (
	"os"
	"time"
)

func Snapshot() (*SystemMetrics, error) {
	cpu, err := CollectCPU()
	if err != nil {
		return nil, err
	}
	mem, err := CollectMemory()
	if err != nil {
		return nil, err
	}
	disk, err := CollectDisk()
	if err != nil {
		return nil, err
	}
	netw, err := CollectNetwork()
	if err != nil {
		return nil, err
	}
	load, err := loadAvg()
	if err != nil {
		load = LoadAvg{}
	}
	uptime, _ := getUptime()

	return &SystemMetrics{
		Timestamp: time.Now().UTC(),
		CPU:       cpu,
		Memory:    mem,
		Disk:      disk,
		Network:   netw,
		Uptime:    uptime,
		LoadAvg:   load,
	}, nil
}

func getUptime() (uint64, error) {
	data, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return 0, err
	}
	var uptime float64
	fmt.Sscanf(string(data), "%f", &uptime)
	return uint64(uptime), nil
}
```

Add import `"fmt"` at the top.

- [ ] **Step 2: Add load average reader**

```go
// collector/loadavg.go
package collector

import "os"

func loadAvg() (LoadAvg, error) {
	data, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return LoadAvg{}, err
	}
	var l LoadAvg
	fmt.Sscanf(string(data), "%f %f %f", &l.Load1, &l.Load5, &l.Load15)
	return l, nil
}
```

Add `"fmt"` import.

- [ ] **Step 3: Commit**

```bash
git add ops/agent/collector/
git commit -m "feat(lsa): metrics snapshot aggregator"
```

---

### Task 4: HTTP API server and health/metrics endpoints

**Files:**
- Create: `ops/agent/api/server.go`
- Create: `ops/agent/api/handlers.go`
- Modify: `ops/agent/main.go`

- [ ] **Step 1: Write API server**

```go
// api/server.go
package api

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/ismaelmkumbi/lsa/collector"
	"github.com/ismaelmkumbi/lsa/config"
)

type Server struct {
	cfg    *config.Config
	http   *http.Server
	mu     sync.RWMutex
	lastMetrics *collector.SystemMetrics
}

func New(cfg *config.Config) *Server {
	s := &Server{cfg: cfg}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/metrics", s.handleMetrics)
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

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("api: %s %s %v", r.Method, r.URL.Path, time.Since(start))
	})
}
```

- [ ] **Step 2: Update main.go to wire server and collectors**

```go
// main.go (updated)
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

	srv := api.New(cfg)

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

	go func() {
		if err := srv.Start(); err != nil {
			log.Fatalf("api: %v", err)
		}
	}()

	log.Printf("lsa %s started on %s", cfg.ServerName, cfg.ListenAddr)
	<-ctx.Done()
	srv.Shutdown(context.Background())
}
```

- [ ] **Step 3: Build and test**

```bash
cd ops/agent && go build -o lsa . && echo "OK" && rm lsa
```

Expected: OK

- [ ] **Step 4: Commit**

```bash
git add ops/agent/api/ ops/agent/main.go
git commit -m "feat(lsa): HTTP API with /health and /metrics endpoints"
```

---

### Task 5: Systemd service manager

**Files:**
- Create: `ops/agent/manager/types.go`
- Create: `ops/agent/manager/systemd.go`
- Modify: `ops/agent/api/server.go` (add routes)
- Modify: `ops/agent/api/handlers.go`

- [ ] **Step 1: Write service types**

```go
// manager/types.go
package manager

type ServiceInfo struct {
	Name   string `json:"name"`
	Type   string `json:"type"`   // "systemd" or "docker"
	Status string `json:"status"` // "active", "inactive", "failed"
	Desc   string `json:"description"`
}
```

- [ ] **Step 2: Write systemd manager**

```go
// manager/systemd.go
package manager

import (
	"context"

	"github.com/coreos/go-systemd/v22/dbus"
)

type SystemdManager struct {
	conn *dbus.Conn
}

func NewSystemd() (*SystemdManager, error) {
	conn, err := dbus.NewWithContext(context.Background())
	if err != nil {
		return nil, err
	}
	return &SystemdManager{conn: conn}, nil
}

func (m *SystemdManager) List() ([]ServiceInfo, error) {
	units, err := m.conn.ListUnitsContext(context.Background())
	if err != nil {
		return nil, err
	}
	var svcs []ServiceInfo
	for _, u := range units {
		if u.JobId == 0 {
			continue
		}
		svcs = append(svcs, ServiceInfo{
			Name:   u.Name,
			Type:   "systemd",
			Status: u.ActiveState,
			Desc:   u.Description,
		})
	}
	// Also include inactive user services scaled by filtering
	all, _ := m.conn.ListUnitsContext(context.Background())
	_ = all
	return svcs, nil
}

func (m *SystemdManager) Restart(name string) error {
	ch := make(chan string)
	_, err := m.conn.RestartUnitContext(context.Background(), name, "replace", ch)
	if err != nil {
		return err
	}
	<-ch
	return nil
}

func (m *SystemdManager) Stop(name string) error {
	ch := make(chan string)
	_, err := m.conn.StopUnitContext(context.Background(), name, "replace", ch)
	if err != nil {
		return err
	}
	<-ch
	return nil
}

func (m *SystemdManager) Start(name string) error {
	ch := make(chan string)
	_, err := m.conn.StartUnitContext(context.Background(), name, "replace", ch)
	if err != nil {
		return err
	}
	<-ch
	return nil
}

func (m *SystemdManager) Close() {
	m.conn.Close()
}
```

- [ ] **Step 3: Add services endpoint to API handlers**

```go
// api/handlers.go (add to handlers)
package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/ismaelmkumbi/lsa/manager"
)

type ServicesHandler struct {
	Systemd *manager.SystemdManager
}

func (h *ServicesHandler) List(w http.ResponseWriter, r *http.Request) {
	svcs, err := h.Systemd.List()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(svcs)
}

func (h *ServicesHandler) Action(w http.ResponseWriter, r *http.Request) {
	// path: /services/:name/restart | /stop | /start
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/services/"), "/")
	if len(parts) != 2 {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}
	name, action := parts[0], parts[1]
	var err error
	switch action {
	case "restart":
		err = h.Systemd.Restart(name)
	case "stop":
		err = h.Systemd.Stop(name)
	case "start":
		err = h.Systemd.Start(name)
	default:
		http.Error(w, "unknown action", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
```

- [ ] **Step 4: Update server.go to wire services routes**

Modify the `New` function in `server.go` to add:
```go
svcH := &ServicesHandler{Systemd: sysMgr}
mux.HandleFunc("/services", svcH.List)
mux.HandleFunc("/services/", svcH.Action)
```

- [ ] **Step 5: Add dep and build**

```bash
cd ops/agent && go get github.com/coreos/go-systemd/v22 && go build ./...
```

- [ ] **Step 6: Commit**

```bash
git add ops/agent/manager/ ops/agent/api/
git commit -m "feat(lsa): systemd service manager with list/start/stop/restart"
```

---

### Task 6: Log streaming

**Files:**
- Create: `ops/agent/logs/streamer.go`
- Modify: `ops/agent/api/server.go` (add routes)
- Modify: `ops/agent/api/handlers.go`

- [ ] **Step 1: Write log streamer**

```go
// logs/streamer.go
package logs

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
)

type Streamer struct{}

func New() *Streamer {
	return &Streamer{}
}

func (s *Streamer) StreamJournal(service string, tail int, filter string) (io.ReadCloser, error) {
	args := []string{"-u", service, "--no-pager", "-n", strconv.Itoa(tail), "-o", "short-iso"}
	if filter != "" {
		args = append(args, "-p", "3", "-g", filter)
	}
	cmd := exec.Command("journalctl", args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	return &cmdReadCloser{cmd: cmd, ReadCloser: stdout}, nil
}

type cmdReadCloser struct {
	cmd *exec.Cmd
	io.ReadCloser
}

func (c *cmdReadCloser) Close() error {
	c.cmd.Process.Kill()
	c.cmd.Wait()
	return c.ReadCloser.Close()
}

func (s *Streamer) ServeLogs(w http.ResponseWriter, r *http.Request, service string) {
	tail, _ := strconv.Atoi(r.URL.Query().Get("tail"))
	if tail == 0 {
		tail = 100
	}
	filter := r.URL.Query().Get("filter")

	rc, err := s.StreamJournal(service, tail, filter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rc.Close()

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	scanner := bufio.NewScanner(rc)
	for scanner.Scan() {
		fmt.Fprintln(w, scanner.Text())
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
	}
}
```

Wait, fix the unused imports by removing `"strings"` and `"strconv"` is fine.

- [ ] **Step 2: Add logs endpoint to server**

In `server.go` New(), add:
```go
logStreamer := logs.New()
mux.HandleFunc("/logs/", func(w http.ResponseWriter, r *http.Request) {
	service := strings.TrimPrefix(r.URL.Path, "/logs/")
	logStreamer.ServeLogs(w, r, service)
})
```

- [ ] **Step 3: Commit**

```bash
git add ops/agent/logs/ ops/agent/api/
git commit -m "feat(lsa): journald log streaming endpoint"
```

---

### Task 7: Heartbeat reporter

**Files:**
- Create: `ops/agent/reporter/heartbeat.go`
- Modify: `ops/agent/main.go`

- [ ] **Step 1: Write heartbeat reporter**

```go
// reporter/heartbeat.go
package reporter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/ismaelmkumbi/lsa/collector"
	"github.com/ismaelmkumbi/lsa/config"
	"github.com/ismaelmkumbi/lsa/auth"
)

type Reporter struct {
	cfg    *config.Config
	client *http.Client
}

func New(cfg *config.Config) *Reporter {
	return &Reporter{
		cfg:    cfg,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (r *Reporter) Send(ctx context.Context, m *collector.SystemMetrics) error {
	body, err := json.Marshal(map[string]interface{}{
		"server":  r.cfg.ServerName,
		"metrics": m,
		"version": "1.0.0",
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, "POST",
		fmt.Sprintf("%s/api/v1/agents/heartbeat", r.cfg.HubURL),
		bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	auth.Sign(req, r.cfg.HubSecret)
	resp, err := r.client.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("heartbeat rejected: %d", resp.StatusCode)
	}
	return nil
}

func (r *Reporter) Loop(ctx context.Context, interval time.Duration, getMetrics func() (*collector.SystemMetrics, error)) {
	backoff := interval
	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
			m, err := getMetrics()
			if err != nil {
				log.Printf("reporter: metrics error: %v", err)
				continue
			}
			if err := r.Send(ctx, m); err != nil {
				log.Printf("reporter: send error: %v", err)
				backoff = min(backoff*2, 5*time.Minute)
				continue
			}
			backoff = interval
		}
	}
}
```

- [ ] **Step 2: Write HMAC signer**

```go
// auth/hmac.go
package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"
	"strconv"
)

func Sign(req *http.Request, secret string) {
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	payload := req.Method + req.URL.Path + ts
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	sig := hex.EncodeToString(mac.Sum(nil))
	req.Header.Set("X-LSA-Timestamp", ts)
	req.Header.Set("X-LSA-Signature", sig)
}
```

- [ ] **Step 3: Wire reporter into main.go**

Add after the metrics collection goroutine:
```go
rep := reporter.New(cfg)
go rep.Loop(ctx, interval, collector.Snapshot)
```

- [ ] **Step 4: Commit**

```bash
git add ops/agent/reporter/ ops/agent/auth/ ops/agent/main.go
git commit -m "feat(lsa): heartbeat reporter with HMAC signing"
```

---

### Task 8: Install script and systemd unit

**Files:**
- Create: `ops/agent/install/lsa.service`
- Create: `ops/agent/install/install.sh`

- [ ] **Step 1: Write systemd unit file**

```ini
# install/lsa.service
[Unit]
Description=Letis Server Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/lsa --config /etc/lsa/config.yaml
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Write install script**

```bash
#!/usr/bin/env bash
# install/install.sh
set -e

BIN_URL="${LSA_DOWNLOAD_URL:-https://control.letispos.com/bin/lsa-linux-amd64}"
CONFIG_URL="${LSA_CONFIG_URL:-}"

echo "→ Downloading lsa..."
curl -fsSL "$BIN_URL" -o /usr/local/bin/lsa
chmod 755 /usr/local/bin/lsa

if [ -n "$CONFIG_URL" ]; then
  echo "→ Downloading config..."
  mkdir -p /etc/lsa
  curl -fsSL "$CONFIG_URL" -o /etc/lsa/config.yaml
fi

echo "→ Installing systemd service..."
cp /tmp/lsa.service /etc/systemd/system/lsa.service
systemctl daemon-reload
systemctl enable lsa
systemctl start lsa

echo "✓ LSA installed and running"
systemctl status lsa --no-pager
```

- [ ] **Step 3: Commit**

```bash
git add ops/agent/install/
git commit -m "feat(lsa): install script and systemd unit file"
```

---

### Task 9: Integration test and final wiring

- [ ] **Step 1: Run full build**

```bash
cd ops/agent && go build -o lsa . && ./lsa --help && rm lsa
```

Expected: binary builds, help shows flags.

- [ ] **Step 2: Verify all packages compile independently**

```bash
cd ops/agent && go build ./collector/... ./manager/... ./logs/... ./api/... ./reporter/... ./auth/... ./config/...
```

Expected: all succeed.

- [ ] **Step 3: Run vet and staticcheck**

```bash
cd ops/agent && go vet ./...
```

Expected: no issues.

- [ ] **Step 4: Commit any cleanup**

```bash
git add ops/agent/ && git commit -m "chore(lsa): final wiring and cleanup"
```
