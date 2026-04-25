package observability

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type Metrics struct {
	registry        *prometheus.Registry
	httpRequests    *prometheus.CounterVec
	httpDurationSec *prometheus.HistogramVec
}

func NewMetrics(namespace string) (*Metrics, error) {
	metrics := &Metrics{
		registry: newRegistry(),
		httpRequests: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "http_requests_total",
				Help:      "Count of HTTP requests served by route and status code.",
			},
			[]string{"method", "route", "status"},
		),
		httpDurationSec: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: namespace,
				Name:      "http_request_duration_seconds",
				Help:      "HTTP request latency by route.",
				Buckets:   prometheus.DefBuckets,
			},
			[]string{"method", "route"},
		),
	}

	if err := metrics.registry.Register(metrics.httpRequests); err != nil {
		return nil, err
	}

	if err := metrics.registry.Register(metrics.httpDurationSec); err != nil {
		return nil, err
	}

	return metrics, nil
}

func newRegistry() *prometheus.Registry {
	registry := prometheus.NewRegistry()
	registry.MustRegister(
		prometheus.NewGoCollector(),
		prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}),
	)

	return registry
}

func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{})
}

func (m *Metrics) Instrument(route string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		startedAt := time.Now()
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(recorder, r)

		status := strconv.Itoa(recorder.status)
		m.httpRequests.WithLabelValues(r.Method, route, status).Inc()
		m.httpDurationSec.WithLabelValues(r.Method, route).Observe(time.Since(startedAt).Seconds())
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(statusCode int) {
	r.status = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}
