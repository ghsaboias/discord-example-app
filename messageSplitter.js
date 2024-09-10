const { AttachmentBuilder } = require("discord.js");

const MAX_MESSAGE_LENGTH = 1900;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB, Discord's file size limit

function splitMessage(message) {
  const parts = [];
  const files = [];
  let currentPart = "";

  function addPart(text) {
    if (currentPart.length + text.length > MAX_MESSAGE_LENGTH) {
      parts.push(currentPart);
      currentPart = "";
    }
    currentPart += text;
  }

  const codeBlockRegex = /```[\s\S]*?```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(message)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      addPart(message.slice(lastIndex, match.index));
    }

    // Handle code block
    const codeBlock = match[0];
    if (codeBlock.length > MAX_MESSAGE_LENGTH) {
      // Large code block: split and add as file
      const fileName = `code_block_${files.length + 1}.txt`;
      files.push(
        new AttachmentBuilder(Buffer.from(codeBlock), { name: fileName })
      );
      addPart(`Large code block sent as file: ${fileName}`);
    } else {
      // Smaller code block: add to message parts
      addPart(codeBlock);
    }

    lastIndex = match.index + codeBlock.length;
  }

  // Add remaining text after last code block
  if (lastIndex < message.length) {
    addPart(message.slice(lastIndex));
  }

  // Add last part if not empty
  if (currentPart) {
    parts.push(currentPart);
  }

  return { parts, files };
}

async function sendSplitMessage(channel, message) {
  if (!message || message.trim().length === 0) {
    console.warn("Attempted to send an empty message, skipping");
    return;
  }

  const { parts, files } = splitMessage(message);

  for (const part of parts) {
    if (part.trim().length > 0) {
      try {
        await channel.send(part);
      } catch (error) {
        if (error.code === 50035) {
          // Message too long, split it further
          const subParts = part.match(/.{1,1900}/g) || [];
          for (const subPart of subParts) {
            await channel.send(subPart);
          }
        } else {
          throw error;
        }
      }
    }
  }

  // Send files in batches to avoid hitting Discord's rate limits
  const FILE_BATCH_SIZE = 5;
  for (let i = 0; i < files.length; i += FILE_BATCH_SIZE) {
    const fileBatch = files.slice(i, i + FILE_BATCH_SIZE);
    await channel.send({ files: fileBatch });
  }
}

module.exports = { sendSplitMessage };
