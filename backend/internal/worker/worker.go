package worker

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
)

type Job struct {
	Type    string
	Payload interface{}
}

type FcmJobPayload struct {
	Tokens []string `json:"tokens"`
	Title  string   `json:"title"`
	Body   string   `json:"body"`
}

type fcmMessage struct {
	RegistrationIDs []string            `json:"registration_ids"`
	Notification    fcmNotification     `json:"notification"`
	Data            map[string]string   `json:"data"`
}

type fcmNotification struct {
	Title string `json:"title"`
	Body  string `json:"body"`
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
			if payload, ok := job.Payload.(FcmJobPayload); ok {
				log.Printf("[Worker %d] Sending real FCM notification to %d tokens: Title='%s', Body='%s'", id, len(payload.Tokens), payload.Title, payload.Body)
				sendFcmMessage(payload.Tokens, payload.Title, payload.Body)
			} else {
				log.Printf("[Worker %d] Sent FCM Notification (simulated): %v\n", id, job.Payload)
			}
		default:
			log.Printf("[Worker %d] Unknown Job Type: %s\n", id, job.Type)
		}
	}
}

func sendFcmMessage(tokens []string, title, body string) {
	if len(tokens) == 0 {
		log.Println("No target FCM tokens to send notification to")
		return
	}

	apiKey := os.Getenv("FCM_SERVER_KEY")
	if apiKey == "" {
		apiKey = "AIzaSyCiJOCdTY4njEm4UYN_xGXlvapVGaxKxJc"
	}

	payload := fcmMessage{
		RegistrationIDs: tokens,
		Notification: fcmNotification{
			Title: title,
			Body:  body,
		},
		Data: map[string]string{
			"title": title,
			"body":  body,
		},
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Failed to marshal FCM payload: %v", err)
		return
	}

	req, err := http.NewRequest("POST", "https://fcm.googleapis.com/fcm/send", bytes.NewBuffer(bodyBytes))
	if err != nil {
		log.Printf("Failed to create FCM request: %v", err)
		return
	}

	req.Header.Set("Authorization", "key="+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Failed to send FCM request: %v", err)
		return
	}
	defer resp.Body.Close()

	log.Printf("FCM HTTP API response status: %s", resp.Status)
}

