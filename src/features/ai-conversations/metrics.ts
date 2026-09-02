let conversationLogWriteErrors = 0;

export function recordAIConversationLogWriteError() { conversationLogWriteErrors += 1; }
export function getAIConversationMetricsSnapshot() { return { conversationLogWriteErrors }; }
export function resetAIConversationMetricsForTests() { conversationLogWriteErrors = 0; }
