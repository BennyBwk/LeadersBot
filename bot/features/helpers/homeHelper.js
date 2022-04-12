// Basic Imports
const Telegraf = require('telegraf')
const Promise = require('bluebird');
var cron = require('node-cron');
const moment = require('../../../moment.js');
//DB Imports
const Users = require('../../../models/Users.js');
const Files = require('../../../models/Files.js');
const Attendance = require('../../../models/Attendance.js');
const Weeks = require('../../../models/Weeks.js');
const Birthdays = require('../../../models/Birthdays.js');
const Events = require('../../../models/Events.js');
//Flow & Router Imports
const TelegrafFlow = require('telegraf-flow')
const { Router, Extra, memorySession } = Telegraf
const { WizardScene } = TelegrafFlow
const { Scene } = TelegrafFlow
const { bot } = require('../../bot.js');
const flow = new TelegrafFlow();
//Bot Variables
const superUserTelegramID = "19663241";
const cg = "BE5";

//Create new week in DB - Monday 12mn
let task = cron.schedule('0 0 0 * * 1', function () {
    var weektoadd;
    Weeks.count({}, function (err, count) {
        weektoadd = count + 1;
        var currentyear = moment().format("YYYY");
        var currentmonth = moment().format("MMM");
        var daystosat = 6 - moment().format("d");
        var sat = moment().add(daystosat, 'day').format("D");
        var sun = moment().add(daystosat + 1, 'day').format("D");

        Weeks.findOne({ 'saturday': sat, 'sunday': sun, 'month': currentmonth, 'year': currentyear }, (err, doc) => {
            if (err) throw err;
            if (doc != null) {
                //The week has already been added
            } else {
                Weeks.update(
                    {
                        saturday: sat,
                        sunday: sun,
                        month: currentmonth,
                        year: currentyear
                    },
                    {
                        weekid: weektoadd,
                        saturday: sat,
                        sunday: sun,
                        month: currentmonth,
                        year: currentyear,
                        last_updated: new Date(),
                        last_updatee: "null"
                    },
                    { upsert: true },
                    function (error, doc) {
                        if (error) throw error;
                    }
                );
            }
        })

        var stream = Attendance.find({ 'week': count, 'status': "New Friend" }).stream();
        stream.on('data', function (nf) {
            Birthdays.update(
                {
                    name: nf.name,
                    status: "New Friend"
                },
                {
                    name: nf.name,
                    status: "Integration"
                },
                { upsert: true },
                function (error, doc) {
                    if (error) throw error;
                }
            );
        }).on('error', function (err) {
            if (err) throw error;
        }).on('close', function () {
            //Do nothing
        });

    });

    task.start();
});

module.exports = {

    updateAttendanceReminder: () => {
        var todayday = moment().format("d");
        if (todayday == 4) {
            var stream = Users.find({ "tosend": "true" }).stream();
            stream.on('data', function (user) {
                bot.telegram.sendMessage(user.telegram_id, "It's thursday! Remember to update attendance for the weekend! 😊");
                console.log(user.telegram_id + " - received");
            }).on('error', function (err) {
                if (err) throw error;
            }).on('close', function () {
                setTimeout(function () {
                    process.exit(-1);
                }, 5000);
            });
        } else {
            process.exit(-1);
        }
    },

    sendBirthdayReminder: () => {
        var today = moment().format("DD/MM");
        var stream = Birthdays.find({ "birthdate": { $regex: today } }).stream();
        stream.on('data', function (doc) {
            var currentAge = doc.age + 1;
            var lastdigit = currentAge.toString().split('').pop();
            Birthdays.findOneAndUpdate({ "name": doc.name, "birthdate": doc.birthdate }, { "age": currentAge }, { upsert: false }, function (err2, person) {
                if (err2) throw err;
                var stream = Users.find({ "tosend": "true" }).stream();
                stream.on('data', function (user) {
                    if (lastdigit == 1) {
                        bot.telegram.sendMessage(user.telegram_id, "Today is " + person.name + "'s " + currentAge + "st birthday! 🎉");
                    } else if (lastdigit == 2) {
                        bot.telegram.sendMessage(user.telegram_id, "Today is " + person.name + "'s " + currentAge + "nd birthday! 🎉");
                    } else if (lastdigit == 3) {
                        bot.telegram.sendMessage(user.telegram_id, "Today is " + person.name + "'s " + currentAge + "rd birthday! 🎉");
                    } else {
                        bot.telegram.sendMessage(user.telegram_id, "Today is " + person.name + "'s " + currentAge + "th birthday! 🎉");
                    }
                }).on('error', function (err3) {
                    if (err3) throw error;
                }).on('close', function () {

                });
            });
        }).on('error', function (err) {
            if (err) throw error;
        }).on('close', function () {
            setTimeout(function () {
                process.exit(-1);
            }, 5000);
        });
    },

    checkUserAlreadyExists: (ctx, callback) => {
        Users.findOne({ 'telegram_id': ctx.update.message.from.id }, function (err, userObject) {
            if (userObject != undefined) {
                if (userObject.status == "Admin") {
                    var message = "Your identity has been verified.\nWelcome <b>" + userObject.username + "</b>!\nType /menu to access the main menu.";
                    callback(message);
                } else {
                    bot.telegram.sendMessage(superUserTelegramID, userObject.username + " has registered for this bot.")
                    var message = "You are now registered in the system but only approved users are able to use the functions. Please contact @bennyboon for more information."
                    callback(message);
                }
            } else {
                let userObject = ctx.update.message.from
                Users.update(
                    { telegram_id: userObject.id },
                    {
                        telegram_id: userObject.id,
                        username: userObject.username,
                        status: "Pending",
                        tosend: "false"
                    },
                    { upsert: true },
                    function (error, doc) {
                        if (error) throw error;
                        bot.telegram.sendMessage(superUserTelegramID, userObject.username + " has registered for this bot.")
                        var message = "You are not registered in the system. Please contact @bennyboon for more information."
                        callback(message);
                    }
                );
            }
        });
    },

    getAttendanceNameButtons: (ctx) => {
        var existAttd = [];
        Weeks.findOne({}, {}, { sort: { weekid: -1 } }, function (err, doc) {
            var stream = Attendance.find({ "week": doc.weekid, "svcattending": ctx.session.selected_svc }).stream();
            stream.on('data', function (existing) {
                existAttd.push(existing.name)
            }).on('error', function (err) {
                if (err) throw error;
            }).on('close', function () {
                Birthdays.find({}).exec({}, (err, people) => {
                    if (err) throw err;
                    // Create the button menu
                    let attendance_name_markup = Extra
                        .HTML()
                        .markup((m) => {
                            let attendance_name_buttons = people.filter(function (ppl) {
                                if (!existAttd.includes(ppl.name)) {
                                    return true;
                                } else {
                                    return false;
                                }
                            }).map((ppl) => {
                                return m.callbackButton(ppl.name + '', 'choose_attendance_person_menu:' + ppl.name + '');
                            })

                            attendance_name_buttons.push(m.callbackButton('Add Member', 'choose_attendance_person_menu:add_new_member'));

                            return m.inlineKeyboard(attendance_name_buttons, { columns: 2 })
                        })

                    var currentAttdText = existAttd.join("\n");

                    if (ctx.session.selected_svc == 0) {
                        ctx.editMessageText('Current Adjusted Attendance (' + existAttd.length + ')\n\n' + currentAttdText + '\n\nClick on the names below to add into adjusted attendance', attendance_name_markup)
                    } else {
                        ctx.editMessageText('Current Service ' + ctx.session.selected_svc + ' Attendance (' + existAttd.length + ')\n\n' + currentAttdText + '\n\nClick on the names below to add to service ' + ctx.session.selected_svc + ' attendance', attendance_name_markup)
                    }
                })
            });
        })
    },

    getAnotherAttendanceNameButtons: (ctx) => {
        var existAttd = [];
        Weeks.findOne({}, {}, { sort: { weekid: -1 } }, function (err, doc) {
            var stream = Attendance.find({ "week": doc.weekid, "svcattending": ctx.session.selected_svc }).stream();
            stream.on('data', function (existing) {
                existAttd.push(existing.name)
            }).on('error', function (err) {
                if (err) throw error;
            }).on('close', function () {
                Birthdays.find({}).exec({}, (err, people) => {
                    if (err) throw err;
                    // Create the button menu
                    let attendance_name_markup = Extra
                        .HTML()
                        .markup((m) => {
                            let attendance_name_buttons = people.filter(function (ppl) {
                                if (!existAttd.includes(ppl.name)) {
                                    return true;
                                } else {
                                    return false;
                                }
                            }).map((ppl) => {
                                return m.callbackButton(ppl.name + '', 'choose_attendance_person_menu:' + ppl.name + '');
                            })

                            attendance_name_buttons.push(m.callbackButton('Add Member', 'choose_attendance_person_menu:add_new_member'));

                            return m.inlineKeyboard(attendance_name_buttons, { columns: 2 })
                        })

                    var currentAttdText = existAttd.join("\n");

                    if (ctx.session.selected_svc == 0) {
                        ctx.replyWithHTML('Current Adjusted Attendance (' + existAttd.length + ')\n\n' + currentAttdText + '\n\nClick on the names below to add into adjusted attendance', attendance_name_markup)
                    } else {
                        ctx.replyWithHTML('Current Service ' + ctx.session.selected_svc + ' Attendance (' + existAttd.length + ')\n\n' + currentAttdText + '\n\nClick on the names below to add to service ' + ctx.session.selected_svc + ' attendance', attendance_name_markup)
                    }
                })
            });
        })
    },

    updateAttendance: (ctx) => {
        Birthdays.findOne({ 'name': ctx.session.selected_name }, function (err, person) {
            Weeks.findOne({}, {}, { sort: { _id: -1 } }, function (err, doc) {
                var currentweek = doc.weekid
                Attendance.update(
                    {
                        name: ctx.session.selected_name,
                        svcattending: ctx.session.selected_svc,
                        week: currentweek
                    },
                    {
                        name: ctx.session.selected_name,
                        svcattending: ctx.session.selected_svc,
                        status: person.status,
                        updatedby: ctx.session.messagefrom,
                        week: currentweek,
                        tbc: "false"
                    },
                    { upsert: true },
                    function (error, doc) {
                        if (error) throw error;

                        module.exports.getAttendanceNameButtons(ctx);

                        Weeks.update(
                            {
                                weekid: currentweek
                            },
                            {
                                weekid: currentweek,
                                last_updatee: ctx.session.messagefrom,
                                last_updated: new Date()
                            },
                            { upsert: false },
                            function (error, doc) {
                                if (error) throw error;
                            }
                        );

                    }
                );
            });
        });
    },

    addNewMemberAttendance: (ctx) => {
        Weeks.findOne({}, {}, { sort: { _id: -1 } }, function (err, doc) {
            var currentweek = doc.weekid
            Attendance.update(
                {
                    name: ctx.session.name,
                    svcattending: ctx.session.selected_svc,
                    week: currentweek
                },
                {
                    name: ctx.session.name,
                    svcattending: ctx.session.selected_svc,
                    status: ctx.session.selected_status,
                    updatedby: ctx.session.messagefrom,
                    week: currentweek,
                    tbc: "false"
                },
                { upsert: true },
                function (error, doc) {
                    if (error) throw error;

                    module.exports.getAnotherAttendanceNameButtons(ctx);

                    Weeks.update(
                        {
                            weekid: currentweek
                        },
                        {
                            weekid: currentweek,
                            last_updatee: ctx.session.messagefrom,
                            last_updated: new Date()
                        },
                        { upsert: false },
                        function (error, doc) {
                            if (error) throw error;
                        }
                    );

                }
            );
        });

        Birthdays.update(
            {
                name: ctx.session.name,
                status: ctx.session.selected_status,
            },
            {
                name: ctx.session.name,
                birthdate: 'undefined',
                age: 0,
                status: ctx.session.selected_status,
            },
            { upsert: true },
            function (error, doc) {
                if (error) throw error;
            }
        );
    },

    getAttendance: (ctx, callback) => {
        Weeks.findOne({}, {}, { sort: { weekid: -1 } }, function (err, doc) {
            var lastupdated = doc.last_updated.split(" ");
            var lastupdatedDay = lastupdated[0]; var lastupdatedMth = lastupdated[1]; var lastupdatedDate = lastupdated[2]; var lastupdatedYear = lastupdated[3];
            var lastupdatedRawTime = lastupdated[4].split(":");
            var RawTimeHour = lastupdatedRawTime[0];
            var RawTimeMark = "AM";
            if (RawTimeHour === 12) {
                RawTimeMark = "PM";
            } else if (RawTimeHour > 12) {
                RawTimeMark = "PM";
                RawTimeHour = RawTimeHour - 12;
            }
            var RawTimeMin = lastupdatedRawTime[1];
            var lastupdatedTime = RawTimeHour + ":" + RawTimeMin + " " + RawTimeMark;
            var lastupdatee = doc.last_updatee; var currentweek = doc.weekid;
            var svc1Rnames = ""; var svc1Rcount = 0; var svc1count = 0;
            var svc1Inames = ""; var svc1Icount = 0; var svc2count = 0;
            var svc1Nnames = ""; var svc1Ncount = 0; var svc3count = 0;
            var svc1Gnames = ""; var svc1Gcount = 0; var attdmsg = "";
            var svc2Rnames = ""; var svc2Rcount = 0; var svcAnames = "";
            var svc2Inames = ""; var svc2Icount = 0; var svcAcount = 0;
            var svc2Nnames = ""; var svc2Ncount = 0; var totalCount = 0;
            var svc2Gnames = ""; var svc2Gcount = 0;
            var svc3Rnames = ""; var svc3Rcount = 0;
            var svc3Inames = ""; var svc3Icount = 0;
            var svc3Nnames = ""; var svc3Ncount = 0;
            var svc3Gnames = ""; var svc3Gcount = 0;
            var svc1ZMnames = ""; var svc2ZMnames = ""; var svc3ZMnames = "";
            var svc1CGLnames = ""; var svc2CGLnames = ""; var svc3CGLnames = "";
            var svc1TLnames = ""; var svc2TLnames = ""; var svc3TLnames = "";
            var svc1GInames = ""; var svc2GInames = ""; var svc3GInames = "";
            var nameList = [];
            var stream = Attendance.find({}).stream();
            stream.on('data', function (doc) {
                if (doc.week == currentweek) {
                    if (doc.svcattending == "0") {
                        svcAnames = svcAnames + doc.name + "\n";
                        svcAcount = svcAcount + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.svcattending == "1") {
                        if (doc.status == "Zone Manager" || doc.status == "Zone Leader") {
                            svc1ZMnames = svc1ZMnames + doc.name + "\n";
                            svc1Rcount = svc1Rcount + 1;
                            svc1count = svc1count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "CGL" || doc.status == "PCGL" || doc.status == "ACGL") {
                            svc1CGLnames = svc1CGLnames + doc.name + "\n";
                            svc1Rcount = svc1Rcount + 1;
                            svc1count = svc1count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "TL" || doc.status == "PTL") {
                            svc1TLnames = svc1TLnames + doc.name + "\n";
                            svc1Rcount = svc1Rcount + 1;
                            svc1count = svc1count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "Regular") {
                            svc1Rnames = svc1Rnames + doc.name + "\n";
                            svc1Rcount = svc1Rcount + 1;
                            svc1count = svc1count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "Good Integration") {
                            svc1GInames = svc1GInames + doc.name + "\n";
                            svc1Icount = svc1Icount + 1;
                            svc1count = svc1count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "Integration") {
                            svc1Inames = svc1Inames + doc.name + "\n";
                            svc1Icount = svc1Icount + 1;
                            svc1count = svc1count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "New Friend") {
                            svc1Nnames = svc1Nnames + doc.name + "\n";
                            svc1Ncount = svc1Ncount + 1;
                            svc1count = svc1count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "Guest") {
                            svc1Gnames = svc1Gnames + doc.name + "\n";
                            svc1Gcount = svc1Gcount + 1;
                            svc1count = svc1count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        }
                    } else if (doc.svcattending == "2") {
                        if (doc.status == "Zone Manager" || doc.status == "Zone Leader") {
                            svc2ZMnames = svc2ZMnames + doc.name + "\n";
                            svc2Rcount = svc2Rcount + 1;
                            svc2count = svc2count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "CGL" || doc.status == "PCGL" || doc.status == "ACGL") {
                            svc2CGLnames = svc2CGLnames + doc.name + "\n";
                            svc2Rcount = svc2Rcount + 1;
                            svc2count = svc2count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "TL" || doc.status == "PTL") {
                            svc2TLnames = svc2TLnames + doc.name + "\n";
                            svc2Rcount = svc2Rcount + 1;
                            svc2count = svc2count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "Regular") {
                            svc2Rnames = svc2Rnames + doc.name + "\n";
                            svc2Rcount = svc2Rcount + 1;
                            svc2count = svc2count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "Good Integration") {
                            svc2GInames = svc2GInames + doc.name + "\n";
                            svc2Icount = svc2Icount + 1;
                            svc2count = svc2count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "Integration") {
                            svc2Inames = svc2Inames + doc.name + "\n";
                            svc2Icount = svc2Icount + 1;
                            svc2count = svc2count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "New Friend") {
                            svc2Nnames = svc2Nnames + doc.name + "\n";
                            svc2Ncount = svc2Ncount + 1;
                            svc2count = svc2count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "Guest") {
                            svc2Gnames = svc2Gnames + doc.name + "\n";
                            svc2Gcount = svc2Gcount + 1;
                            svc2count = svc2count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        }
                    } else if (doc.svcattending == "3") {
                        if (doc.status == "Zone Manager" || doc.status == "Zone Leader") {
                            svc3ZMnames = svc3ZMnames + doc.name + "\n";
                            svc3Rcount = svc3Rcount + 1;
                            svc3count = svc3count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "CGL" || doc.status == "PCGL" || doc.status == "ACGL") {
                            svc3CGLnames = svc3CGLnames + doc.name + "\n";
                            svc3Rcount = svc3Rcount + 1;
                            svc3count = svc3count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "TL" || doc.status == "PTL") {
                            svc3TLnames = svc3TLnames + doc.name + "\n";
                            svc3Rcount = svc3Rcount + 1;
                            svc3count = svc3count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "Regular") {
                            svc3Rnames = svc3Rnames + doc.name + "\n";
                            svc3Rcount = svc3Rcount + 1;
                            svc3count = svc3count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "Good Integration") {
                            svc3GInames = svc3GInames + doc.name + "\n";
                            svc3Icount = svc3Icount + 1;
                            svc3count = svc3count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "Integration") {
                            svc3Inames = svc3Inames + doc.name + "\n";
                            svc3Icount = svc3Icount + 1;
                            svc3count = svc3count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "New Friend") {
                            svc3Nnames = svc3Nnames + doc.name + "\n";
                            svc3Ncount = svc3Ncount + 1;
                            svc3count = svc3count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        } else if (doc.status == "Guest") {
                            svc3Gnames = svc3Gnames + doc.name + "\n";
                            svc3Gcount = svc3Gcount + 1;
                            svc3count = svc3count + 1;
                            if (!nameList.includes(doc.name)) {
                                totalCount = totalCount + 1;
                                nameList.push(doc.name);
                            }
                        }
                    }
                }
            }).on('error', function (err) {
                if (err) throw error;
                ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
            }).on('close', function () {
                var lastUpdatedInfo = "";
                if (totalCount != 0) {
                    Weeks.findOne({ 'weekid': currentweek }, (err, doc) => {
                        if (err) throw error;
                        var month = doc.month;
                        var sat = doc.saturday;
                        var sun = doc.sunday;
                        var year = doc.year;
                        attdmsg = cg + "'s Attendance for this week\n" + sat + "-" + sun + " " + month + " " + year + "\n<b>Total Unique Attendance: " + totalCount + "</b>\n\n"
                        if (svc1count > 0) {
                            attdmsg = attdmsg + "<b>Service 1 (" + svc1count + ")\nLeaders/Regulars (" + svc1Rcount + ")</b>\n" + svc1ZMnames + svc1CGLnames + svc1TLnames + svc1Rnames + "\n"
                        }
                        if (svc1Icount > 0) {
                            attdmsg = attdmsg + "<b>Integrations (" + svc1Icount + ")</b>\n" + svc1GInames + svc1Inames + "\n"
                        }
                        if (svc1Ncount > 0) {
                            attdmsg = attdmsg + "<b>New Friends (" + svc1Ncount + ")</b>\n" + svc1Nnames + "\n"
                        }
                        if (svc1Gcount > 0) {
                            attdmsg = attdmsg + "<b>Guests (" + svc1Gcount + ")</b>\n" + svc1Gnames + "\n"
                        }

                        if (svc2count > 0) {
                            if (svc1count > 0) {
                                attdmsg = attdmsg + "-----\n<b>Service 2 (" + svc2count + ")</b>\n"
                            } else {
                                attdmsg = attdmsg + "<b>Service 2 (" + svc2count + ")</b>\n"
                            }
                        }
                        if (svc2Rcount > 0) {
                            attdmsg = attdmsg + "<b>Leaders/Regulars (" + svc2Rcount + ")</b>\n" + svc2ZMnames + svc2CGLnames + svc2TLnames + svc2Rnames + "\n"
                        }
                        if (svc2Icount > 0) {
                            attdmsg = attdmsg + "<b>Integrations (" + svc2Icount + ")</b>\n" + svc2GInames + svc2Inames + "\n"
                        }
                        if (svc2Ncount > 0) {
                            attdmsg = attdmsg + "<b>New Friends (" + svc2Ncount + ")</b>\n" + svc2Nnames + "\n"
                        }
                        if (svc2Gcount > 0) {
                            attdmsg = attdmsg + "<b>Guests (" + svc2Gcount + ")</b>\n" + svc2Gnames + "\n"
                        }

                        if (svc3count > 0) {
                            if (svc2count > 0 || svc1count > 0) {
                                attdmsg = attdmsg + "-----\n<b>Service 3 (" + svc3count + ")</b>\n"
                            } else {
                                attdmsg = attdmsg + "<b>Service 3 (" + svc3count + ")</b>\n"
                            }
                        }
                        if (svc3Rcount > 0) {
                            attdmsg = attdmsg + "<b>Leaders/Regulars (" + svc3Rcount + ")</b>\n" + svc3ZMnames + svc3CGLnames + svc3TLnames + svc3Rnames + "\n"
                        }
                        if (svc3Icount > 0) {
                            attdmsg = attdmsg + "<b>Integrations (" + svc3Icount + ")</b>\n" + svc3GInames + svc3Inames + "\n"
                        }
                        if (svc3Ncount > 0) {
                            attdmsg = attdmsg + "<b>New Friends (" + svc3Ncount + ")</b>\n" + svc3Nnames + "\n"
                        }
                        if (svc3Gcount > 0) {
                            attdmsg = attdmsg + "<b>Guests (" + svc3Gcount + ")</b>\n" + svc3Gnames + "\n"
                        }

                        if (svcAcount > 0) {
                            attdmsg = attdmsg + "-----\n<b>Adjusted (" + svcAcount + ")</b>\n" + svcAnames + "\n"
                        }
                        lastUpdatedInfo = "Last Updated By <b>" + lastupdatee + "</b> (" + lastupdatedDay + " " + lastupdatedTime + ")";
                        attdmsg = attdmsg + lastUpdatedInfo;
                        callback(attdmsg)
                    })
                } else {
                    attdmsg = "The attendance for this week has not been updated yet"
                    callback(attdmsg)
                }
            });
        });
    },

    checkIfAdmin: (ctx, callback) => {
        Users.findOne({ 'telegram_id': ctx.update.message.from.id }, function (err, userObject) {
            callback(userObject);
        });
    },

    removeAttendance: (ctx, callback) => {
        Weeks.count({}, function (err, currentweek) {
            if (err) throw error;
            if (ctx.update.message.text === '/remove') {
                var message = "Remove a person from this week's attendance\n<b>(e.g. /remove Benny Boon)</b>\n<code>Note: Case Sensitive</code>"
                callback(message);
            } else {
                var person = ctx.update.message.text.replace('/remove ', '');
                Attendance.remove({ 'week': currentweek, 'name': person }, function (err, removed) {
                    if (err) throw err;
                    if (removed.result.n === 0) {
                        var message = person + " was not in this week's attendance"
                        callback(message);
                    } else {
                        var message = person + " has been removed from this week's attendance"
                        callback(message);

                        Weeks.update(
                            {
                                weekid: currentweek
                            },
                            {
                                weekid: currentweek,
                                last_updatee: ctx.message.from.username,
                                last_updated: new Date()
                            },
                            { upsert: false },
                            function (error, doc) {
                                if (error) throw error;
                            }
                        );

                    }
                });
            }
        })
    },

    removeAll: (ctx, callback) => {
        Weeks.count({}, function (err, currentweek) {
            if (err) throw error;
            Attendance.remove({ 'week': currentweek }, function (err, removed) {
                if (err) throw err;
                if (removed.result.n === 0) {
                    var message = "The attendance for this week has not been updated yet!"
                    callback(message);
                } else {
                    var message = "All attendance for this week have been removed successfully"
                    callback(message);

                    Weeks.update(
                        {
                            weekid: currentweek
                        },
                        {
                            weekid: currentweek,
                            last_updatee: ctx.message.from.username,
                            last_updated: new Date()
                        },
                        { upsert: false },
                        function (error, doc) {
                            if (error) throw error;
                        }
                    );

                }
            });
        })
    },

    getBirthdayList: (ctx, callback) => {
        var birthdaymsg = cg + " Birthday List\n\n"
        var daymark; var month;
        var birthdaydataArray = [];
        var stream = Birthdays.find({ birthdate: { $ne: 'undefined' } }).stream();
        stream.on('data', function (doc) {
            var birthdatearray = doc.birthdate.split("/");
            var birthdateday = birthdatearray[0] * 1;
            var birthdatemonth = birthdatearray[1] * 1;
            var birthdateyear = birthdatearray[2] * 1;

            if (birthdatemonth < 12) {
                birthdatemonth = birthdatemonth;
            } else {
                birthdatemonth = 0;
            }

            var a = moment([moment().format('YYYY'), birthdatemonth, birthdateday]);
            var b = moment([moment().format('YYYY'), moment().format('MM'), moment().format('DD')]);

            var diffNum = b.diff(a, 'days');

            if (birthdatemonth == 1 || birthdatemonth == 3 || birthdatemonth == 5 || birthdatemonth == 7 || birthdatemonth == 8 || birthdatemonth == 10 || birthdatemonth == 12) {
                diffNum += 1;
            }

            //Fix date issue
            /* if (moment().format('MM') == 10) {
                diffNum += 1;
            } */

            //Fix leap year issue
            /* if diffNum < 0 {
              if ((moment().format('YYYY') + 1) % 4 = 0) {
                  if ((moment().format('YYYY') + 1) % 100 = 0) {
                      if ((moment().format('YYYY') + 1) % 400 = 0) {
                          diffNum += 1;
                      }
                  } else {
                      diffNum += 1;
                  }
              }
            } */

            if (diffNum > 0) {
                var currentAge = 365 - diffNum;
            } else {
                var currentAge = diffNum * -1;
            }

            birthdaydataArray.push([doc.name, doc.birthdate, currentAge]);
        }).on('error', function (err) {
            if (err) throw error;
            ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
        }).on('close', function () {
            birthdaydataArray.sort(sortFunction);
            function sortFunction(a, b) {
                if (a[2] === b[2]) {
                    return 0;
                } else {
                    return (a[2] < b[2]) ? -1 : 1;
                }
            }

            birthdaydataArray.forEach(function (current_value) {
                var birthdatearray = current_value[1].split("/");
                var birthdateday = birthdatearray[0] * 1;
                var birthdatemonth = birthdatearray[1] * 1;
                var birthdateyear = birthdatearray[2] * 1;

                if (birthdatemonth == 1) {
                    month = "Jan"
                } else if (birthdatemonth == 2) {
                    month = "Feb"
                } else if (birthdatemonth == 3) {
                    month = "Mar"
                } else if (birthdatemonth == 4) {
                    month = "Apr"
                } else if (birthdatemonth == 5) {
                    month = "May"
                } else if (birthdatemonth == 6) {
                    month = "Jun"
                } else if (birthdatemonth == 7) {
                    month = "Jul"
                } else if (birthdatemonth == 8) {
                    month = "Aug"
                } else if (birthdatemonth == 9) {
                    month = "Sep"
                } else if (birthdatemonth == 10) {
                    month = "Oct"
                } else if (birthdatemonth == 11) {
                    month = "Nov"
                } else if (birthdatemonth == 12) {
                    month = "Dec"
                }

                if (current_value[2] == 0) {
                    birthdaymsg = birthdaymsg + current_value[0] + " - Today!\n"
                } else {
                    birthdaymsg = birthdaymsg + current_value[0] + " - " + birthdateday + " " + month + " " + birthdateyear + " (D-" + current_value[2] + ")\n"
                }
            });

            callback(birthdaymsg);
        });
    },

    getEvents: (ctx, callback) => {
        var msg = "<b>" + cg + " Upcoming Events</b>\n\n"
        var eventDataArray = [];
        var stream = Events.find({}).stream();
        stream.on('data', function (doc) {
            var eventdatearray = doc.date.split("/");
            var eventdateday = eventdatearray[0] * 1;
            var eventdatemonth = eventdatearray[1] * 1;
            var eventdateyear = eventdatearray[2] * 1;

            if (eventdatemonth < 12) {
                eventdatemonth = eventdatemonth;
            } else {
                eventdatemonth = 0;
            }

            var a = moment([eventdateyear, eventdatemonth, eventdateday]);
            var b = moment([moment().format('YYYY'), moment().format('MM'), moment().format('DD')]);
            var diffNum = a.diff(b, 'days');

            if (eventdatemonth == 1 || eventdatemonth == 3 || eventdatemonth == 5 || eventdatemonth == 7 || eventdatemonth == 8 || eventdatemonth == 10 || eventdatemonth == 12) {
                diffNum -= 1;
            }

            if (diffNum >= 0 && diffNum < 15) {
                eventDataArray.push([doc.name, doc.date, doc.location, doc.time, diffNum]);
            }
        }).on('error', function (err) {
            if (err) throw error;
            ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
        }).on('close', function () {
            eventDataArray.sort(sortFunction);
            function sortFunction(a, b) {
                if (a[4] === b[4]) {
                    return 0;
                } else {
                    return (a[4] < b[4]) ? -1 : 1;
                }
            }

            var eventCount = 0;
            eventDataArray.forEach(function (info) {
                eventCount += 1;
                if (eventCount < 6) {
                    msg = msg + "<b>" + eventCount + ". " + info[0] + "</b>\n";
                    msg = msg + "    Date: " + info[1] + " (" + moment(info[1], 'DD/MM/YYYY').format('dddd') + ")\n";
                    if (info[2].length != 0) {
                        msg = msg + "    Location: " + info[2] + "\n";
                    }
                    if (info[3].length != 0) {
                        msg = msg + "    Time: " + info[3] + "\n";
                    }
                    msg = msg + "\n";
                }
            });

            callback(msg);
        });
    },

    updateEvent: (ctx) => {
        Events.update(
            {
                name: ctx.session.eventname
            },
            {
                name: ctx.session.eventname,
                date: ctx.session.eventdate,
                time: ctx.session.eventtime,
                location: ctx.session.eventlocation,
                lastUpdatee: ctx.session.messagefrom,
                updatedDateTime: new Date()
            },
            { upsert: true },
            function (error, doc) {
                if (error) throw error;
                var message = ctx.session.messagefrom + " has added an event - " + ctx.session.eventname;

                var stream = Users.find({ "tosend": "true" }).stream();
                stream.on('data', function (user) {
                    bot.telegram.sendMessage(user.telegram_id, message);
                }).on('error', function (err3) {
                    if (err3) throw error;
                }).on('close', function () {

                });
            }
        );
    },

    getEventButtons: (ctx) => {
        Events.find({}).exec({}, (err, events) => {
            if (err) throw err;
            // Create the button menu
            let choose_event_menu_markup = Extra
                .HTML()
                .markup((m) => {
                    let choose_event_menu_buttons = events.filter(function (event) {
                        var eventdatearray = event.date.split("/");
                        var eventdateday = eventdatearray[0] * 1;
                        var eventdatemonth = eventdatearray[1] * 1;
                        var eventdateyear = eventdatearray[2] * 1;

                        if (eventdatemonth < 12) {
                            eventdatemonth = eventdatemonth;
                        } else {
                            eventdatemonth = 0;
                        }

                        var a = moment([eventdateyear, eventdatemonth, eventdateday]);
                        var b = moment([moment().format('YYYY'), moment().format('MM'), moment().format('DD')]);
                        var diffNum = a.diff(b, 'days');

                        if (eventdatemonth == 1 || eventdatemonth == 3 || eventdatemonth == 5 || eventdatemonth == 7 || eventdatemonth == 8 || eventdatemonth == 10 || eventdatemonth == 12) {
                            diffNum -= 1;
                        }

                        if (diffNum >= 0) {
                            return true;
                        } else {
                            return false;
                        }
                    }).map((event) => {
                        return m.callbackButton(event.name + '', 'choose_event_menu:' + event._id + '');
                    })
                    return m.inlineKeyboard(choose_event_menu_buttons, { columns: 1 })
                })
            ctx.editMessageText('Select an event:', choose_event_menu_markup)
        })
    },

    getSelectedEvent: (ctx, callback) => {
        Events.findOne({ "_id": ctx.session.selected_event }).exec({}, (err, event) => {
            if (err) throw err;
            var msg = "<b>" + event.name + "</b>\n";
            msg = msg + "Date: " + event.date + " (" + moment(event.date, 'DD/MM/YYYY').format('dddd') + ")";
            if (event.location != "") {
                msg = msg + "\nLocation: " + event.location;
            }
            if (event.time != "") {
                msg = msg + "\nTime: " + event.time;
            }
            callback(msg);
        })
    },

    editEventName: (ctx) => {
        var eventID = ctx.session.selected_event;
        Events.findOneAndUpdate(
            {
                '_id': eventID
            },
            {
                'name': ctx.session.updatedname,
                'lastUpdatee': ctx.session.messagefrom,
                'updatedDateTime': new Date()
            },
            { upsert: false },
            function (err, doc) {
                if (err) throw err;
            }
        );
    },

    editEventDate: (ctx) => {
        var eventID = ctx.session.selected_event;
        Events.findOneAndUpdate({ '_id': eventID }, { 'date': ctx.session.updatedeventdate, 'lastUpdatee': ctx.session.messagefrom, 'updatedDateTime': new Date() }, { upsert: false }, function (err, doc) {
            if (err) throw err;
        });
    },

    editEventLocation: (ctx) => {
        var eventID = ctx.session.selected_event;
        Events.findOneAndUpdate({ '_id': eventID }, { 'location': ctx.session.updatedlocation, 'lastUpdatee': ctx.session.messagefrom, 'updatedDateTime': new Date() }, { upsert: false }, function (err, doc) {
            if (err) throw err;
        });
    },

    editEventTime: (ctx) => {
        var eventID = ctx.session.selected_event;
        Events.findOneAndUpdate({ '_id': eventID }, { 'time': ctx.session.updatedtime, 'lastUpdatee': ctx.session.messagefrom, 'updatedDateTime': new Date() }, { upsert: false }, function (err, doc) {
            if (err) throw err;
        });
    },

    removeEvent: (ctx) => {
        var eventID = ctx.session.selected_event;
        Events.deleteOne({ '_id': eventID }, function (err, result) {
            if (err) throw err;
        });
    },

    addSoul: (ctx, callback) => {
        Birthdays.update(
            {
                name: ctx.session.name,
                status: ctx.session.selected_status,
            },
            {
                name: ctx.session.name,
                birthdate: 'undefined',
                age: 0,
                status: ctx.session.selected_status,
            },
            { upsert: true },
            function (error, doc) {
                if (error) throw error;
                var message = ctx.session.name + " have been added to the database";
                callback(message);
            }
        );
    },

    addWeek: (ctx, callback) => {
        var weektoadd;

        Weeks.count({}, function (err, count) {
            weektoadd = count + 1;
            var currentyear = moment().format("YYYY");
            var currentmonth = moment().format("MMM");
            var daystosat = 6 - moment().format("d");
            var sat = moment().add(daystosat, 'day').format("D");
            var sun = moment().add(daystosat + 1, 'day').format("D");

            Weeks.findOne({ 'saturday': sat, 'sunday': sun, 'month': currentmonth, 'year': currentyear }, (err, doc) => {
                if (err) throw err;
                if (doc != null) {
                    var message = "This week has already been created in the database"
                    callback(message);
                } else {
                    Weeks.update(
                        {
                            saturday: sat,
                            sunday: sun,
                            month: currentmonth,
                            year: currentyear
                        },
                        {
                            weekid: weektoadd,
                            saturday: sat,
                            sunday: sun,
                            month: currentmonth,
                            year: currentyear,
                            last_updated: new Date(),
                            last_updatee: "null"
                        },
                        { upsert: true },
                        function (error, doc) {
                            if (error) throw error;
                            var message = "This week has been added to the database successfully"
                            callback(message);
                        }
                    );
                }
            })
        });
    },

    pastAttendance: (ctx) => {
        Weeks.count({}, function (err, currentweek) {
            if (err) throw error;
            let choose_week_buttons = []
            // Turn all of the challenges into buttons
            Weeks.find({}).sort({ weekid: 'desc' }).limit(10).exec({}, (err, weeks) => {
                if (err) throw err;
                // Create the button menu
                let choose_week_menu_markup = Extra
                    .HTML()
                    .markup((m) => {
                        let choose_week_menu_buttons = weeks.map((week) => {
                            var pastWeekCount = currentweek - week.weekid;
                            if (pastWeekCount === 0) {
                                return m.callbackButton("Current Week", 'choose_a_week_menu:' + week.weekid + '')
                            } else if (pastWeekCount === 1) {
                                return m.callbackButton("Last Week", 'choose_a_week_menu:' + week.weekid + '')
                            } else {
                                return m.callbackButton(week.saturday + "-" + week.sunday + " " + week.month, 'choose_a_week_menu:' + week.weekid + '')
                            }
                        })
                        return m.inlineKeyboard(choose_week_menu_buttons, { columns: 2 })
                    })
                ctx.editMessageText('Here are the attendance up to the past 10 weeks:', choose_week_menu_markup)
            })
        });
    },

    getSelectedWeekAttendance: (ctx, callback) => {
        var currentweek = ctx.session.selected_week
        var weeksAgo; var sat; var sun; var month; var year;
        var svc1Rnames = ""; var svc1Rcount = 0; var svc1count = 0;
        var svc1Inames = ""; var svc1Icount = 0; var svc2count = 0;
        var svc1Nnames = ""; var svc1Ncount = 0; var svc3count = 0;
        var svc1Gnames = ""; var svc1Gcount = 0; var attdmsg = "";
        var svc2Rnames = ""; var svc2Rcount = 0; var svcAcount = 0;
        var svc2Inames = ""; var svc2Icount = 0; var svcAnames = "";
        var svc2Nnames = ""; var svc2Ncount = 0; var totalCount = 0;
        var svc2Gnames = ""; var svc2Gcount = 0;
        var svc3Rnames = ""; var svc3Rcount = 0;
        var svc3Inames = ""; var svc3Icount = 0;
        var svc3Nnames = ""; var svc3Ncount = 0;
        var svc3Gnames = ""; var svc3Gcount = 0;
        var svc1ZMnames = ""; var svc2ZMnames = ""; var svc3ZMnames = "";
        var svc1CGLnames = ""; var svc2CGLnames = ""; var svc3CGLnames = "";
        var svc1TLnames = ""; var svc2TLnames = ""; var svc3TLnames = "";
        var svc1GInames = ""; var svc2GInames = ""; var svc3GInames = "";
        var nameList = [];
        var stream = Attendance.find({}).stream();
        stream.on('data', function (doc) {
            if (doc.week == currentweek) {
                if (doc.svcattending == "0") {
                    svcAnames = svcAnames + doc.name + "\n";
                    svcAcount = svcAcount + 1;
                    if (!nameList.includes(doc.name)) {
                        totalCount = totalCount + 1;
                        nameList.push(doc.name);
                    }
                } else if (doc.svcattending == "1") {
                    if (doc.status == "Zone Manager" || doc.status == "Zone Leader") {
                        svc1ZMnames = svc1ZMnames + doc.name + "\n";
                        svc1Rcount = svc1Rcount + 1;
                        svc1count = svc1count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "CGL" || doc.status == "PCGL" || doc.status == "ACGL") {
                        svc1CGLnames = svc1CGLnames + doc.name + "\n";
                        svc1Rcount = svc1Rcount + 1;
                        svc1count = svc1count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "TL" || doc.status == "PTL") {
                        svc1TLnames = svc1TLnames + doc.name + "\n";
                        svc1Rcount = svc1Rcount + 1;
                        svc1count = svc1count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "Regular") {
                        svc1Rnames = svc1Rnames + doc.name + "\n";
                        svc1Rcount = svc1Rcount + 1;
                        svc1count = svc1count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "Good Integration") {
                        svc1GInames = svc1GInames + doc.name + "\n";
                        svc1Icount = svc1Icount + 1;
                        svc1count = svc1count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "Integration") {
                        svc1Inames = svc1Inames + doc.name + "\n";
                        svc1Icount = svc1Icount + 1;
                        svc1count = svc1count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "New Friend") {
                        svc1Nnames = svc1Nnames + doc.name + "\n";
                        svc1Ncount = svc1Ncount + 1;
                        svc1count = svc1count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "Guest") {
                        svc1Gnames = svc1Gnames + doc.name + "\n";
                        svc1Gcount = svc1Gcount + 1;
                        svc1count = svc1count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    }
                } else if (doc.svcattending == "2") {
                    if (doc.status == "Zone Manager" || doc.status == "Zone Leader") {
                        svc2ZMnames = svc2ZMnames + doc.name + "\n";
                        svc2Rcount = svc2Rcount + 1;
                        svc2count = svc2count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "CGL" || doc.status == "PCGL" || doc.status == "ACGL") {
                        svc2CGLnames = svc2CGLnames + doc.name + "\n";
                        svc2Rcount = svc2Rcount + 1;
                        svc2count = svc2count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "TL" || doc.status == "PTL") {
                        svc2TLnames = svc2TLnames + doc.name + "\n";
                        svc2Rcount = svc2Rcount + 1;
                        svc2count = svc2count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "Regular") {
                        svc2Rnames = svc2Rnames + doc.name + "\n";
                        svc2Rcount = svc2Rcount + 1;
                        svc2count = svc2count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "Good Integration") {
                        svc2GInames = svc2GInames + doc.name + "\n";
                        svc2Icount = svc2Icount + 1;
                        svc2count = svc2count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "Integration") {
                        svc2Inames = svc2Inames + doc.name + "\n";
                        svc2Icount = svc2Icount + 1;
                        svc2count = svc2count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "New Friend") {
                        svc2Nnames = svc2Nnames + doc.name + "\n";
                        svc2Ncount = svc2Ncount + 1;
                        svc2count = svc2count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "Guest") {
                        svc2Gnames = svc2Gnames + doc.name + "\n";
                        svc2Gcount = svc2Gcount + 1;
                        svc2count = svc2count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    }
                } else if (doc.svcattending == "3") {
                    if (doc.status == "Zone Manager" || doc.status == "Zone Leader") {
                        svc3ZMnames = svc3ZMnames + doc.name + "\n";
                        svc3Rcount = svc3Rcount + 1;
                        svc3count = svc3count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "CGL" || doc.status == "PCGL" || doc.status == "ACGL") {
                        svc3CGLnames = svc3CGLnames + doc.name + "\n";
                        svc3Rcount = svc3Rcount + 1;
                        svc3count = svc3count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "TL" || doc.status == "PTL") {
                        svc3TLnames = svc3TLnames + doc.name + "\n";
                        svc3Rcount = svc3Rcount + 1;
                        svc3count = svc3count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "Regular") {
                        svc3Rnames = svc3Rnames + doc.name + "\n";
                        svc3Rcount = svc3Rcount + 1;
                        svc3count = svc3count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "Good Integration") {
                        svc3GInames = svc3GInames + doc.name + "\n";
                        svc3Icount = svc3Icount + 1;
                        svc3count = svc3count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "Integration") {
                        svc3Inames = svc3Inames + doc.name + "\n";
                        svc3Icount = svc3Icount + 1;
                        svc3count = svc3count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "New Friend") {
                        svc3Nnames = svc3Nnames + doc.name + "\n";
                        svc3Ncount = svc3Ncount + 1;
                        svc3count = svc3count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    } else if (doc.status == "Guest") {
                        svc3Gnames = svc3Gnames + doc.name + "\n";
                        svc3Gcount = svc3Gcount + 1;
                        svc3count = svc3count + 1;
                        if (!nameList.includes(doc.name)) {
                            totalCount = totalCount + 1;
                            nameList.push(doc.name);
                        }
                    }
                }
            }
        }).on('error', function (err) {
            if (err) throw error;
            ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
        }).on('close', function () {
            var lastUpdatedInfo = "";
            if (totalCount != 0) {
                Weeks.count({}, function (err, weekCount) {
                    if (err) throw error;
                    Weeks.findOne({ 'weekid': currentweek }, (err, doc) => {
                        if (err) throw error;
                        month = doc.month;
                        sat = doc.saturday;
                        sun = doc.sunday;
                        year = doc.year;
                        attdmsg = cg + "'s Attendance\n" + sat + "-" + sun + " " + month + " " + year + "\n<b>Total Unique Attendance: " + totalCount + "</b>\n\n"

                        if (svc1count > 0) {
                            attdmsg = attdmsg + "<b>Service 1 (" + svc1count + ")\nLeaders/Regulars (" + svc1Rcount + ")</b>\n" + svc1ZMnames + svc1CGLnames + svc1TLnames + svc1Rnames + "\n"
                        }
                        if (svc1Icount > 0) {
                            attdmsg = attdmsg + "<b>Integrations (" + svc1Icount + ")</b>\n" + svc1GInames + svc1Inames + "\n"
                        }
                        if (svc1Ncount > 0) {
                            attdmsg = attdmsg + "<b>New Friends (" + svc1Ncount + ")</b>\n" + svc1Nnames + "\n"
                        }
                        if (svc1Gcount > 0) {
                            attdmsg = attdmsg + "<b>Guests (" + svc1Gcount + ")</b>\n" + svc1Gnames + "\n"
                        }

                        if (svc2count > 0) {
                            if (svc1count > 0) {
                                attdmsg = attdmsg + "-----\n<b>Service 2 (" + svc2count + ")</b>\n"
                            } else {
                                attdmsg = attdmsg + "<b>Service 2 (" + svc2count + ")</b>\n"
                            }
                        }
                        if (svc2Rcount > 0) {
                            attdmsg = attdmsg + "<b>Leaders/Regulars (" + svc2Rcount + ")</b>\n" + svc2ZMnames + svc2CGLnames + svc2TLnames + svc2Rnames + "\n"
                        }
                        if (svc2Icount > 0) {
                            attdmsg = attdmsg + "<b>Integrations (" + svc2Icount + ")</b>\n" + svc2GInames + svc2Inames + "\n"
                        }
                        if (svc2Ncount > 0) {
                            attdmsg = attdmsg + "<b>New Friends (" + svc2Ncount + ")</b>\n" + svc2Nnames + "\n"
                        }
                        if (svc2Gcount > 0) {
                            attdmsg = attdmsg + "<b>Guests (" + svc2Gcount + ")</b>\n" + svc2Gnames + "\n"
                        }

                        if (svc3count > 0) {
                            if (svc2count > 0 || svc1count > 0) {
                                attdmsg = attdmsg + "-----\n<b>Service 3 (" + svc3count + ")</b>\n"
                            } else {
                                attdmsg = attdmsg + "<b>Service 3 (" + svc3count + ")</b>\n"
                            }
                        }
                        if (svc3Rcount > 0) {
                            attdmsg = attdmsg + "<b>Leaders/Regulars (" + svc3Rcount + ")</b>\n" + svc3ZMnames + svc3CGLnames + svc3TLnames + svc3Rnames + "\n"
                        }
                        if (svc3Icount > 0) {
                            attdmsg = attdmsg + "<b>Integrations (" + svc3Icount + ")</b>\n" + svc3GInames + svc3Inames + "\n"
                        }
                        if (svc3Ncount > 0) {
                            attdmsg = attdmsg + "<b>New Friends (" + svc3Ncount + ")</b>\n" + svc3Nnames + "\n"
                        }
                        if (svc3Gcount > 0) {
                            attdmsg = attdmsg + "<b>Guests (" + svc3Gcount + ")</b>\n" + svc3Gnames + "\n"
                        }

                        if (svcAcount > 0) {
                            attdmsg = attdmsg + "-----\n<b>Adjusted (" + svcAcount + ")</b>\n" + svcAnames + "\n"
                        }
                        callback(attdmsg)
                    })
                })
            } else {
                Weeks.findOne({ 'weekid': currentweek }, (err, doc) => {
                    if (err) throw error;
                    month = doc.month;
                    sat = doc.saturday;
                    sun = doc.sunday;
                    year = doc.year;
                    if (doc.weekid == currentweek) {
                        attdmsg = "The attendance for this week has not been updated yet"
                        callback(attdmsg)
                    } else {
                        attdmsg = "The is no attendance for " + sat + "-" + sun + " " + month + " " + year
                        callback(attdmsg)
                    }
                });
            }
        });
    },

    editMember: (ctx) => {
        Birthdays.find({}).exec({}, (err, members) => {
            if (err) throw err;
            // Create the button menu
            let choose_member_menu_markup = Extra
                .HTML()
                .markup((m) => {
                    let choose_member_menu_buttons = members.map((member) => {
                        return m.callbackButton(member.name + '', 'choose_member_menu:' + member._id + '')
                    })
                    return m.inlineKeyboard(choose_member_menu_buttons, { columns: 2 })
                })
            ctx.editMessageText('Choose a CG member to edit his/her info:', choose_member_menu_markup)
        })
    },

    getSelectedMember: (ctx, callback) => {
        Birthdays.findOne({ "_id": ctx.session.selected_member }).exec({}, (err, member) => {
            if (err) throw err;
            var msg = "<b>" + member.name + "</b>\nAge: " + member.age + "\nBirthdate: " + member.birthdate + "\nStatus: " + member.status
            callback(msg);
        })
    },

    editMemberName: (ctx) => {
        var memberID = ctx.session.selected_member;
        Birthdays.findOneAndUpdate({ '_id': memberID }, { 'name': ctx.session.updatedname }, { upsert: false }, function (err, doc) {
            if (err) throw err;
        });
    },

    editMemberStatus: (ctx) => {
        var memberID = ctx.session.selected_member;
        Birthdays.findOneAndUpdate({ '_id': memberID }, { 'status': ctx.session.selected_new_status }, { upsert: false }, function (err, doc) {
            if (err) throw err;
        });
    },

    editMemberAge: (ctx) => {
        var memberID = ctx.session.selected_member;
        Birthdays.findOneAndUpdate({ '_id': memberID }, { 'age': ctx.session.updatedage }, { upsert: false }, function (err, doc) {
            if (err) throw err;
        });
    },

    editMemberBirthdate: (ctx) => {
        var memberID = ctx.session.selected_member;
        Birthdays.findOneAndUpdate({ '_id': memberID }, { 'birthdate': ctx.session.updatedbirthdate }, { upsert: false }, function (err, doc) {
            if (err) throw err;
        });
    },

    removeMember: (ctx) => {
        var memberID = ctx.session.selected_member;
        Birthdays.deleteOne({ '_id': memberID }, function (err, result) {
            if (err) throw err;
        });
    },

    checkPersonExist: (ctx, callback) => {
        var nametoCheck = ctx.update.message.text;
        Birthdays.findOne({ "name": nametoCheck }, (err, userInfo) => {
            if (err) throw err;
            if (userInfo != null) {
                callback(userInfo);
            } else {
                callback(null);
            }
        })
    },

    setAdmin: (ctx, callback) => {
        var usernameForAdmin = ctx.update.message.text.replace('/setAdmin ', '');
        Users.findOneAndUpdate({ 'username': usernameForAdmin }, { 'status': 'Admin' }, { upsert: false }, function (err, doc) {
            if (err) throw err;
            if (doc != null) {
                var msg = usernameForAdmin + " is now an Admin!"
                callback(msg);
            } else {
                var msg = usernameForAdmin + " does not exist!"
                callback(msg);
            }
        });
    },

    removeAdmin: (ctx, callback) => {
        var usernameForRemoveAdmin = ctx.update.message.text.replace('/removeAdmin ', '');
        Users.findOneAndUpdate(
            {
                'username': usernameForRemoveAdmin
            },
            {
                'status': 'Pending'
            },
            { upsert: false },
            function (err, doc) {
                if (err) throw err;
                if (doc != null) {
                    var msg = usernameForRemoveAdmin + " is no longer an Admin!"
                    callback(msg);
                } else {
                    var msg = usernameForRemoveAdmin + " does not exist!"
                    callback(msg);
                }
            }
        );
    },

    setReceiver: (ctx, callback) => {
        var usernameForReceiver = ctx.update.message.text.replace('/setReceiver ', '');
        Users.findOneAndUpdate({ 'username': usernameForReceiver }, { 'tosend': 'true' }, { upsert: false }, function (err, doc) {
            if (err) throw err;
            if (doc != null) {
                var msg = usernameForReceiver + " will now receive reminders!"
                callback(msg);
            } else {
                var msg = usernameForReceiver + " does not exist!"
                callback(msg);
            }
        });
    },

    removeReceiver: (ctx, callback) => {
        var usernameForRemoveReceiver = ctx.update.message.text.replace('/removeReceiver ', '');
        Users.findOneAndUpdate({ 'username': usernameForRemoveReceiver }, { 'tosend': 'false' }, { upsert: false }, function (err, doc) {
            if (err) throw err;
            if (doc != null) {
                var msg = usernameForRemoveReceiver + " will no longer receive reminders!"
                callback(msg);
            } else {
                var msg = usernameForRemoveReceiver + " does not exist!"
                callback(msg);
            }
        });
    },

    toggleReminder: (ctx, callback) => {
        var telegramidForToggle = ctx.message.from.id;
        Users.findOne({ 'telegram_id': telegramidForToggle }, (err, userInfo) => {
            if (err) throw err;
            if (userInfo != null) {
                if (userInfo.tosend == "true") {
                    Users.findOneAndUpdate({ 'telegram_id': telegramidForToggle }, { 'tosend': 'false' }, { upsert: true }, function (err, doc) {
                        if (err) throw err;
                        var msg = "You will no longer receive birthday alerts and attendance update reminders"
                        callback(msg);
                    });
                } else if (userInfo.tosend == "false") {
                    Users.findOneAndUpdate({ 'telegram_id': telegramidForToggle }, { 'tosend': 'true' }, { upsert: true }, function (err, doc) {
                        if (err) throw err;
                        var msg = "You will now be able to receive birthday alerts and attendance update reminders"
                        callback(msg);
                    });
                } else {
                    Users.findOneAndUpdate({ 'telegram_id': telegramidForToggle }, { 'tosend': 'false' }, { upsert: true }, function (err, doc) {
                        if (err) throw err;
                        var msg = "You will no longer receive birthday alerts and attendance update reminders"
                        callback(msg);
                    });
                }
            } else {
                var msg = "You are not registered in the system. Please contact @bennyboon for more information."
                callback(msg);
            }
        });
    },

    broadcastMessage: (ctx) => {
        var stream = Users.find({ 'status': 'Admin', 'tosend': 'true' }).stream();
        stream.on('data', function (doc) {
            setTimeout(function () {
                var broadcastMsg = "Message from : " + ctx.message.from.username + "\n\n" + ctx.session.message;
                ctx.telegram.sendMessage(doc.telegram_id, broadcastMsg);
            }, 1000)
        }).on('error', function (err) {
            if (err) throw error;
            ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
        }).on('close', function () {
            //Do Nothing
        });
    },

    broadcastMessageDoc: (ctx) => {
        var stream = Users.find({ 'status': 'Admin', 'tosend': 'true' }).stream();
        stream.on('data', function (doc) {
            setTimeout(function () {
                ctx.telegram.sendMessage(doc.telegram_id, "Document From : " + ctx.message.from.username);
                ctx.telegram.sendDocument(doc.telegram_id, ctx.session.messageDoc);
            }, 1000)
        }).on('error', function (err) {
            if (err) throw error;
            ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
        }).on('close', function () {
            //Do Nothing
        });
    },

    broadcastMessageBot: (ctx) => {
        var stream = Users.find({ 'status': 'Admin', 'tosend': 'true' }).stream();
        stream.on('data', function (doc) {
            setTimeout(function () {
                ctx.telegram.sendMessage(doc.telegram_id, ctx.session.message);
            }, 1000)
        }).on('error', function (err) {
            if (err) throw error;
        }).on('close', function () {
            //Do Nothing
        });
    },

    broadcastMessageDocBot: (ctx, callback) => {
        var stream = Users.find({ 'status': 'Admin', 'tosend': 'true' }).stream();
        stream.on('data', function (doc) {
            setTimeout(function () {
                ctx.telegram.sendDocument(doc.telegram_id, ctx.session.messageDoc);
            }, 1000)
        }).on('error', function (err) {
            if (err) throw error;
        }).on('close', function () {
            //Do Nothing
        });
    },

    userList: (ctx, callback) => {
        var userListmsg = "User List";
        var stream = Users.find({}).stream();
        stream.on('data', function (doc) {
            userListmsg = userListmsg + "\n\n<b>" + doc.username + "</b>\n" + doc.telegram_id + "\n" + doc.status + "\n" + doc.tosend;
        }).on('error', function (err) {
            if (err) throw error;
            ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
        }).on('close', function () {
            callback(userListmsg);
        });
    },

    getAverageAge: (ctx, callback) => {
        var ageStats = [];
        var totalAge = 0; var pax = 0; var avgAge = 0;
        var lowestAge = 99; var highestAge = 0;
        var lowestAgeName = ""; var highestAgeName = "";
        var stream = Birthdays.find({ birthdate: { $ne: 'undefined' }, status: { $in: ['Good Integration', 'Regular', 'PTL', 'TL', 'PCGL', 'ACGL', 'CGL', 'SCGL'] } }).stream();
        stream.on('data', function (doc) {
            totalAge = totalAge + doc.age;
            pax += 1;

            if (doc.age > highestAge) {
                highestAge = doc.age;
                highestAgeName = doc.name;
            } else if (doc.age == highestAge) {
                highestAgeName = highestAgeName + ", " + doc.name;
            }

            if (doc.age < lowestAge) {
                lowestAge = doc.age;
                lowestAgeName = doc.name;
            } else if (doc.age == lowestAge) {
                lowestAgeName = lowestAgeName + ", " + doc.name;
            }

        }).on('error', function (err) {
            if (err) throw error;
            ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
        }).on('close', function () {
            avgAge = totalAge / pax;
            var ageStats = "<b>" + avgAge.toFixed(1) + "</b>\n";
            ageStats = ageStats + "The youngest in the CG is <b>" + lowestAgeName + " [" + lowestAge + "]</b>\n";
            ageStats = ageStats + "The oldest in the CG is <b>" + highestAgeName + " [" + highestAge + "]</b>";
            callback(ageStats);
        });
    },

}
