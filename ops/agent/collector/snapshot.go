package collector

import (
	"fmt"
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
