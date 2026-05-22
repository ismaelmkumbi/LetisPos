package manager

type ServiceInfo struct {
	Name   string `json:"name"`
	Type   string `json:"type"`
	Status string `json:"status"`
	Desc   string `json:"description"`
}

type ServiceManager interface {
	List() ([]ServiceInfo, error)
	Restart(name string) error
	Stop(name string) error
	Start(name string) error
	Close()
}
