package manager

import (
	"context"

	"github.com/coreos/go-systemd/v22/dbus"
)

type SystemdManager struct {
	conn *dbus.Conn
}

func NewSystemd() (*SystemdManager, error) {
	conn, err := dbus.NewWithContext(context.Background())
	if err != nil {
		return nil, err
	}
	return &SystemdManager{conn: conn}, nil
}

func (m *SystemdManager) List() ([]ServiceInfo, error) {
	units, err := m.conn.ListUnitsContext(context.Background())
	if err != nil {
		return nil, err
	}
	var svcs []ServiceInfo
	for _, u := range units {
		svcs = append(svcs, ServiceInfo{
			Name:   u.Name,
			Type:   "systemd",
			Status: u.ActiveState,
			Desc:   u.Description,
		})
	}
	return svcs, nil
}

func (m *SystemdManager) Restart(name string) error {
	ch := make(chan string)
	_, err := m.conn.RestartUnitContext(context.Background(), name, "replace", ch)
	if err != nil {
		return err
	}
	<-ch
	return nil
}

func (m *SystemdManager) Stop(name string) error {
	ch := make(chan string)
	_, err := m.conn.StopUnitContext(context.Background(), name, "replace", ch)
	if err != nil {
		return err
	}
	<-ch
	return nil
}

func (m *SystemdManager) Start(name string) error {
	ch := make(chan string)
	_, err := m.conn.StartUnitContext(context.Background(), name, "replace", ch)
	if err != nil {
		return err
	}
	<-ch
	return nil
}

func (m *SystemdManager) Close() {
	m.conn.Close()
}
