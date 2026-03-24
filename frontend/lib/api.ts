import { API_URL } from "@/lib/constants";

function unwrapApiData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

export async function storeContent(input: string) {
  const response = await fetch(`${API_URL}/store`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to store content");
  }

  return response.json();
}

export async function retrieveContext(query: string) {
  const response = await fetch(`${API_URL}/retrieve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to retrieve context");
  }

  return response.json();
}

export async function generateDocument(topic: string, context?: string) {
  const response = await fetch(`${API_URL}/generate-doc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ topic, context }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to generate document");
  }

  return response.json();
}

// Workflow APIs
export async function getWorkflows() {
  const response = await fetch(`${API_URL}/workflows`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch workflows");
  }

  const payload = await response.json();
  const data = unwrapApiData<unknown>(payload);
  return Array.isArray(data) ? data : [];
}

export async function getWorkflowById(id: string) {
  const response = await fetch(`${API_URL}/workflows/${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch workflow");
  }

  const payload = await response.json();
  return unwrapApiData(payload);
}

export async function getWorkflowStatistics() {
  const response = await fetch(`${API_URL}/workflows/statistics`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch statistics");
  }

  const payload = await response.json();
  return unwrapApiData(payload);
}

export async function getWorkflowMetrics() {
  const response = await fetch(`${API_URL}/workflows/metrics`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch metrics");
  }

  const payload = await response.json();
  return unwrapApiData(payload);
}

export async function getAlerts() {
  const response = await fetch(`${API_URL}/workflows/alerts`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch alerts");
  }

  const payload = await response.json();
  return unwrapApiData(payload);
}

export async function clearAlerts() {
  const response = await fetch(`${API_URL}/workflows/alerts`, {
    method: "DELETE",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to clear alerts");
  }

  const payload = await response.json();
  return unwrapApiData(payload);
}

export async function pauseWorkflow(id: string) {
  const response = await fetch(`${API_URL}/workflows/${id}/pause`, {
    method: "POST",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to pause workflow");
  }

  const payload = await response.json();
  return unwrapApiData(payload);
}

export async function resumeWorkflow(id: string) {
  const response = await fetch(`${API_URL}/workflows/${id}/resume`, {
    method: "POST",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to resume workflow");
  }

  const payload = await response.json();
  return unwrapApiData(payload);
}

export async function cancelWorkflow(id: string) {
  const response = await fetch(`${API_URL}/workflows/${id}/cancel`, {
    method: "POST",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to cancel workflow");
  }

  const payload = await response.json();
  return unwrapApiData(payload);
}
