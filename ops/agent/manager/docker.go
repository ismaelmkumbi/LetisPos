package manager

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

type DockerManager struct {
	ComposeDir string
}

func NewDocker(composeDir string) *DockerManager {
	return &DockerManager{ComposeDir: composeDir}
}

type dockerContainer struct {
	ID     string `json:"ID"`
	Names  string `json:"Names"`
	Image  string `json:"Image"`
	State  string `json:"State"`
	Status string `json:"Status"`
	Ports  string `json:"Ports"`
}

type dockerStats struct {
	Name      string `json:"Name"`
	CPUPerc   string `json:"CPUPerc"`
	MemUsage  string `json:"MemUsage"`
}

func (m *DockerManager) List() ([]ServiceInfo, error) {
	cmd := exec.Command("docker", "ps", "--all", "--format", "{{json .}}")
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("docker ps: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	var svcs []ServiceInfo

	for _, line := range lines {
		var c dockerContainer
		if err := json.Unmarshal([]byte(line), &c); err != nil {
			continue
		}
		name := strings.TrimPrefix(c.Names, "/")

		svc := ServiceInfo{
			Name:    name,
			Type:    "docker",
			Status:  normalizeState(c.State),
			Desc:    c.Image + " — " + c.Status,
			Command: c.Image,
		}

		svc.Category = deriveCategory(c.Image, name)
		svc.Port = extractPort(c.Ports)

		svcs = append(svcs, svc)
	}

	// Enrich with per-container stats (docker stats --no-stream)
	enrichWithStats(svcs)

	// Enrich with PID from docker inspect
	enrichWithPID(svcs)

	return svcs, nil
}

func (m *DockerManager) Restart(name string) error {
	cmd := exec.Command("docker", "restart", name)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %s", err, string(out))
	}
	return nil
}

func (m *DockerManager) Stop(name string) error {
	cmd := exec.Command("docker", "stop", name)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %s", err, string(out))
	}
	return nil
}

func (m *DockerManager) Start(name string) error {
	cmd := exec.Command("docker", "start", name)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %s", err, string(out))
	}
	return nil
}

func (m *DockerManager) Close() {}

func normalizeState(state string) string {
	if state == "running" || state == "created" || state == "restarting" {
		return "UP"
	}
	return "DOWN"
}

func deriveCategory(image, name string) string {
	lower := strings.ToLower(image + " " + name)
	switch {
	case containsAny(lower, "gateway", "nginx", "proxy", "traefik", "envoy"):
		return "Core"
	case containsAny(lower, "postgres", "redis", "kafka", "mongo", "mysql", "minio", "database"):
		return "Platform"
	case containsAny(lower, "auth", "user-service", "user"):
		return "Core"
	case containsAny(lower, "product", "catalog", "inventory"):
		return "Catalog"
	case containsAny(lower, "sales", "order", "cart", "checkout"):
		return "Sales"
	case containsAny(lower, "payment", "billing", "invoice"):
		return "Finance"
	case containsAny(lower, "notification", "mail", "email", "sms"):
		return "Platform"
	case containsAny(lower, "report", "analytics", "metrics"):
		return "Insight"
	case containsAny(lower, "ai", "intelligence", "ml", "model"):
		return "Intelligence"
	case containsAny(lower, "hrm", "hr", "people", "employee"):
		return "People"
	case containsAny(lower, "crm", "customer", "client"):
		return "People"
	case containsAny(lower, "document", "pdf", "storage"):
		return "Platform"
	case containsAny(lower, "audit", "log"):
		return "Platform"
	case containsAny(lower, "prometheus", "grafana", "alertmanager", "node-exporter"):
		return "Platform"
	case containsAny(lower, "frontend", "spa", "ui"):
		return "Core"
	default:
		return "Platform"
	}
}

func containsAny(s string, substrs ...string) bool {
	for _, sub := range substrs {
		if strings.Contains(s, sub) {
			return true
		}
	}
	return false
}

func extractPort(ports string) int {
	if ports == "" {
		return 0
	}
	// "0.0.0.0:8080->8080/tcp" or "8080/tcp"
	parts := strings.FieldsFunc(ports, func(r rune) bool { return r == ',' })
	for _, entry := range parts {
		entry = strings.TrimSpace(entry)
		// Try "->" format first: "0.0.0.0:8080->8080/tcp"
		if idx := strings.LastIndex(entry, "->"); idx != -1 {
			right := entry[idx+2:]
			portStr := strings.Split(right, "/")[0]
			if p, err := strconv.Atoi(portStr); err == nil {
				return p
			}
		}
		// Try direct format: "8080/tcp"
		portStr := strings.Split(entry, "/")[0]
		if p, err := strconv.Atoi(portStr); err == nil {
			return p
		}
	}
	return 0
}

func enrichWithStats(svcs []ServiceInfo) {
	cmd := exec.Command("docker", "stats", "--no-stream", "--format", "{{json .}}")
	out, err := cmd.Output()
	if err != nil {
		return
	}
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		var s dockerStats
		if err := json.Unmarshal([]byte(line), &s); err != nil {
			continue
		}
		name := strings.TrimPrefix(s.Name, "/")
		for i := range svcs {
			if svcs[i].Name == name {
				svcs[i].CPUPercent = parseCPUPerc(s.CPUPerc)
				svcs[i].MemUsedBytes = parseMemBytes(s.MemUsage)
				break
			}
		}
	}
}

func parseCPUPerc(v string) float64 {
	v = strings.TrimSuffix(strings.TrimSpace(v), "%")
	f, _ := strconv.ParseFloat(v, 64)
	return f
}

func parseMemBytes(v string) int64 {
	// "12.5MiB / 256MiB" or "12.5MiB"
	v = strings.Split(v, " / ")[0]
	v = strings.TrimSpace(v)

	if strings.HasSuffix(v, "GiB") {
		f, _ := strconv.ParseFloat(strings.TrimSuffix(v, "GiB"), 64)
		return int64(f * 1073741824)
	}
	if strings.HasSuffix(v, "MiB") {
		f, _ := strconv.ParseFloat(strings.TrimSuffix(v, "MiB"), 64)
		return int64(f * 1048576)
	}
	if strings.HasSuffix(v, "KiB") {
		f, _ := strconv.ParseFloat(strings.TrimSuffix(v, "KiB"), 64)
		return int64(f * 1024)
	}
	if strings.HasSuffix(v, "GB") {
		f, _ := strconv.ParseFloat(strings.TrimSuffix(v, "GB"), 64)
		return int64(f * 1000000000)
	}
	if strings.HasSuffix(v, "MB") {
		f, _ := strconv.ParseFloat(strings.TrimSuffix(v, "MB"), 64)
		return int64(f * 1000000)
	}
	if strings.HasSuffix(v, "kB") {
		f, _ := strconv.ParseFloat(strings.TrimSuffix(v, "kB"), 64)
		return int64(f * 1000)
	}
	if strings.HasSuffix(v, "B") {
		f, _ := strconv.ParseFloat(strings.TrimSuffix(v, "B"), 64)
		return int64(f)
	}
	return 0
}

type dockerInspect struct {
	State struct {
		Pid int `json:"Pid"`
	} `json:"State"`
}

func enrichWithPID(svcs []ServiceInfo) {
	names := make([]string, len(svcs))
	for i, s := range svcs {
		names[i] = s.Name
	}
	if len(names) == 0 {
		return
	}
	args := append([]string{"inspect", "--format", "{{json .}}"}, names...)
	cmd := exec.Command("docker", args...)
	out, err := cmd.Output()
	if err != nil {
		return
	}
	for i, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		var insp dockerInspect
		if err := json.Unmarshal([]byte(line), &insp); err != nil {
			continue
		}
		if i < len(svcs) {
			svcs[i].PID = insp.State.Pid
		}
	}
}
