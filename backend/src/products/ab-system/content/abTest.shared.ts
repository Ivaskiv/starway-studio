export const AB_TEST_NEONILA_REVIEW_HEADER = 'Неоніла написала після практики:'
export const AB_TEST_VALENTYNA_REVIEW_HEADER = 'Валентина написала після практики:'
export const AB_TEST_YELYZAVETA_REVIEW_HEADER = 'Єлизавета написала після роботи зі мною:'
export const AB_TEST_KSENIIA_REVIEW_HEADER = 'Ксенія написала після роботи зі мною:'

export const AB_TEST_VOICE_NOTE_HEADER = '🎧 Голосове повідомлення від Наді:'

export const AB_TEST_VOICE_NOTE_LINK_TEXT = 'Прослухати голосове повідомлення'

export const AB_TEST_VOICE_NOTE_LINES = [
  '',
  AB_TEST_VOICE_NOTE_HEADER,
  AB_TEST_VOICE_NOTE_LINK_TEXT,
  '',
] as const

export type AbTestScreenshotKey =
  | 'state_review'
  | 'goal_review'
  | 'choice_review'
  | 'decision_review'
  | 'action_review_1'
  | 'action_review_2'
  | 'test_drive_result_review'
  | 'test_drive_inside_review'
  | 'test_drive_response_review'
  | 'dojim_7d_review'

const AB_TEST_SCREENSHOT_FILE_IDS: Record<AbTestScreenshotKey, string> = {
  state_review: '14tPpJxqTUOtQC12kwQsJKeXrcnarQsXK',
  goal_review: '1Pzdk83hFCUTWcDoXtRPOCRqtyp8mgJpu',
  choice_review: '1vt4AWMTZiI20NN28cLYnV77ffVLC_5IY',
  decision_review: '1aYFw1CKM7qFiTECP7x5R4MwPRHPcewpO',
  action_review_1: '1a6ItYLMKfeDCerSkWqO38PQZCgT4SPA2',
  action_review_2: '1DGvNsLvarDlI0X7QIl5WFHAhjDV6A6lc',
  test_drive_result_review: '1hyKSzIAcm9XdsNw7Pg6kureCPghJSQ3g',
  test_drive_inside_review: '1IWssR6WrKec89o81GGeBLsFS7feQAqfr',
  test_drive_response_review: '1lnNlDxxtQOYU2QlS3tdDpUYrqj5k1Cap',
  dojim_7d_review: '1ONOpTDz93r2RQG3-mtX-iWHlBvpdx7Vk',
}

export const AB_TEST_SCREENSHOT_URLS: Record<AbTestScreenshotKey, string> = Object.fromEntries(
  Object.entries(AB_TEST_SCREENSHOT_FILE_IDS).map(([key, fileId]) => [
    key,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
  ])
) as Record<AbTestScreenshotKey, string>

export function buildAbTestScreenshotMarker(key: AbTestScreenshotKey): string {
  return `📸 [СКРІН — ${key}]`
}
