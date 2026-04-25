package observability

import (
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type WorkerMetrics struct {
	concurrencyCapacity *prometheus.GaugeVec
	concurrencyInUse    prometheus.Gauge
	dlqDepth            prometheus.Gauge
	jobOutcomes         *prometheus.CounterVec
	processingDuration  *prometheus.HistogramVec
	queueDepth          prometheus.Gauge
	registry            *prometheus.Registry
	retriesTotal        prometheus.Counter
}

func NewWorkerMetrics(namespace string) (*WorkerMetrics, error) {
	metrics := &WorkerMetrics{
		concurrencyCapacity: prometheus.NewGaugeVec(
			prometheus.GaugeOpts{
				Namespace: namespace,
				Name:      "concurrency_capacity",
				Help:      "Configured worker concurrency capacity.",
			},
			[]string{"queue"},
		),
		concurrencyInUse: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Namespace: namespace,
				Name:      "concurrency_in_use",
				Help:      "Number of worker slots currently processing jobs.",
			},
		),
		dlqDepth: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Namespace: namespace,
				Name:      "dlq_depth",
				Help:      "Current number of entries in the Redis dead-letter queue.",
			},
		),
		jobOutcomes: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "job_outcomes_total",
				Help:      "Count of terminal job outcomes.",
			},
			[]string{"status"},
		),
		processingDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: namespace,
				Name:      "job_processing_duration_seconds",
				Help:      "End-to-end job processing time by outcome.",
				Buckets:   prometheus.DefBuckets,
			},
			[]string{"outcome"},
		),
		queueDepth: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Namespace: namespace,
				Name:      "queue_depth",
				Help:      "Current number of entries in the Redis job queue.",
			},
		),
		registry: newRegistry(),
		retriesTotal: prometheus.NewCounter(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "job_retries_total",
				Help:      "Count of job attempts requeued for retry.",
			},
		),
	}

	if err := metrics.registry.Register(metrics.queueDepth); err != nil {
		return nil, err
	}

	if err := metrics.registry.Register(metrics.dlqDepth); err != nil {
		return nil, err
	}

	if err := metrics.registry.Register(metrics.jobOutcomes); err != nil {
		return nil, err
	}

	if err := metrics.registry.Register(metrics.processingDuration); err != nil {
		return nil, err
	}

	if err := metrics.registry.Register(metrics.retriesTotal); err != nil {
		return nil, err
	}

	if err := metrics.registry.Register(metrics.concurrencyInUse); err != nil {
		return nil, err
	}

	if err := metrics.registry.Register(metrics.concurrencyCapacity); err != nil {
		return nil, err
	}

	return metrics, nil
}

func (m *WorkerMetrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{})
}

func (m *WorkerMetrics) SetQueueDepth(depth int64) {
	m.queueDepth.Set(float64(depth))
}

func (m *WorkerMetrics) SetDLQDepth(depth int64) {
	m.dlqDepth.Set(float64(depth))
}

func (m *WorkerMetrics) IncJobOutcome(status string) {
	m.jobOutcomes.WithLabelValues(status).Inc()
}

func (m *WorkerMetrics) ObserveProcessingDuration(outcome string, duration time.Duration) {
	m.processingDuration.WithLabelValues(outcome).Observe(duration.Seconds())
}

func (m *WorkerMetrics) IncRetry() {
	m.retriesTotal.Inc()
}

func (m *WorkerMetrics) SetConcurrencyCapacity(queue string, capacity int) {
	m.concurrencyCapacity.WithLabelValues(queue).Set(float64(capacity))
}

func (m *WorkerMetrics) SetConcurrencyInUse(inUse int64) {
	m.concurrencyInUse.Set(float64(inUse))
}
