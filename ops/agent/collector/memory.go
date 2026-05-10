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
