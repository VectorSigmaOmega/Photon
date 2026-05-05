package httpserver

import (
	"log/slog"
	"math"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/VectorSigmaOmega/photon/internal/config"
	"golang.org/x/time/rate"
)

type rateLimiter struct {
	clientTTL   time.Duration
	enabled     bool
	lastCleanup time.Time
	limiters    map[string]*clientRateLimiters
	log         *slog.Logger
	mu          sync.Mutex
}

type clientRateLimiters struct {
	lastSeen time.Time
	routes   map[string]*rate.Limiter
}

func newRateLimiter(log *slog.Logger, cfg config.HTTPRateLimitConfig) *rateLimiter {
	return &rateLimiter{
		clientTTL: cfg.ClientTTL,
		enabled:   cfg.Enabled,
		limiters:  make(map[string]*clientRateLimiters),
		log:       log,
	}
}

func (l *rateLimiter) wrap(route string, requestsPerMinute, burst int, next http.Handler) http.Handler {
	if !l.enabled || requestsPerMinute <= 0 || burst <= 0 {
		return next
	}

	limit := rate.Limit(float64(requestsPerMinute) / 60.0)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientIP := requestClientIP(r)
		allowed, retryAfter := l.allow(clientIP, route, limit, burst)
		if !allowed {
			retryAfterSeconds := max(1, int(math.Ceil(retryAfter.Seconds())))
			w.Header().Set("Retry-After", strconv.Itoa(retryAfterSeconds))

			l.log.Warn(
				"rate limit exceeded",
				"client_ip", clientIP,
				"route", route,
				"retry_after_seconds", retryAfterSeconds,
			)

			writeJSON(w, http.StatusTooManyRequests, map[string]any{
				"error":               "rate limit exceeded",
				"retry_after_seconds": retryAfterSeconds,
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (l *rateLimiter) allow(clientIP, route string, limit rate.Limit, burst int) (bool, time.Duration) {
	now := time.Now()

	l.mu.Lock()
	defer l.mu.Unlock()

	l.cleanup(now)

	client, ok := l.limiters[clientIP]
	if !ok {
		client = &clientRateLimiters{
			lastSeen: now,
			routes:   make(map[string]*rate.Limiter),
		}
		l.limiters[clientIP] = client
	}

	client.lastSeen = now

	limiter, ok := client.routes[route]
	if !ok {
		limiter = rate.NewLimiter(limit, burst)
		client.routes[route] = limiter
	}

	if limiter.AllowN(now, 1) {
		return true, 0
	}

	reservation := limiter.ReserveN(now, 1)
	if !reservation.OK() {
		return false, time.Minute
	}
	retryAfter := reservation.DelayFrom(now)
	reservation.CancelAt(now)

	return false, retryAfter
}

func (l *rateLimiter) cleanup(now time.Time) {
	if !l.lastCleanup.IsZero() && now.Sub(l.lastCleanup) < time.Minute {
		return
	}

	for clientIP, client := range l.limiters {
		if now.Sub(client.lastSeen) > l.clientTTL {
			delete(l.limiters, clientIP)
		}
	}

	l.lastCleanup = now
}

func requestClientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		first := strings.TrimSpace(strings.Split(forwarded, ",")[0])
		if ip := parseIP(first); ip != "" {
			return ip
		}
	}

	if realIP := parseIP(strings.TrimSpace(r.Header.Get("X-Real-IP"))); realIP != "" {
		return realIP
	}

	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil {
		if ip := parseIP(host); ip != "" {
			return ip
		}
	}

	if ip := parseIP(strings.TrimSpace(r.RemoteAddr)); ip != "" {
		return ip
	}

	return "unknown"
}

func parseIP(value string) string {
	ip := net.ParseIP(strings.TrimSpace(value))
	if ip == nil {
		return ""
	}

	return ip.String()
}
