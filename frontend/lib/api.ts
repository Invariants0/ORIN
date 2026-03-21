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
