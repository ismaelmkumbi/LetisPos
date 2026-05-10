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
