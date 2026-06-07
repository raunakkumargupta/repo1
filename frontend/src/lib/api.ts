// Helper to fetch data from the Go API.
// Note: In Next.js CSR, using standard fetch includes credentials (cookies) implicitly for same-origin if configured,
// but since the Go API is at localhost:8080 and Next.js is at localhost:3000, we must specify credentials: 'include'.

const API_BASE = "http://localhost:8080/api";

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    // Allows sending the cookie (set by our Next.js proxy) to the Go backend if CORS allows it
    credentials: "include", 
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...defaultOptions,
    ...options,
  });

  if (!response.ok) {
    let errorMessage = "API request failed";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (like 204 No Content or empty 200 OK)
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}
