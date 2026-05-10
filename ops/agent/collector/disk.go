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
