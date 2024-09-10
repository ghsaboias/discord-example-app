const config = require('./config');

class ConversationManager {
  constructor() {
    this.conversationHistory = new Map();
  }

  getUserHistory(userId, message) {
    let userHistory = this.conversationHistory.get(userId) || [];
    userHistory.push({ role: "user", content: message.trim() });

    if (userHistory.length > config.MAX_HISTORY) {
      const firstUserIndex = userHistory.findIndex(msg => msg.role === "user");
      if (firstUserIndex > 0) {
        userHistory = [userHistory[firstUserIndex], ...userHistory.slice(-config.MAX_HISTORY + 1)];
      } else {
        userHistory = userHistory.slice(-config.MAX_HISTORY);
      }
    }

    return userHistory;
  }

  updateUserHistory(userId, assistantResponse) {
    let userHistory = this.conversationHistory.get(userId) || [];
    userHistory.push({ role: "assistant", content: assistantResponse });
    this.conversationHistory.set(userId, userHistory);
  }

  clearHistory(userId) {
    if (this.conversationHistory.has(userId)) {
      this.conversationHistory.delete(userId);
      return "Conversation history cleared.";
    }
    return "No conversation history found.";
  }
}

module.exports = ConversationManager;