package logs

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"strconv"
)

type Streamer struct{}

func New() *Streamer {
	return &Streamer{}
}

func (s *Streamer) StreamJournal(service string, tail int, filter string, grep bool) (io.ReadCloser, error) {
	var args []string
	if grep {
		args = []string{"--grep=" + service, "--no-pager", "-n", strconv.Itoa(tail), "-o", "short-iso"}
	} else {
		args = []string{"-u", service, "--no-pager", "-n", strconv.Itoa(tail), "-o", "short-iso"}
	}
	if filter != "" {
		args = append(args, "-g", filter)
	}
	cmd := exec.Command("journalctl", args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	return &cmdReadCloser{cmd: cmd, ReadCloser: stdout}, nil
}

type cmdReadCloser struct {
	cmd *exec.Cmd
	io.ReadCloser
}

func (c *cmdReadCloser) Close() error {
	c.cmd.Process.Kill()
	c.cmd.Wait()
	return c.ReadCloser.Close()
}

func (s *Streamer) ServeLogs(w http.ResponseWriter, r *http.Request, service string) {
	tail, _ := strconv.Atoi(r.URL.Query().Get("tail"))
	if tail == 0 {
		tail = 100
	}
	filter := r.URL.Query().Get("filter")
	grep := r.URL.Query().Get("grep") == "1"

	rc, err := s.StreamJournal(service, tail, filter, grep)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rc.Close()

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	scanner := bufio.NewScanner(rc)
	for scanner.Scan() {
		fmt.Fprintln(w, scanner.Text())
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
	}
}
