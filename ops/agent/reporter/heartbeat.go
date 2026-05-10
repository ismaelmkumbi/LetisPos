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
	body, err := json.Marshal(map[string]interface{}{
		"server":  r.cfg.ServerName,
		"metrics": m,
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
