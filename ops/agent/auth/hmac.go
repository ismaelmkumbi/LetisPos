package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strconv"
	"time"
)

func Sign(req *http.Request, secret string) {
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	payload := req.Method + req.URL.Path + ts
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	sig := hex.EncodeToString(mac.Sum(nil))
	req.Header.Set("X-LSA-Timestamp", ts)
	req.Header.Set("X-LSA-Signature", sig)
}
