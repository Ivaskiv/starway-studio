import api from "@/shared/api"

export async function getAssistantState() {
  const { data } = await api.get("/assistant/state")
  return data
}

export async function sendAssistantMessage(message: string) {
  const { data } = await api.post("/assistant/chat", { message })
  return data
}
