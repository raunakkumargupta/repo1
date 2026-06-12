package worker

import (
	"context"
	"fmt"
	"log"
	"os"
	"sync"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

// ─── Job Types ────────────────────────────────────────────────────────────────

type Job struct {
	Type    string
	Payload interface{}
}

type FcmJobPayload struct {
	Tokens []string `json:"tokens"`
	Title  string   `json:"title"`
	Body   string   `json:"body"`
}

// ─── Worker Pool ──────────────────────────────────────────────────────────────

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
		log.Printf("[Worker %d] Processing Job Type: %s", id, job.Type)

		switch job.Type {
		case "AUDIT_LOG":
			log.Printf("[Worker %d] Saved Audit Log: %v\n", id, job.Payload)

		case "FCM_NOTIFICATION":
			if payload, ok := job.Payload.(FcmJobPayload); ok {
				log.Printf("[Worker %d] Sending FCM notification to %d tokens: Title='%s', Body='%s'",
					id, len(payload.Tokens), payload.Title, payload.Body)
				sendFcmMessages(payload.Tokens, payload.Title, payload.Body)
			} else {
				log.Printf("[Worker %d] FCM payload type assertion failed: %v\n", id, job.Payload)
			}

		default:
			log.Printf("[Worker %d] Unknown Job Type: %s\n", id, job.Type)
		}
	}
}

// ─── Firebase Admin SDK FCM Sender ───────────────────────────────────────────

// initFirebase creates a Firebase app using the service account JSON.
func initFirebase(ctx context.Context) (*firebase.App, error) {
	saPath := os.Getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
	if saPath == "" {
		saPath = "/app/firebase-service-account.json"
	}

	opt := option.WithCredentialsFile(saPath)
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		return nil, fmt.Errorf("error initializing Firebase app: %v", err)
	}
	return app, nil
}

// sendFcmMessages sends push notifications via Firebase Admin SDK (FCM V1 API).
// It uses MulticastMessage to send to up to 500 tokens in one request.
func sendFcmMessages(tokens []string, title, body string) {
	if len(tokens) == 0 {
		log.Println("FCM: No tokens to notify")
		return
	}

	ctx := context.Background()

	app, err := initFirebase(ctx)
	if err != nil {
		log.Printf("FCM: Firebase init failed: %v", err)
		return
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		log.Printf("FCM: Messaging client failed: %v", err)
		return
	}

	// FCM supports up to 500 tokens per multicast — chunk if needed
	const batchSize = 500
	for i := 0; i < len(tokens); i += batchSize {
		end := i + batchSize
		if end > len(tokens) {
			end = len(tokens)
		}
		batch := tokens[i:end]

		msg := &messaging.MulticastMessage{
			Tokens: batch,
			Notification: &messaging.Notification{
				Title: title,
				Body:  body,
			},
			Data: map[string]string{
				"title": title,
				"body":  body,
			},
			// Android-specific config
			Android: &messaging.AndroidConfig{
				Priority: "high",
				Notification: &messaging.AndroidNotification{
					Title:       title,
					Body:        body,
					ClickAction: "FLUTTER_NOTIFICATION_CLICK",
					Sound:       "default",
				},
			},
			// APNs (iOS) config
			APNS: &messaging.APNSConfig{
				Headers: map[string]string{
					"apns-priority": "10",
				},
				Payload: &messaging.APNSPayload{
					Aps: &messaging.Aps{
						Alert: &messaging.ApsAlert{
							Title: title,
							Body:  body,
						},
						Sound: "default",
						Badge: intPtr(1),
					},
				},
			},
		}

		br, err := client.SendEachForMulticast(ctx, msg)
		if err != nil {
			log.Printf("FCM: SendEachForMulticast error: %v", err)
			continue
		}

		log.Printf("FCM: Batch sent — success: %d, failure: %d (out of %d)",
			br.SuccessCount, br.FailureCount, len(batch))

		// Log failures for debugging
		for j, r := range br.Responses {
			if !r.Success {
				log.Printf("FCM: Token[%d] failed: %v", i+j, r.Error)
			}
		}
	}
}

func intPtr(i int) *int {
	return &i
}
