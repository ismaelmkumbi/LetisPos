package reporter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/ismaelmkumbi/lsa/auth"
	"github.com/ismaelmkumbi/lsa/collector"
	"github.com/ismaelmkumbi/lsa/config"
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
	metrics := map[string]interface{}{
		"cpu_percent":     m.CPU.PercentUsed,
		"mem_used_bytes":  m.Memory.Used,
		"mem_total_bytes": m.Memory.Total,
		"load1":           m.LoadAvg.Load1,
		"load5":           m.LoadAvg.Load5,
		"load15":          m.LoadAvg.Load15,
	}
	// Aggregate disk
	var diskUsed, diskTotal uint64
	for _, d := range m.Disk.Mounts {
		diskUsed += d.UsedBytes
		diskTotal += d.TotalBytes
	}
	metrics["disk_used_bytes"] = diskUsed
	metrics["disk_total_bytes"] = diskTotal
	// Aggregate network
	var rxBytes, txBytes uint64
	for _, n := range m.Network.Interfaces {
		rxBytes += n.RxBytes
		txBytes += n.TxBytes
	}
	metrics["net_rx_bytes"] = rxBytes
	metrics["net_tx_bytes"] = txBytes

	body, err := json.Marshal(map[string]interface{}{
		"server":  r.cfg.ServerName,
		"metrics": metrics,
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
