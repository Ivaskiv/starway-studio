// backend/src/modules/microTask/followup.ts
import { MicroTaskResponse } from "../../modules/microTask/types.js"

export const microTaskFollowup = {
  buildAIContext(response: MicroTaskResponse) {
    return {
      type: 'microTaskResult',
      completed: response.completed,
      reflection: response.reflection ?? null,

      event: 'microTask.completed',
      microTaskId: response.microTaskId,
      
    }
  },
}
