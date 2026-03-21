import { API_URL } from "@/lib/constants";

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

  return response.json();
}

export async function getWorkflowById(id: string) {
  const response = await fetch(`${API_URL}/workflows/${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch workflow");
  }

  return response.json();
}

export async function getWorkflowStatistics() {
  const response = await fetch(`${API_URL}/workflows/statistics`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch statistics");
  }

  return response.json();
}

export async function getWorkflowMetrics() {
  const response = await fetch(`${API_URL}/workflows/metrics`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch metrics");
  }

  return response.json();
}

export async function getAlerts() {
  const response = await fetch(`${API_URL}/workflows/alerts`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch alerts");
  }

  return response.json();
}

export async function clearAlerts() {
  const response = await fetch(`${API_URL}/workflows/alerts`, {
    method: "DELETE",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to clear alerts");
  }

  return response.json();
}

export async function pauseWorkflow(id: string) {
  const response = await fetch(`${API_URL}/workflows/${id}/pause`, {
    method: "POST",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to pause workflow");
  }

  return response.json();
}

export async function resumeWorkflow(id: string) {
  const response = await fetch(`${API_URL}/workflows/${id}/resume`, {
    method: "POST",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to resume workflow");
  }

  return response.json();
}

export async function cancelWorkflow(id: string) {
  const response = await fetch(`${API_URL}/workflows/${id}/cancel`, {
    method: "POST",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to cancel workflow");
  }

  return response.json();
}
