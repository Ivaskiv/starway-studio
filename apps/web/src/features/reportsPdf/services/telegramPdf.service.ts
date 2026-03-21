export const sendTelegramPdf = async (
  chatId: string,
  pdf: Blob
) => {
  const formData = new FormData()

  formData.append("chat_id", chatId)
  formData.append("document", pdf, "mentor-report.pdf")

  await fetch("/api/telegram/sendDocument", {
    method: "POST",
    body: formData,
  })
}
