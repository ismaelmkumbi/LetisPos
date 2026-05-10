package collector

import (
	"fmt"
	"os"
)

func loadAvg() (LoadAvg, error) {
	data, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return LoadAvg{}, err
	}
	var l LoadAvg
	fmt.Sscanf(string(data), "%f %f %f", &l.Load1, &l.Load5, &l.Load15)
	return l, nil
}
