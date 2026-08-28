// Canonical AB-test Telegram views facade.
export { resolveFirstName, splitTelegramLines, splitTelegramContentBlocks, packTelegramContentBlocks, formatAbTestTelegramLine, formatAbTestTelegramCard, renderTelegramContentMessage, resolveTelegramContentPhotoUrl } from './view-formatting.js'
export { sendTelegramContentChunk } from './view-delivery.js'
export { dispatchAbTestResultSequence } from './view-result.js'
export { buildResultSnapshotPayload, sendResultSnapshot } from './view-snapshot.js'
export { dispatchAbTestPracticeSequence } from './view-practice.js'
export { renderAbTestResultThenOffer, renderAbTestPostEmailSubmitSequence } from './view-post-result.js'
export { sendLogMessage, sendActionMessage, renderAbTestEmailGate, renderCurrentView, sendQuestionDirect } from './view-questions.js'
