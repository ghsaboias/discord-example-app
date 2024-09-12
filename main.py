import discord
from discord.ext import commands
import os
from dotenv import load_dotenv
from claude_api import ask_claude, clear_history, analyze_webpage
from config import Config

load_dotenv()

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'{bot.user} has connected to Discord!')

@bot.event
async def on_message(message):
    if message.author.bot:
        return

    if message.guild.id == int(os.getenv('GUILD_ID')) and message.author.id == int(os.getenv('AUTHORIZED_USER_ID')):
        if message.content.lower() == "!clear":
            clear_message = clear_history(str(message.author.id))
            await message.reply(clear_message)
            print(f"Cleared history for user {message.author.id}")
            return

        if message.content.lower().startswith("!analyze "):
            url = message.content[9:].strip()
            async with message.channel.typing():
                analysis = await analyze_webpage(url)
            await message.reply(analysis)
            print(f"Sent webpage analysis to user {message.author.id}")
            return

        print(f"Processing message from user {message.author.id}: {message.content}")
        async with message.channel.typing():
            response = await ask_claude(str(message.author.id), message.content)
        await message.reply(response)
        print(f"Sent response to user {message.author.id}")

    await bot.process_commands(message)

bot.run(os.getenv('DISCORD_TOKEN'))