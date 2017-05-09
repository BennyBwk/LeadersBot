//--------MODULE IMPORTS---------------
const Telegraf = require('telegraf');
const { memorySession } = require('telegraf');
const TelegrafFlow = require('telegraf-flow');
const { WizardScene } = TelegrafFlow ;

const bot = new Telegraf("342044341:AAGP75aL8K3VW5YqkObmA6rXNoGSxSESkj0"); //BE5LeadersBot
// const bot = new Telegraf("349672924:AAF4R7k0AFXYqUhyEyyUHHHKSqdKnuKZIo4"); //Actual Lead1000Bot

//---------BEGIN POLLING--------
bot.use(memorySession());
bot.startPolling();

//-------MODULE EXPORTS--------
module.exports = {
    bot: bot
}

//------RUN YOUR FEATURES BELOW---
const {home} = require('./features/home.js');
