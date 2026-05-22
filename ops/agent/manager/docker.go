package manager

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

type DockerManager struct {
	ComposeDir string // path to docker-compose.yml directory
}

func NewDocker(composeDir string) *DockerManager {
	return &DockerManager{ComposeDir: composeDir}
}

type dockerContainer struct {
	Names  string `json:"Names"`
	Image  string `json:"Image"`
	State  string `json:"State"`
	Status string `json:"Status"`
}

func (m *DockerManager) List() ([]ServiceInfo, error) {
	cmd := exec.Command("docker", "ps", "--all", "--format", "{{json .}}")
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("docker ps: %w", err)
	}

	var svcs []ServiceInfo
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		var c dockerContainer
		if err := json.Unmarshal([]byte(line), &c); err != nil {
			continue
		}
		// Remove leading slash from container name
		name := strings.TrimPrefix(c.Names, "/")
		svcs = append(svcs, ServiceInfo{
			Name:   name,
			Type:   "docker",
			Status: c.State,
			Desc:   c.Image + " — " + c.Status,
		})
	}
	return svcs, nil
}

func (m *DockerManager) Restart(name string) error {
	cmd := exec.Command("docker", "restart", name)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %s", err, string(out))
	}
	return nil
}

func (m *DockerManager) Stop(name string) error {
	cmd := exec.Command("docker", "stop", name)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %s", err, string(out))
	}
	return nil
}

func (m *DockerManager) Start(name string) error {
	cmd := exec.Command("docker", "start", name)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %s", err, string(out))
	}
	return nil
}

func (m *DockerManager) Close() {}
