package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/ismaelmkumbi/lsa/manager"
)

type ServicesHandler struct {
	Mgr manager.ServiceManager
}

func (h *ServicesHandler) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	svcs, err := h.Mgr.List()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(svcs)
}

func (h *ServicesHandler) Action(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/services/"), "/")
	if len(parts) != 2 {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}
	name, action := parts[0], parts[1]
	var err error
	switch action {
	case "restart":
		err = h.Mgr.Restart(name)
	case "stop":
		err = h.Mgr.Stop(name)
	case "start":
		err = h.Mgr.Start(name)
	default:
		http.Error(w, "unknown action", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
