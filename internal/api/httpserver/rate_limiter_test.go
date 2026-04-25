package httpserver

import (
	"io"
	"log/slog"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/carousell/swiftbatch/internal/config"
	"golang.org/x/time/rate"
)

func TestRequestClientIPPrefersForwardedHeaders(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest("POST", "/v1/jobs", nil)
	request.RemoteAddr = "10.0.0.8:12345"
	request.Header.Set("X-Forwarded-For", "203.0.113.7, 10.0.0.8")
	request.Header.Set("X-Real-IP", "198.51.100.9")

	if got, want := requestClientIP(request), "203.0.113.7"; got != want {
		t.Fatalf("requestClientIP() = %q, want %q", got, want)
	}
}

func TestRateLimiterBlocksSecondBurstlessRequest(t *testing.T) {
	t.Parallel()

	limiter := newRateLimiter(
		slog.New(slog.NewTextHandler(io.Discard, nil)),
		config.HTTPRateLimitConfig{
			Enabled:   true,
			ClientTTL: time.Minute,
		},
	)

	if allowed, _ := limiter.allow("203.0.113.7", "jobs_create", rate.Limit(1), 1); !allowed {
		t.Fatalf("first request should be allowed")
	}

	if allowed, retryAfter := limiter.allow("203.0.113.7", "jobs_create", rate.Limit(1), 1); allowed {
		t.Fatalf("second request should be rate limited")
	} else if retryAfter <= 0 {
		t.Fatalf("retryAfter = %v, want > 0", retryAfter)
	}
}
