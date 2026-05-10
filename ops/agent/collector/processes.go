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
	out, err := exec.Command("ps", "-eo", "pid,pcpu,rss,args", "--no-headers").Output()
	if err != nil {
		return nil, err
	}

	// Build port→inode mapping from /proc/net/tcp
	portInodes := readPortInodes()

	var procs []ProcessInfo
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 4 || !strings.Contains(fields[3], "java") {
			continue
		}
		pid, _ := strconv.Atoi(fields[0])
		cpu, _ := strconv.ParseFloat(fields[1], 64)
		rssKB, _ := strconv.ParseFloat(fields[2], 64)
		if pid == 0 || rssKB == 0 { continue } // skip zombies

		port := findPortForPID(pid, portInodes)
		if port == 0 {
			// Fallback: try to parse --server.port from cmdline
			port = parsePortFromCmdline(pid)
		}

		name := identifyService(pid, port, fields[3:])
		if name == "" { continue } // skip non-LetisPOS processes

		procs = append(procs, ProcessInfo{
			Name:  name,
			PID:   pid,
			CPUPct: cpu,
			MemMB:  rssKB / 1024,
			Port:  port,
		})
	}
	return procs, nil
}

func readPortInodes() map[int]string {
	result := make(map[int]string)
	for _, f := range []string{"/proc/net/tcp", "/proc/net/tcp6"} {
		data, err := os.ReadFile(f)
		if err != nil { continue }
		for _, line := range strings.Split(string(data), "\n") {
			fields := strings.Fields(line)
			// sl local_address rem_address st(03) ... inode(09)
			if len(fields) < 10 || fields[1] == "local_address" { continue }
			if fields[3] != "0A" { continue } // LISTEN only
			local := fields[1]
			inode := fields[9]
			if idx := strings.LastIndex(local, ":"); idx > 0 {
				portHex := local[idx+1:]
				if p, err := strconv.ParseInt(portHex, 16, 64); err == nil && p > 0 && p < 65536 {
					result[int(p)] = inode
				}
			}
		}
	}
	return result
}

func findPortForPID(pid int, portInodes map[int]string) int {
	fdDir := fmt.Sprintf("/proc/%d/fd", pid)
	entries, err := os.ReadDir(fdDir)
	if err != nil { return 0 }

	for port, inode := range portInodes {
		for _, entry := range entries {
			link, err := os.Readlink(fmt.Sprintf("%s/%s", fdDir, entry.Name()))
			if err != nil { continue }
			if strings.Contains(link, "socket:["+inode+"]") {
				return port
			}
		}
	}
	return 0
}

func parsePortFromCmdline(pid int) int {
	data, err := os.ReadFile(fmt.Sprintf("/proc/%d/cmdline", pid))
	if err != nil { return 0 }
	content := string(data)
	// Look for --server.port=XXXX or -Dserver.port=XXXX
	for _, prefix := range []string{"--server.port=", "-Dserver.port="} {
		if idx := strings.Index(content, prefix); idx >= 0 {
			end := idx + len(prefix)
			for end < len(content) && content[end] >= '0' && content[end] <= '9' {
				end++
			}
			if p, err := strconv.Atoi(content[idx+len(prefix):end]); err == nil && p > 0 {
				return p
			}
		}
	}
	return 0
}

func identifyService(pid int, port int, args []string) string {
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
	// Read cmdline for known LetisPOS service jar names
	data, err := os.ReadFile(fmt.Sprintf("/proc/%d/cmdline", pid))
	if err == nil {
		parts := strings.Split(string(data), "\x00")
		for _, p := range parts {
			base := filepath.Base(p)
			for _, svc := range []string{"gateway", "auth-service", "user-service", "product-service",
				"inventory-service", "sales-service", "payment-service", "report-service",
				"notification-service", "hrm-service", "ai-service", "integration-service", "control-hub"} {
				if strings.Contains(base, svc) {
					return svc
				}
			}
		}
	}
	return ""
}
