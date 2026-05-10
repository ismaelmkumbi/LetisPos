package collector

import "time"

type SystemMetrics struct {
	Timestamp time.Time      `json:"timestamp"`
	CPU       CPUMetrics     `json:"cpu"`
	Memory    MemoryMetrics  `json:"memory"`
	Disk      DiskMetrics    `json:"disk"`
	Network   NetworkMetrics `json:"network"`
	Uptime    uint64         `json:"uptime_seconds"`
	LoadAvg   LoadAvg        `json:"load_avg"`
}

type CPUMetrics struct {
	PercentUsed float64   `json:"percent_used"`
	PerCPU      []float64 `json:"per_cpu"`
	Count       int       `json:"count"`
}

type MemoryMetrics struct {
	Total     uint64  `json:"total_bytes"`
	Used      uint64  `json:"used_bytes"`
	Available uint64  `json:"available_bytes"`
	SwapTotal uint64  `json:"swap_total_bytes"`
	SwapUsed  uint64  `json:"swap_used_bytes"`
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
	Name      string `json:"name"`
	RxBytes   uint64 `json:"rx_bytes"`
	TxBytes   uint64 `json:"tx_bytes"`
	RxPackets uint64 `json:"rx_packets"`
	TxPackets uint64 `json:"tx_packets"`
}

type LoadAvg struct {
	Load1  float64 `json:"load1"`
	Load5  float64 `json:"load5"`
	Load15 float64 `json:"load15"`
}
