package manager

type ServiceInfo struct {
	Name   string `json:"name"`
	Type   string `json:"type"`
	Status string `json:"status"`
	Desc   string `json:"description"`
}
