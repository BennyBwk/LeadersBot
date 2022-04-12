// Basic Imports
const Telegraf = require('telegraf');
const Promise = require('bluebird');
const { Extra, Markup, memorySession } = require('telegraf');
const moment = require('../../moment.js');
//DB Imports
const Users = require('../../models/Users.js');
const Files = require('../../models/Files.js');
const Attendance = require('../../models/Attendance.js');
const Weeks = require('../../models/Weeks.js');
const Birthdays = require('../../models/Birthdays.js');
const Events = require('../../models/Events.js');
//Flow & Router Imports
const { bot } = require('../bot.js');
const { simpleRouter } = require('../router/router.js');
const TelegrafFlow = require('telegraf-flow');
const { Scene } = TelegrafFlow;
const flow = new TelegrafFlow()
//Import homeHelper
const homeHelper = require('./helpers/homeHelper.js');
//Bot Variables
const superUserTelegramID = "19663241";
const cg = "BE5";
//Version Info
var versionNo = "2.9.30 Beta";
var lastUpdated = "30th September 2019 11:02AM"

bot.use(flow)
bot.use(simpleRouter)

//---------USE ROUTER-----------
bot.on('callback_query', simpleRouter.middleware());

bot.command('checkVersion', (ctx) => {
    try {
        ctx.replyWithHTML(cg + " Leaders Bot\nVersion " + versionNo + "\nLast Updated: " + lastUpdated);
    } catch (err) {
        console.log(err)
        ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
    }
});

bot.command('help', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function (userObject) {
        if (userObject != undefined) {
            if (userObject.status == "Admin") {
                try {
                    var helpInfoMsg = "";
                    helpInfoMsg = helpInfoMsg + "<b>" + cg + " Leaders Bot Help</b>\n<code>Version " + versionNo + "\nLast Updated: " + lastUpdated + "</code>\n\n";
                    helpInfoMsg = helpInfoMsg + "<b>Commands</b>";
                    helpInfoMsg = helpInfoMsg + "\n<code>/start</code> - register with the bot";
                    helpInfoMsg = helpInfoMsg + "\n<code>/menu</code> - view the main menu";
                    helpInfoMsg = helpInfoMsg + "\n<code>/remove</code> - remove someone from the attendance";
                    helpInfoMsg = helpInfoMsg + "\n<code>/removeAll</code> - remove all attendance for this week";
                    helpInfoMsg = helpInfoMsg + "\n<code>/toggleReminder</code> - toggle on/off for attendance reminder";
                    helpInfoMsg = helpInfoMsg + "\n<code>/find</code> - find your missing friend or pet";
                    helpInfoMsg = helpInfoMsg + "\n<code>/help</code> - what you are doing now";
                    helpInfoMsg = helpInfoMsg + "\n<code>/checkVersion</code> - check current version of bot";
                    helpInfoMsg = helpInfoMsg + "\n\nFor any enquiry or suggestions, please contact @bennyboon";
                    ctx.replyWithHTML(helpInfoMsg);
                } catch (err) {
                    console.log(err)
                    ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
                }
            }
        }
    });
});

bot.command('start', (ctx) => {
    try {
        homeHelper.checkUserAlreadyExists(ctx, function (user) {
            ctx.replyWithHTML("Welcome to " + cg + " Leaders Bot!\nChecking your identity...");
            var message = user;
            setTimeout(function () {
                ctx.replyWithHTML(message);
            }, 2000)
        });
    } catch (err) {
        ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
    }
});

bot.command('cmdList', (ctx) => {
    if (ctx.message.from.id == superUserTelegramID) {
        var cmdList = "<b>Super Admin Command List</b>\n"
        cmdList = cmdList + "\n<code>/start</code> - register with the bot"
        cmdList = cmdList + "\n<code>/menu</code> - view the main menu"
        cmdList = cmdList + "\n<code>/remove</code> - remove someone from the attendance"
        cmdList = cmdList + "\n<code>/toggleReminder</code> - toggle on/off for attendance reminder"
        cmdList = cmdList + "\n<code>/help</code> - view help for bot"
        cmdList = cmdList + "\n<code>/cmdList</code> - what you are doing now"
        cmdList = cmdList + "\n<code>/checkVersion</code> - check current version of bot"
        cmdList = cmdList + "\n<code>/activateCron</code> - start all crons on bot"
        cmdList = cmdList + "\n<code>/broadcastBot</code> - broadcast to all without a name"
        cmdList = cmdList + "\n<code>/setReceiver</code> - set a user's notification to true"
        cmdList = cmdList + "\n<code>/removeReceiver</code> - set a user's notification to false"
        cmdList = cmdList + "\n<code>/setAdmin</code> - set a user to be admin"
        cmdList = cmdList + "\n<code>/removeAdmin</code> - remove admin from a user"
        cmdList = cmdList + "\n<code>/users</code> - view all users in database"
        cmdList = cmdList + "\n<code>/clog</code> - send text to console"
        cmdList = cmdList + "\n\n<b>Additional Features</b>"
        cmdList = cmdList + "\n<code>Birthday Reminder</code> - 12mn on the day itself"
        cmdList = cmdList + "\n<code>Attendance Reminder</code> - every thursdays at 12pm"
        cmdList = cmdList + "\n<code>Auto Create Week</code> - every sunday at 12mn"
        cmdList = cmdList + "\n<code>Auto Update Age</code> - once a birthdate reaches"
        ctx.replyWithHTML(cmdList);
    }
});

bot.command('users', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function (userObject) {
        if (userObject != undefined) {
            if (userObject.status == "Admin") {
                if (ctx.message.from.id == superUserTelegramID) {
                    homeHelper.userList(ctx, function (callback) {
                        ctx.replyWithHTML(callback);
                    });
                }
            }
        }
    });
});

bot.command('menu', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function (userObject) {
        if (userObject != undefined) {
            if (userObject.status == "Admin") {
                try {
                    ctx.session.my_telegram_id = ctx.update.message.from.id
                    ctx.session.public_main_menu_markup = public_main_menu_markup
                    ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
                } catch (err) {
                    ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
                }
            } else {
                ctx.replyWithHTML("You do not have access to this function. Please contact @bennyboon for more information.")
            }
        }
    })
});

bot.command('remove', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function (userObject) {
        if (userObject != undefined) {
            if (userObject.status == "Admin") {
                homeHelper.removeAttendance(ctx, function (callback) {
                    ctx.replyWithHTML(callback);
                })
            }
        }
    });
});

bot.command('removeAll', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function (userObject) {
        if (userObject != undefined) {
            if (userObject.status == "Admin") {
                homeHelper.removeAll(ctx, function (callback) {
                    ctx.replyWithHTML(callback);
                })
            }
        }
    });
});

bot.command('clog', (ctx) => {
    if (ctx.update.message.text == "/clog") {
        //do nothing
    } else {
        var clogmsg = ctx.update.message.text.replace('/clog ', '');
        console.log(clogmsg);
    }
});

bot.command('addWeek', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function (userObject) {
        if (userObject != undefined) {
            if (userObject.status == "Admin") {
                if (ctx.message.from.id == superUserTelegramID) {
                    homeHelper.addWeek(ctx, function (callback) {
                        ctx.replyWithHTML(callback);
                    });
                }
            }
        }
    });
});

bot.command('setAdmin', (ctx) => {
    if (ctx.update.message.text == "/setAdmin") {
        //Do nothing
    } else {
        homeHelper.checkIfAdmin(ctx, function (userObject) {
            if (userObject != undefined) {
                if (userObject.status == "Admin") {
                    if (ctx.message.from.id == superUserTelegramID) {
                        homeHelper.setAdmin(ctx, function (callback) {
                            ctx.replyWithHTML(callback);
                        });
                    }
                }
            }
        });
    }
});

bot.command('removeAdmin', (ctx) => {
    if (ctx.update.message.text == "/removeAdmin") {
        //Do nothing
    } else {
        homeHelper.checkIfAdmin(ctx, function (userObject) {
            if (userObject != undefined) {
                if (userObject.status == "Admin") {
                    if (ctx.message.from.id == superUserTelegramID) {
                        homeHelper.removeAdmin(ctx, function (callback) {
                            ctx.replyWithHTML(callback);
                        });
                    }
                }
            }
        });
    }
});

bot.command('setReceiver', (ctx) => {
    if (ctx.update.message.text == "/setReceiver") {
        //Do nothing
    } else {
        homeHelper.checkIfAdmin(ctx, function (userObject) {
            if (userObject != undefined) {
                if (userObject.status == "Admin") {
                    if (ctx.message.from.id == superUserTelegramID) {
                        homeHelper.setReceiver(ctx, function (callback) {
                            ctx.replyWithHTML(callback);
                        });
                    }
                }
            }
        });
    }
});

bot.command('removeReceiver', (ctx) => {
    if (ctx.update.message.text == "/removeReceiver") {
        //Do nothing
    } else {
        homeHelper.checkIfAdmin(ctx, function (userObject) {
            if (userObject != undefined) {
                if (userObject.status == "Admin") {
                    if (ctx.message.from.id == superUserTelegramID) {
                        homeHelper.removeReceiver(ctx, function (callback) {
                            ctx.replyWithHTML(callback);
                        });
                    }
                }
            }
        });
    }
});

bot.command('toggleReminder', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function (userObject) {
        if (userObject != undefined) {
            if (userObject.status == "Admin") {
                homeHelper.toggleReminder(ctx, function (callback) {
                    ctx.replyWithHTML(callback);
                });
            }
        }
    });
})

bot.command('broadcastBot', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function (userObject) {
        if (userObject != undefined) {
            if (userObject.status == "Admin") {
                if (ctx.message.from.id == superUserTelegramID) {
                    ctx.flow.enter('broadcastBot')
                }
            }
        }
    });
});

bot.command('find', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function (userObject) {
        if (userObject != undefined) {
            if (userObject.status == "Admin") {
                if (ctx.update.message.text == '/find') {
                    ctx.replyWithHTML("Who do you want to look for?\n<code>Format: e.g. /find Bun Bun</code>");
                } else {
                    var msg = "";
                    var person = ctx.update.message.text.replace('/find ', '');
                    var name = person.charAt(0).toUpperCase() + person.slice(1);
                    const places = ['Kerning City: Kerning City', 'Mu Lung: Entrance to Sky Forest', 'Maple Road: Snail Park', 'Henesys: Henesys Hunting Ground I', 'Aqua Road: Forked Road'];
                    const action = ['looking for food', 'sharing John 3:16', 'hunting for Emerald Ore', 'drinking LiHo', 'studying for exam', 'farming mesos', 'looking for lost pet'];
                    function random(places, action) {
                        msg = "<b>" + name + "</b> is currently at <b>" + places[Math.floor(Math.random() * places.length)] + " " + action[Math.floor(Math.random() * action.length)] + "</b>";
                        return msg
                    }
                    ctx.replyWithHTML(random(places, action));
                }
            }
        }
    });
})

const addNewMemberScene = new Scene('addNewMember')
addNewMemberScene.enter((ctx) => ctx.editMessageText('Please enter the name of the person\n(Have OCD and caps the first letters)'))
addNewMemberScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.session.name = ctx.message.text
        ctx.session.messagefrom = ctx.message.from.username
        ctx.session.messagefromid = ctx.message.from.id
        homeHelper.checkPersonExist(ctx, function (existInfo) {
            if (existInfo == null) {
                ctx.reply("What is his/her status?", select_status_markup);
                ctx.flow.leave()
            } else {
                ctx.reply(existInfo.name + " already exist in the database");
                ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
                ctx.flow.leave()
            }
        })
    }
})
flow.register(addNewMemberScene)

const broadcastScene = new Scene('broadcast')
broadcastScene.enter((ctx) => ctx.replyWithHTML('Please send me the <b>message</b> or <b>document</b> to broadcast\n<code>Message will be send to all Leaders using this Bot.\nType CANCEL to cancel.</code>'))
broadcastScene.on('text', (ctx) => {
    if (ctx.message.text.toUpperCase() === "CANCEL") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.session.message = ctx.message.text
        homeHelper.broadcastMessage(ctx);
        ctx.flow.leave()
    }
})
broadcastScene.on('document', (ctx) => {
    ctx.session.messageDoc = ctx.message.document.file_id
    homeHelper.broadcastMessageDocBot(ctx);
    ctx.flow.leave()
})
flow.register(broadcastScene)

const broadcastBotScene = new Scene('broadcastBot')
broadcastBotScene.enter((ctx) => ctx.replyWithHTML('Please send me the <b>message</b> or <b>document</b> to broadcast\n<code>Type CANCEL to cancel.</code>'))
broadcastBotScene.on('text', (ctx) => {
    if (ctx.message.text.toUpperCase() === "CANCEL") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.session.message = ctx.message.text
        homeHelper.broadcastMessageBot(ctx);
        ctx.flow.leave()
    }
})
broadcastBotScene.on('document', (ctx) => {
    ctx.session.messageDoc = ctx.message.document.file_id
    homeHelper.broadcastMessageDocBot(ctx, function (userObject) {
    })
    ctx.flow.leave()
})
flow.register(broadcastBotScene)

const editMemberNameScene = new Scene('editMemberName')
editMemberNameScene.enter((ctx) => ctx.editMessageText('Enter the correct name for him/her\n(Be sure to caps each first letter)'))
editMemberNameScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.session.updatedname = ctx.message.text
        homeHelper.editMemberName(ctx);
        ctx.replyWithHTML("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
        ctx.flow.leave()
    }
})
flow.register(editMemberNameScene)

const editMemberAgeScene = new Scene('editMemberAge')
editMemberAgeScene.enter((ctx) => ctx.editMessageText('Enter his/her age as of today'))
editMemberAgeScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else if (Number.isInteger(ctx.message.text) || ctx.message.text > 0) {
        ctx.session.updatedage = ctx.message.text
        homeHelper.editMemberAge(ctx);
        ctx.replyWithHTML("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.flow.enter("editMemberAgeAgain");
    }
})
flow.register(editMemberAgeScene)

const editMemberAgeAgainScene = new Scene('editMemberAgeAgain')
editMemberAgeAgainScene.enter((ctx) => ctx.replyWithHTML('Please enter a valid age'))
editMemberAgeAgainScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else if (Number.isInteger(ctx.message.text) || ctx.message.text > 0) {
        ctx.session.updatedage = ctx.message.text
        homeHelper.editMemberAge(ctx);
        ctx.replyWithHTML("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.flow.enter("editMemberAgeAgain");
    }
})
flow.register(editMemberAgeAgainScene)

const editMemberBirthdateScene = new Scene('editMemberBirthdate')
editMemberBirthdateScene.enter((ctx) => ctx.editMessageText('Enter the birthdate of this member\n(Format: DD/MM/YYYY)'))
editMemberBirthdateScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else if (moment(ctx.message.text, 'DD/MM/YYYY').isValid() == true) {
        ctx.session.updatedbirthdate = moment(ctx.message.text, 'DD-MM-YYYY').format('DD/MM/YYYY');
        homeHelper.editMemberBirthdate(ctx);
        ctx.replyWithHTML("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.flow.enter("editMemberBirthdateAgain");
    }
})
flow.register(editMemberBirthdateScene)

const editMemberBirthdateAgainScene = new Scene('editMemberBirthdateAgain')
editMemberBirthdateAgainScene.enter((ctx) => ctx.replyWithHTML('Please enter the birthdate correctly\n<b>(Format: DD/MM/YYYY)</b>'))
editMemberBirthdateAgainScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else if (moment(ctx.message.text, 'DD/MM/YYYY').isValid() == true) {
        ctx.session.updatedbirthdate = moment(ctx.message.text, 'DD-MM-YYYY').format('DD/MM/YYYY');
        homeHelper.editMemberBirthdate(ctx);
        ctx.replyWithHTML("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.flow.enter("editMemberBirthdateAgain");
    }
})
flow.register(editMemberBirthdateAgainScene)

const addNewEventScene = new Scene('addNewEvent')
addNewEventScene.enter((ctx) => ctx.editMessageText('Please enter the name of the event'))
addNewEventScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.session.eventname = ctx.message.text
        ctx.session.messagefrom = ctx.message.from.username
        ctx.flow.enter('setEventDate');
    }
})
flow.register(addNewEventScene)

const setEventDateScene = new Scene('setEventDate')
setEventDateScene.enter((ctx) => ctx.replyWithHTML('Please enter the date of the event\n(Format: DD/MM/YYYY)'))
setEventDateScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else if (moment(ctx.message.text, 'DD/MM/YYYY').isValid() == true) {
        ctx.session.eventdate = moment(ctx.message.text, 'DD-MM-YYYY').format('DD/MM/YYYY');
        ctx.replyWithHTML('Is there a location for this event?', event_location_markup);
        ctx.flow.leave()
    } else {
        ctx.flow.enter("setEventDateAgain");
    }
})
flow.register(setEventDateScene)

const setEventDateAgainScene = new Scene('setEventDateAgain')
setEventDateAgainScene.enter((ctx) => ctx.replyWithHTML('Please enter a valid date\n(Format: DD/MM/YYYY)'))
setEventDateAgainScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else if (moment(ctx.message.text, 'DD/MM/YYYY').isValid() == true) {
        ctx.session.eventdate = moment(ctx.message.text, 'DD-MM-YYYY').format('DD/MM/YYYY');
        ctx.replyWithHTML('Is there a location for this event?', event_location_markup);
        ctx.flow.leave()
    } else {
        ctx.flow.enter("setEventDateAgain");
    }
})
flow.register(setEventDateAgainScene)

const setRealEventLocationScene = new Scene('setRealEventLocation')
setRealEventLocationScene.enter((ctx) => ctx.editMessageText('Please enter the location of this event'))
setRealEventLocationScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.session.eventlocation = ctx.message.text;
        ctx.replyWithHTML('Is there a timing for this event?', event_time_markup);
        ctx.flow.leave()
    }
})
flow.register(setRealEventLocationScene)

const setRealEventTimeScene = new Scene('setRealEventTime')
setRealEventTimeScene.enter((ctx) => ctx.editMessageText('Please enter the timing of this event\n(e.g. 7:00PM - 9:00PM)'))
setRealEventTimeScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.session.eventtime = ctx.message.text;
        homeHelper.updateEvent(ctx);
        ctx.replyWithHTML("Event has been created\nWhat do you want to do next:", public_main_menu_markup);
        ctx.flow.leave()
    }
})
flow.register(setRealEventTimeScene)

const editEventNameScene = new Scene('editEventName')
editEventNameScene.enter((ctx) => ctx.editMessageText('Enter the name for this event'))
editEventNameScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.session.messagefrom = ctx.message.from.username
        ctx.session.updatedname = ctx.message.text
        homeHelper.editEventName(ctx);
        ctx.replyWithHTML("Event's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
        ctx.flow.leave()
    }
})
flow.register(editEventNameScene)

const editEventDateScene = new Scene('editEventDate')
editEventDateScene.enter((ctx) => ctx.editMessageText('Enter the date for this event\n(Format: DD/MM/YYYY)'))
editEventDateScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else if (moment(ctx.message.text, 'DD/MM/YYYY').isValid() == true) {
        ctx.session.messagefrom = ctx.message.from.username
        ctx.session.updatedeventdate = moment(ctx.message.text, 'DD-MM-YYYY').format('DD/MM/YYYY');
        homeHelper.editEventDate(ctx);
        ctx.replyWithHTML("Event's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.flow.enter("editEventDateAgain");
    }
})
flow.register(editEventDateScene)

const editEventDateAgainScene = new Scene('editEventDateAgain')
editEventDateAgainScene.enter((ctx) => ctx.replyWithHTML('Please enter a valid date\n<b>(Format: DD/MM/YYYY)</b>'))
editEventDateAgainScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else if (moment(ctx.message.text, 'DD/MM/YYYY').isValid() == true) {
        ctx.session.messagefrom = ctx.message.from.username
        ctx.session.updatedeventdate = moment(ctx.message.text, 'DD-MM-YYYY').format('DD/MM/YYYY');
        homeHelper.editEventDate(ctx);
        ctx.replyWithHTML("Event's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.flow.enter("editEventDateAgain");
    }
})
flow.register(editEventDateAgainScene)

const editEventLocationScene = new Scene('editEventLocation')
editEventLocationScene.enter((ctx) => ctx.editMessageText('Enter the location for this event'))
editEventLocationScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.session.messagefrom = ctx.message.from.username
        ctx.session.updatedlocation = ctx.message.text
        homeHelper.editEventLocation(ctx);
        ctx.replyWithHTML("Event's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
        ctx.flow.leave()
    }
})
flow.register(editEventLocationScene)

const editEventTimeScene = new Scene('editEventTime')
editEventTimeScene.enter((ctx) => ctx.editMessageText('Enter the timing for this event\n(e.g. 7:00PM - 9:00PM)'))
editEventTimeScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.session.messagefrom = ctx.message.from.username
        ctx.session.updatedtime = ctx.message.text
        homeHelper.editEventTime(ctx);
        ctx.replyWithHTML("Event's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
        ctx.flow.leave()
    }
})
flow.register(editEventTimeScene)

let select_new_status_markup = Extra
    .HTML()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('Zone Manager', 'select_new_status_markup:zm'),
        m.callbackButton('Zone Leader', 'select_new_status_markup:zl'),
        m.callbackButton('CGL', 'select_new_status_markup:cgl'),
        m.callbackButton('PCGL', 'select_new_status_markup:pcgl'),
        m.callbackButton('TL', 'select_new_status_markup:tl'),
        m.callbackButton('PTL', 'select_new_status_markup:ptl'),
        m.callbackButton('Regular', 'select_new_status_markup:regular'),
        m.callbackButton('Good Integration', 'select_new_status_markup:good_integration'),
        m.callbackButton('Integration', 'select_new_status_markup:integration'),
        m.callbackButton('New Friend', 'select_new_status_markup:new_friend'),
        m.callbackButton('Guest', 'select_new_status_markup:guest')
    ], { columns: 2 }));

simpleRouter.on('select_new_status_markup', (ctx) => {
    switch (ctx.state.value) {
        case "zm":
            ctx.session.selected_new_status = "Zone Manager"
            homeHelper.editMemberStatus(ctx);
            ctx.editMessageText("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
            break;
        case "zl":
            ctx.session.selected_new_status = "Zone Leader"
            homeHelper.editMemberStatus(ctx);
            ctx.editMessageText("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
            break;
        case "cgl":
            console.log("cgl");
            ctx.session.selected_new_status = "CGL"
            homeHelper.editMemberStatus(ctx);
            ctx.editMessageText("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
            break;
        case "pcgl":
            ctx.session.selected_new_status = "PCGL"
            homeHelper.editMemberStatus(ctx);
            ctx.editMessageText("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
            break;
        case "tl":
            ctx.session.selected_new_status = "TL"
            homeHelper.editMemberStatus(ctx);
            ctx.editMessageText("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
            break;
        case "ptl":
            ctx.session.selected_new_status = "PTL"
            homeHelper.editMemberStatus(ctx);
            ctx.editMessageText("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
            break;
        case "regular":
            ctx.session.selected_new_status = "Regular"
            homeHelper.editMemberStatus(ctx);
            ctx.editMessageText("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
            break;
        case "integration":
            ctx.session.selected_new_status = "Integration"
            homeHelper.editMemberStatus(ctx);
            ctx.editMessageText("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
            break;
        case "new_friend":
            ctx.session.selected_new_status = "New Friend"
            homeHelper.editMemberStatus(ctx);
            ctx.editMessageText("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
            break;
        case "guest":
            ctx.session.selected_new_status = "Guest"
            homeHelper.editMemberStatus(ctx);
            ctx.editMessageText("Member's detail has been updated\nWhat do you want to do next:", public_main_menu_markup);
            break;
        default:
            ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
    };
});

let select_status_markup = Extra
    .HTML()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('Zone Manager', 'select_status_markup:zm'),
        m.callbackButton('Zone Leader', 'select_status_markup:zl'),
        m.callbackButton('CGL', 'select_status_markup:cgl'),
        m.callbackButton('PCGL', 'select_status_markup:pcgl'),
        m.callbackButton('TL', 'select_status_markup:tl'),
        m.callbackButton('PTL', 'select_status_markup:ptl'),
        m.callbackButton('Regular', 'select_status_markup:regular'),
        m.callbackButton('Good Integration', 'select_status_markup:good_integration'),
        m.callbackButton('Integration', 'select_status_markup:integration'),
        m.callbackButton('New Friend', 'select_status_markup:new_friend'),
        m.callbackButton('Guest', 'select_status_markup:guest')
    ], { columns: 2 }));

simpleRouter.on('select_status_markup', (ctx) => {
    switch (ctx.state.value) {
        case "zm":
            ctx.session.selected_status = "Zone Manager"
            homeHelper.addNewMemberAttendance(ctx);
            break;
        case "zl":
            ctx.session.selected_status = "Zone Leader"
            homeHelper.addNewMemberAttendance(ctx);
            break;
        case "cgl":
            ctx.session.selected_status = "CGL"
            homeHelper.addNewMemberAttendance(ctx);
            break;
        case "pcgl":
            ctx.session.selected_status = "PCGL"
            homeHelper.addNewMemberAttendance(ctx);
            break;
        case "tl":
            ctx.session.selected_status = "TL"
            homeHelper.addNewMemberAttendance(ctx);
            break;
        case "ptl":
            ctx.session.selected_status = "PTL"
            homeHelper.addNewMemberAttendance(ctx);
            break;
        case "regular":
            ctx.session.selected_status = "Regular"
            homeHelper.addNewMemberAttendance(ctx);
            break;
        case "good_integration":
            ctx.session.selected_status = "Good Integration"
            homeHelper.addNewMemberAttendance(ctx);
            break;
        case "integration":
            ctx.session.selected_status = "Integration"
            homeHelper.addNewMemberAttendance(ctx);
            break;
        case "new_friend":
            ctx.session.selected_status = "New Friend"
            homeHelper.addNewMemberAttendance(ctx);
            break;
        case "guest":
            ctx.session.selected_status = "Guest"
            homeHelper.addNewMemberAttendance(ctx);
            break;
        default:
            ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
    };
});

let select_service_markup = Extra
    .HTML()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('Service 1', 'select_service_markup:service_1'),
        m.callbackButton('Service 2', 'select_service_markup:service_2'),
        m.callbackButton('Service 3', 'select_service_markup:service_3'),
        m.callbackButton('Adjusted', 'select_service_markup:adjusted')
    ], { columns: 2 }));

simpleRouter.on('select_service_markup', (ctx) => {
    switch (ctx.state.value) {
        case "service_1":
            ctx.session.selected_svc = 1
            homeHelper.getAttendanceNameButtons(ctx);
            break;
        case "service_2":
            ctx.session.selected_svc = 2
            homeHelper.getAttendanceNameButtons(ctx);
            break;
        case "service_3":
            ctx.session.selected_svc = 3
            homeHelper.getAttendanceNameButtons(ctx);
            break;
        case "adjusted":
            ctx.session.selected_svc = 0
            homeHelper.getAttendanceNameButtons(ctx);
            break;
        default:
            ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
    };
});

let public_main_menu_markup = Extra
    .HTML()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('🗒 View Attendance', 'main_public_menu:view_attendance'),
        m.callbackButton('📝 Add Attendance', 'main_public_menu:add_attendance'),
        m.callbackButton('📅 Happenings', 'main_public_menu:happenings'),
        m.callbackButton('🕑 Past Attendance', 'main_public_menu:past_attendance'),
        m.callbackButton('🎉 Birthday List', 'main_public_menu:birthday_list'),
        m.callbackButton('📊 Statistics', 'main_public_menu:statistics'),
        m.callbackButton('🔈 Broadcast Message', 'main_public_menu:broadcast_message'),
        m.callbackButton('👤 Edit CG Member', 'main_public_menu:edit_member'),
        m.callbackButton('📖 View Bot Help', 'main_public_menu:view_help')
    ], { columns: 2 }));

simpleRouter.on('main_public_menu', (ctx) => {

    switch (ctx.state.value) {
        case "view_attendance":
            homeHelper.getAttendance(ctx, function (msg) {
                ctx.replyWithHTML(msg)
            })
            break;
        case "add_attendance":
            ctx.editMessageText("Update for which service?", select_service_markup);
            break;
        case "happenings":
            homeHelper.getEvents(ctx, function (msg) {
                ctx.replyWithHTML(msg, happenings_markup);
            })
            break;
        case "past_attendance":
            homeHelper.pastAttendance(ctx);
            break;
        case "birthday_list":
            homeHelper.getBirthdayList(ctx, function (birthdaylist) {
                ctx.editMessageText(birthdaylist);
            })
            break;
        case "statistics":
            ctx.editMessageText("What statistics would you like to view?\n\nMore useful statistics will be available in future!", select_statistics_markup);
            break;
        case "broadcast_message":
            ctx.flow.enter('broadcast')
            break;
        case "edit_member":
            homeHelper.editMember(ctx);
            break;
        case "view_help":
            try {
                var helpInfoMsg = "";
                helpInfoMsg = helpInfoMsg + "<b>" + cg + " Leaders Bot Help</b>\n<code>Version " + versionNo + "\nLast Updated: " + lastUpdated + "</code>\n\n";
                helpInfoMsg = helpInfoMsg + "<b>Commands</b>";
                helpInfoMsg = helpInfoMsg + "\n<code>/start</code> - register with the bot";
                helpInfoMsg = helpInfoMsg + "\n<code>/menu</code> - view the main menu";
                helpInfoMsg = helpInfoMsg + "\n<code>/remove</code> - remove someone from the attendance";
                helpInfoMsg = helpInfoMsg + "\n<code>/removeAll</code> - remove all attendance for this week";
                helpInfoMsg = helpInfoMsg + "\n<code>/toggleReminder</code> - toggle on/off for attendance reminder";
                helpInfoMsg = helpInfoMsg + "\n<code>/find</code> - find your missing friend or pet";
                helpInfoMsg = helpInfoMsg + "\n<code>/help</code> - what you are doing now";
                helpInfoMsg = helpInfoMsg + "\n<code>/checkVersion</code> - check current version of bot";
                helpInfoMsg = helpInfoMsg + "\n\nFor any enquiry or suggestions, please contact @bennyboon";
                ctx.replyWithHTML(helpInfoMsg);
            } catch (err) {
                console.log(err)
                ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
            }
            break;
        default:
            ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
    }

});

let remove_member_confirmation_markup = Extra
    .HTML()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('Yes', 'remove_member_confirmation_markup:proceed_btn'),
        m.callbackButton('Cancel', 'remove_member_confirmation_markup:cancel_btn')
    ], { columns: 2 }));

simpleRouter.on('remove_member_confirmation_markup', (ctx) => {
    switch (ctx.state.value) {
        case "proceed_btn":
            if (ctx.session.selected_member != null) {
                homeHelper.removeMember(ctx);
                ctx.editMessageText("Member has been removed\nWhat do you want to do next:", public_main_menu_markup);
            } else {
                ctx.editMessageText("Request timed out - Please try again\nYou may choose one of the following options:", public_main_menu_markup);
            }
            break;
        case "cancel_btn":
            ctx.editMessageText("You may choose one of the following options:", public_main_menu_markup);
            break;
        default:
            ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
    };
});

let remove_event_confirmation_markup = Extra
    .HTML()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('Yes', 'remove_event_confirmation_markup:proceed_btn'),
        m.callbackButton('Cancel', 'remove_event_confirmation_markup:cancel_btn')
    ], { columns: 2 }));

simpleRouter.on('remove_event_confirmation_markup', (ctx) => {
    switch (ctx.state.value) {
        case "proceed_btn":
            if (ctx.session.selected_event != null) {
                homeHelper.removeEvent(ctx);
                ctx.editMessageText("Event has been deleted\nWhat do you want to do next:", public_main_menu_markup);
            } else {
                ctx.editMessageText("Request timed out - Please try again\nYou may choose one of the following options:", public_main_menu_markup);
            }
            break;
        case "cancel_btn":
            ctx.editMessageText("You may choose one of the following options:", public_main_menu_markup);
            break;
        default:
            ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
    };
});

let member_detail_menu_markup = Extra
    .HTML()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('Edit Name', 'member_detail_menu:edit_name'),
        m.callbackButton('Edit Status', 'member_detail_menu:edit_status'),
        m.callbackButton('Edit Age', 'member_detail_menu:edit_age'),
        m.callbackButton('Edit Birthdate', 'member_detail_menu:edit_birthdate'),
        m.callbackButton('Delete Member', 'member_detail_menu:delete_member')
    ], { columns: 2 }));

simpleRouter.on('member_detail_menu', (ctx) => {
    switch (ctx.state.value) {
        case "edit_name":
            if (ctx.session.selected_member != null) {
                ctx.flow.enter('editMemberName');
            } else {
                ctx.editMessageText("Request timed out - Please try again\nYou may choose one of the following options:", public_main_menu_markup);
            }
            break;
        case "edit_status":
            if (ctx.session.selected_member != null) {
                ctx.editMessageText('What is his/her status?', select_new_status_markup);
            } else {
                ctx.editMessageText("Request timed out - Please try again\nYou may choose one of the following options:", public_main_menu_markup);
            }
            break;
        case "edit_age":
            if (ctx.session.selected_member != null) {
                ctx.flow.enter('editMemberAge');
            } else {
                ctx.editMessageText("Request timed out - Please try again\nYou may choose one of the following options:", public_main_menu_markup);
            }
            break;
        case "edit_birthdate":
            if (ctx.session.selected_member != null) {
                ctx.flow.enter('editMemberBirthdate');
            } else {
                ctx.editMessageText("Request timed out - Please try again\nYou may choose one of the following options:", public_main_menu_markup);
            }
            break;
        case "delete_member":
            if (ctx.session.selected_member != null) {
                ctx.editMessageText("Are you sure?", remove_member_confirmation_markup);
            } else {
                ctx.editMessageText("Request timed out - Please try again\nYou may choose one of the following options:", public_main_menu_markup);
            }
            break;
        default:
            ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
    };
});

let event_detail_menu_markup = Extra
    .HTML()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('Edit Name', 'event_detail_menu:edit_eventname'),
        m.callbackButton('Edit Date', 'event_detail_menu:edit_eventdate'),
        m.callbackButton('Edit Location', 'event_detail_menu:edit_eventlocation'),
        m.callbackButton('Edit Time', 'event_detail_menu:edit_eventtime'),
        m.callbackButton('Delete Event', 'event_detail_menu:remove_event')
    ], { columns: 2 }));

simpleRouter.on('event_detail_menu', (ctx) => {
    switch (ctx.state.value) {
        case "edit_eventname":
            if (ctx.session.selected_event != null) {
                ctx.flow.enter('editEventName');
            } else {
                ctx.editMessageText("Request timed out - Please try again\nYou may choose one of the following options:", public_main_menu_markup);
            }
            break;
        case "edit_eventdate":
            if (ctx.session.selected_event != null) {
                ctx.flow.enter('editEventDate');
            } else {
                ctx.editMessageText("Request timed out - Please try again\nYou may choose one of the following options:", public_main_menu_markup);
            }
            break;
        case "edit_eventlocation":
            if (ctx.session.selected_event != null) {
                ctx.flow.enter('editEventLocation');
            } else {
                ctx.editMessageText("Request timed out - Please try again\nYou may choose one of the following options:", public_main_menu_markup);
            }
            break;
        case "edit_eventtime":
            if (ctx.session.selected_event != null) {
                ctx.flow.enter('editEventTime');
            } else {
                ctx.editMessageText("Request timed out - Please try again\nYou may choose one of the following options:", public_main_menu_markup);
            }
            break;
        case "remove_event":
            if (ctx.session.selected_event != null) {
                ctx.editMessageText("Are you sure?", remove_event_confirmation_markup);
            } else {
                ctx.editMessageText("Request timed out - Please try again\nYou may choose one of the following options:", public_main_menu_markup);
            }
            break;
        default:
            ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
    };
});

let happenings_markup = Extra
    .HTML()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('Add Event', 'happenings_markup:add_event'),
        m.callbackButton('Edit Event', 'happenings_markup:edit_event')
    ], { columns: 2 }));

simpleRouter.on('happenings_markup', (ctx) => {
    switch (ctx.state.value) {
        case "add_event":
            ctx.flow.enter('addNewEvent');
            break;
        case "edit_event":
            homeHelper.getEventButtons(ctx);
            break;
        default:
            ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
    };
});

let event_location_markup = Extra
    .HTML()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('Yes', 'event_location_markup:yes_location'),
        m.callbackButton('No', 'event_location_markup:no_location'),
        m.callbackButton('TBC', 'event_location_markup:tbc_location')
    ], { columns: 3 }));

simpleRouter.on('event_location_markup', (ctx) => {
    switch (ctx.state.value) {
        case "yes_location":
            ctx.flow.enter('setRealEventLocation');
            break;
        case "no_location":
            ctx.session.eventlocation = "";
            ctx.replyWithHTML('Is there a timing for this event?', event_time_markup);
            break;
        case "tbc_location":
            ctx.session.eventlocation = "TBC";
            ctx.replyWithHTML('Is there a timing for this event?', event_time_markup);
            break;
        default:
            ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
    };
});

let event_time_markup = Extra
    .HTML()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('Yes', 'event_time_markup:yes_timing'),
        m.callbackButton('No', 'event_time_markup:no_timing'),
        m.callbackButton('TBC', 'event_time_markup:tbc_timing'),
    ], { columns: 3 }));

simpleRouter.on('event_time_markup', (ctx) => {
    switch (ctx.state.value) {
        case "yes_timing":
            ctx.flow.enter('setRealEventTime');
            break;
        case "no_timing":
            ctx.session.eventtime = "";
            homeHelper.updateEvent(ctx);
            ctx.replyWithHTML("Event has been created\nWhat do you want to do next:", public_main_menu_markup);
            break;
        case "tbc_timing":
            ctx.session.eventtime = "TBC";
            homeHelper.updateEvent(ctx);
            ctx.replyWithHTML("Event has been created\nWhat do you want to do next:", public_main_menu_markup);
            break;
        default:
            ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
    };
});

let select_statistics_markup = Extra
    .HTML()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('CG Average Age', 'select_statistics_markup:average_age')
    ], { columns: 1 }));

simpleRouter.on('choose_attendance_person_menu', (ctx) => {
    switch (ctx.state.value) {
        default:
            if (ctx.state.value == "add_new_member") {
                ctx.flow.enter("addNewMember");
            } else {
                ctx.session.messagefrom = ctx.from.username;
                ctx.session.selected_name = ctx.state.value;
                homeHelper.updateAttendance(ctx);
            }
    }
});

simpleRouter.on('select_statistics_markup', (ctx) => {
    switch (ctx.state.value) {
        case "average_age":
            homeHelper.getAverageAge(ctx, function (ageStats) {
                var message = "The average age for <b>" + cg + "</b> is ";
                message = message + ageStats;
                message = message + "\n\n<code>(note: only GI till SCGL are counted in this statistics)</code>";
                ctx.replyWithHTML(message);
            })
            break;
        default:
            ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
    };
});

simpleRouter.on('choose_a_week_menu', (ctx) => {
    switch (ctx.state.value) {
        default:
            ctx.session.selected_week = ctx.state.value;
            homeHelper.getSelectedWeekAttendance(ctx, function (msg) {
                ctx.replyWithHTML(msg);
            });
    }
});

simpleRouter.on('choose_member_menu', (ctx) => {
    switch (ctx.state.value) {
        default:
            ctx.session.selected_member = ctx.state.value;
            homeHelper.getSelectedMember(ctx, function (msg) {
                ctx.editMessageText(msg, member_detail_menu_markup);
            });
    }
});

simpleRouter.on('choose_event_menu', (ctx) => {
    switch (ctx.state.value) {
        default:
            ctx.session.selected_event = ctx.state.value;
            homeHelper.getSelectedEvent(ctx, function (msg) {
                ctx.editMessageText(msg, event_detail_menu_markup);
            });
    }
});
