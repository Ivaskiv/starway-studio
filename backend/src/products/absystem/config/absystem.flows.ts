export const absystemFlowRegistry = {
  start_returning_user: ['context_reconnection', 'repeated_pattern', 'next_meaningful_action'],
  focus_reentry: ['focus_memory', 'context_reconnection', 'next_meaningful_action'],
  rollback_detected: ['repeated_pattern', 'movement_interpretation', 'comeback_after_gap'],
  daily_cycle_interrupted: ['comeback_after_gap', 'emotional_recovery', 'next_meaningful_action'],
  unfinished_decision: ['unresolved_decision', 'movement_interpretation', 'next_meaningful_action'],
  wheel_after_gap: ['wheel_interpretation', 'context_reconnection', 'next_meaningful_action'],
  after_zoom: ['focus_memory', 'movement_interpretation', 'next_meaningful_action'],
  after_test: ['context_reconnection', 'movement_interpretation', 'strategic_nudge'],
  after_focus: ['focus_memory', 'movement_interpretation', 'next_meaningful_action'],
  platform_reentry: ['strategic_nudge', 'context_reconnection', 'next_meaningful_action'],
  ab_test_question: ['context_reconnection', 'next_meaningful_action'],
  ab_test_result: ['movement_interpretation', 'strategic_nudge'],
} as const
