package collector

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

type ProcessInfo struct {
	Name  string  `json:"name"`
	PID   int     `json:"pid"`
	CPUPct float64 `json:"cpu_pct"`
	MemMB  float64 `json:"mem_mb"`
	Port  int     `json:"port"`
}

func CollectProcesses() ([]ProcessInfo, error) {
	// Find Java processes with their listening ports
	// Use ps to get PID, CPU%, RSS for java processes
	out, err := exec.Command("ps", "-eo", "pid,pcpu,rss,comm", "--no-headers").Output()
	if err != nil {
		return nil, err
	}

	var procs []ProcessInfo
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 4 || fields[3] != "java" {
			continue
		}
		pid, _ := strconv.Atoi(fields[0])
		cpu, _ := strconv.ParseFloat(fields[1], 64)
		rssKB, _ := strconv.ParseFloat(fields[2], 64)

		if pid == 0 { continue }

		// Find listening port for this PID
		port := findPort(pid)

		// Identify service name from /proc cmdline
		name := identifyService(pid, port)

		procs = append(procs, ProcessInfo{
			Name:   name,
			PID:    pid,
			CPUPct: cpu,
			MemMB:  rssKB / 1024,
			Port:   port,
		})
	}
	return procs, nil
}

func findPort(pid int) int {
	out, err := exec.Command("ss", "-tlnp").Output()
	if err != nil {
		return 0
	}
	needle := fmt.Sprintf("pid=%d", pid)
	for _, line := range strings.Split(string(out), "\n") {
		if strings.Contains(line, needle) {
			// Parse port from address like *:8080 or 127.0.0.1:8080
			fields := strings.Fields(line)
			for _, f := range fields {
				if idx := strings.LastIndex(f, ":"); idx > 0 {
					portStr := f[idx+1:]
					if p, err := strconv.Atoi(portStr); err == nil && p > 0 && p < 65536 {
						return p
					}
				}
			}
		}
	}
	return 0
}

func identifyService(pid int, port int) string {
	// Known port → service name mapping
	portNames := map[int]string{
		8080: "gateway", 8081: "auth-service", 8082: "user-service",
		8083: "product-service", 8084: "inventory-service", 8085: "sales-service",
		8086: "payment-service", 8087: "report-service", 8089: "notification-service",
		8090: "hrm-service", 8091: "ai-service", 8092: "integration-service",
		8100: "control-hub",
	}
	if name, ok := portNames[port]; ok {
		return name
	}
	// Fallback: read /proc/[pid]/cmdline
	data, err := os.ReadFile(fmt.Sprintf("/proc/%d/cmdline", pid))
	if err == nil {
		parts := strings.Split(string(data), "\x00")
		for _, p := range parts {
			if strings.Contains(p, "smartpos") || strings.Contains(p, "gateway") || strings.Contains(p, "service") {
				return filepath.Base(p)
			}
		}
	}
	return fmt.Sprintf("java-%d", pid)
}
