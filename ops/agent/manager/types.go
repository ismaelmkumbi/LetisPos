package manager

type ServiceInfo struct {
	Name        string  `json:"name"`
	Type        string  `json:"type"`
	Status      string  `json:"status"`
	Desc        string  `json:"description"`
	Category    string  `json:"category,omitempty"`
	Port        int     `json:"port,omitempty"`
	CPUPercent  float64 `json:"cpuPercent,omitempty"`
	MemUsedBytes int64  `json:"memUsedBytes,omitempty"`
	PID         int     `json:"pid,omitempty"`
	Command     string  `json:"command,omitempty"`
}

type ServiceManager interface {
	List() ([]ServiceInfo, error)
	Restart(name string) error
	Stop(name string) error
	Start(name string) error
	Close()
}
