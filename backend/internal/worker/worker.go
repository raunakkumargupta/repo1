package worker

import (
	"log"
	"sync"
)

type Job struct {
	Type    string
	Payload interface{}
}

type WorkerPool struct {
	jobs    chan Job
	wg      sync.WaitGroup
	workers int
}

func NewWorkerPool(numWorkers int, queueSize int) *WorkerPool {
	return &WorkerPool{
		jobs:    make(chan Job, queueSize),
		workers: numWorkers,
	}
}

func (wp *WorkerPool) Start() {
	for i := 0; i < wp.workers; i++ {
		wp.wg.Add(1)
		go wp.worker(i)
	}
	log.Printf("Started Worker Pool with %d workers\n", wp.workers)
}

func (wp *WorkerPool) Stop() {
	close(wp.jobs)
	wp.wg.Wait()
	log.Println("Worker Pool stopped cleanly")
}

func (wp *WorkerPool) Enqueue(j Job) {
	wp.jobs <- j
}

func (wp *WorkerPool) worker(id int) {
	defer wp.wg.Done()
	for job := range wp.jobs {
		// This simulates heavy lifting like sending FCM pushes, writing audit logs, etc.
		log.Printf("[Worker %d] Processing Job Type: %s", id, job.Type)
		
		switch job.Type {
		case "AUDIT_LOG":
			// write to elasticsearch/postgres asynchronously
			log.Printf("[Worker %d] Saved Audit Log: %v\n", id, job.Payload)
		case "FCM_NOTIFICATION":
			// send push notification asynchronously
			log.Printf("[Worker %d] Sent FCM Notification: %v\n", id, job.Payload)
		default:
			log.Printf("[Worker %d] Unknown Job Type: %s\n", id, job.Type)
		}
	}
}
