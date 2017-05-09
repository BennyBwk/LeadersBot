//--------MODULE IMPORTS---------------
const Telegraf = require('telegraf');
const TelegrafFlow = require('telegraf-flow')
const {Extra, Markup} = require('telegraf');
const {memorySession} = require('telegraf');
const cron = require('node-cron');
const {bot} = require('../bot.js');
const {simpleRouter} = require('../router/router.js');
const Users = require('../../models/Users.js');
const Files = require('../../models/Files.js');
const Attendance = require('../../models/Attendance.js');
const Weeks = require('../../models/Weeks.js');
const Birthdays = require('../../models/Birthdays.js');
const homeHelper = require('./helpers/homeHelper.js');
const Promise = require('bluebird');
const {Scene} = TelegrafFlow;

const flow = new TelegrafFlow()

bot.use(flow)
bot.use(simpleRouter)

//---------USE ROUTER-----------
bot.on('callback_query', simpleRouter.middleware());

bot.command('checkVersion', (ctx) => {
    try {
        ctx.replyWithHTML("BE5 Leaders Bot\nVersion 1.0.0\nLast Updated: 9th May 2017 4:54PM");
    } catch (err) {
        console.log(err)
        ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
    }
});

bot.command('start', (ctx) => {
    try {
        homeHelper.checkUserAlreadyExists( ctx, function(user){
            ctx.replyWithHTML("Welcome to BE5 Leaders Bot!\nChecking your identity...");
            var message = user;
            setTimeout(function(){
                    ctx.replyWithHTML(message);
                }, 2000)
        });
    } catch (err) {
        console.log(err)
        ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
    }
});

const addattendanceScene = new Scene('addattendance')
addattendanceScene.enter((ctx) => ctx.editMessageText('Please enter the name of the person'))
addattendanceScene.on('text', (ctx) => {
  ctx.session.name = ctx.message.text
  ctx.session.messagefrom = ctx.message.from.username
  ctx.session.messagefromid = ctx.message.from.id
  ctx.reply("What is his/her status?", select_status_markup)
  ctx.flow.leave()
})

flow.register(addattendanceScene)

const addattendanceagainScene = new Scene('addattendanceagain')
addattendanceagainScene.enter((ctx) => ctx.replyWithHTML('Please enter the next person for this service\nYou may type "EXIT" to return to main menu'))
addattendanceagainScene.on('text', (ctx) => {
  if (ctx.message.text.toUpperCase() === "EXIT") {
      ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
      ctx.flow.leave()
  } else {
      ctx.session.name = ctx.message.text
      ctx.session.messagefrom = ctx.message.from.username
      ctx.session.messagefromid = ctx.message.from.id
      ctx.reply("What is his/her status?", select_status_markup)
      ctx.flow.leave()
  }
})

flow.register(addattendanceagainScene)

let select_status_markup = Extra
.HTML()
.markup((m) => m.inlineKeyboard([
  m.callbackButton('Regular', 'select_status_markup:regular'),
  m.callbackButton('Integration', 'select_status_markup:integration'),
  m.callbackButton('New Friend', 'select_status_markup:new_friend'),
  m.callbackButton('Guest', 'select_status_markup:guest')
], {columns: 2}));

simpleRouter.on('select_status_markup', (ctx) => {
  switch(ctx.state.value){
    case "regular":
      ctx.session.selected_status = "Regular"
      homeHelper.updateAttendance(ctx, function(msg){
        ctx.editMessageText(msg)
        ctx.flow.enter('addattendanceagain')
      })
    break;
    case "integration":
      ctx.session.selected_status = "Integration"
      homeHelper.updateAttendance(ctx, function(msg){
        ctx.editMessageText(msg)
        ctx.flow.enter('addattendanceagain')
      })
    break;
    case "new_friend":
      ctx.session.selected_status = "New Friend"
      homeHelper.updateAttendance(ctx, function(msg){
        ctx.editMessageText(msg)
        ctx.flow.enter('addattendanceagain')
      })
    break;
    case "guest":
      ctx.session.selected_status = "Guest"
      homeHelper.updateAttendance(ctx, function(msg){
        ctx.editMessageText(msg)
        ctx.flow.enter('addattendanceagain')
      })
    break;
    default:
  };
});

let select_service_markup = Extra
.HTML()
.markup((m) => m.inlineKeyboard([
  m.callbackButton('Service 1', 'select_service_markup:service_1'),
  m.callbackButton('Service 2', 'select_service_markup:service_2'),
  m.callbackButton('Service 3', 'select_service_markup:service_3'),
], {columns: 1}));

simpleRouter.on('select_service_markup', (ctx) => {
  switch(ctx.state.value){
    case "service_1":
      ctx.session.selected_svc = 1
      ctx.flow.enter('addattendance')
    break;
    case "service_2":
      ctx.session.selected_svc = 2
      ctx.flow.enter('addattendance')
    break;
    case "service_3":
      ctx.session.selected_svc = 3
      ctx.flow.enter('addattendance')
    break;
    default:
  };
});

simpleRouter.on('choose_a_week_menu', (ctx) => {
    switch(ctx.state.value){
    default:
      ctx.session.selected_week = ctx.state.value;
      console.log(ctx.state.value);
      homeHelper.getSelectedWeekAttendance(ctx, function(msg){
          ctx.replyWithHTML(msg);
      });
    }
});

let public_main_menu_markup = Extra
.HTML()
.markup((m) => m.inlineKeyboard([
  m.callbackButton('🗒 View Attendance', 'main_public_menu:view_attendance'),
  m.callbackButton('📝 Add Attendance', 'main_public_menu:add_attendance'),
  m.callbackButton('📈 Birthday List', 'main_public_menu:birthday_list'),
  m.callbackButton('🕑 Past Attendance', 'main_public_menu:past_attendance'),
], {columns: 2}));

simpleRouter.on('main_public_menu', (ctx) => {

  switch(ctx.state.value){
    case "view_attendance":
      homeHelper.getAttendance(ctx, function(msg){
        ctx.replyWithHTML(msg)
      })
      break;
    case "add_attendance":
      ctx.editMessageText("Update for which service?", select_service_markup);
      break;
    case "birthday_list":
      homeHelper.getBirthdayList(ctx, function(birthdaylist){
        ctx.editMessageText(birthdaylist);
      })
      break;
    case "past_attendance":
      homeHelper.pastAttendance(ctx);
      break;
    default:
  }

});

bot.command('menu', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function(userObject){
      if (userObject.status == "Admin") {
        try {
            ctx.session.my_telegram_id = ctx.update.message.from.id
            ctx.session.public_main_menu_markup = public_main_menu_markup
            ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        } catch(err) {
            console.log(err)
            console.log("/menu err on telegram id: " + ctx.message.from.id + " username: " + ctx.message.from.username );
            ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
        }
      } else {
          ctx.replyWithHTML("You do not have access to this function. Please contact @bennyboon for more information.")
      }
    })
});

bot.command('remove', (ctx) => {
    homeHelper.removeAttendance(ctx, function(callback){
        ctx.replyWithHTML(callback);
    })
});

bot.command('addBirthday', (ctx) => {
    homeHelper.addBirthday(ctx, function(callback){
        ctx.replyWithHTML(callback);
    })
});

bot.command('clog', (ctx) => {
    if (ctx.update.message.text == "/clog") {
    } else {
        var clogmsg = ctx.update.message.text.replace('/clog ','');
        console.log(clogmsg);
    }
});

bot.command('addWeek', (ctx) => {
    if (ctx.update.message.text == "/addWeek") {
    } else {
        homeHelper.addWeek(ctx, function(callback){
            ctx.replyWithHTML(callback);
        });
    }
});

/*
bot.on('document', (ctx, next) => {
    if (homeHelper.isAdmin_normal(ctx)){
        homeHelper.addDocumentToDatabase(ctx).then((doneObject)=>{
            return ctx.replyWithHTML("File Added Successfully!");
        });
    } else {
        return ctx.replyWithHTML("<i>This command is not available.</i> ");
    }
});

bot.command('clearFiles', (ctx) => {
    try {
        Files.remove({},function(done){
            ctx.replyWithHTML("File(s) Cleared Successfully!");
        })
    } catch (err) {
        console.log(err)
        ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
    }
});

bot.command('getFiles', (ctx) => {
    const getFilesScene = new Scene('getFiles')
    ctx.flow.enter('getFiles')

    getFilesScene.enter((ctx) => ctx.reply('Please enter the password to receive the files for 60 Day Goals Meeting.'))
    getFilesScene.on('text', (ctx) => {
        if (ctx.message.text.toLowerCase() === 'upsidedownfaith') {
            ctx.flow.leave()
            homeHelper.getFileAndSend(ctx)
        } else {
            ctx.reply('The password is incorrect!')
            ctx.flow.leave()
            ctx.flow.enter('getFiles')
        }
    })
});
*/
