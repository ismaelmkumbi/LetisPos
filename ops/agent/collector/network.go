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
