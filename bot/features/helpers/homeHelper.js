// Basic Imports
const Telegraf = require('telegraf')
const Promise = require('bluebird');
//DB Imports
const Users = require('../../../models/Users.js');
const AdminUsers = require('../../../models/AdminUsers.js');
const Files = require('../../../models/Files.js');
const Attendance = require('../../../models/Attendance.js');
const Weeks = require('../../../models/Weeks.js');
const Birthdays = require('../../../models/Birthdays.js');
//Flow & Router Imports
const TelegrafFlow = require('telegraf-flow')
const { Router, Extra, memorySession } = Telegraf
const { WizardScene } = TelegrafFlow
const { Scene } = TelegrafFlow
//Variable Initialisation
const verseAdderICs = [19663241] // Benny and Joshua's Telegram IDs
const flow = new TelegrafFlow();

module.exports = {

    isAdmin_normal: (ctx) => {
        let userId = ctx.message.from.id
        return (verseAdderICs.indexOf(userId) != -1)
    },

    //checkUserAlreadyExists function
    checkUserAlreadyExists: function(ctx, callback){
        Users.findOne( {'telegram_id' : ctx.update.message.from.id }, function (err, userObject) {
            if (userObject != undefined){
                if (userObject.status == "Admin"){
                    var message = "Your identity has been verified. Welcome " + userObject.username;
                    callback(message);
                } else {
                    var message = "You are not registered in the system. Please contact @bennyboon for more information."
                    callback(message);
                }
            } else {
                let userObject = ctx.update.message.from
                Users.update(
                    { telegram_id : userObject.id },
                    {
                        telegram_id: userObject.id,
                        username: userObject.username,
                        status: "Pending"
                    },
                    { upsert : true },
                    function(error,doc) {
                        if (error) throw error;
                        var message = "You are not registered in the system. Please contact @bennyboon for more information."
                        callback(message);
                    }
                );
            }
        });
    },

    addDocumentToDatabase: (ctx) => {
        let docFile = ctx.update.message.document
        return new Promise((resolve,reject)=>{
            Files.update(
                { fileName : docFile.file_name },
                {
                    fileName: docFile.file_name,
                    telegramFileId: docFile.file_id,
                },
                { upsert : true },
                function(error,doc) {
                    if (error) throw error;
                    let doneObject = {
                        info:"Document Inserted Successfully!!",
                        documentInserted: docFile,
                        documentInsertSuccess: doc,
                    }
                    resolve(doneObject);
                }
            );
        })
    },

    getFileAndSend: (ctx) => {
        var stream = Files.find({}).stream();
        stream.on('data', function (doc) {
            var fileId = doc.telegramFileId
            ctx.telegram.sendDocument(ctx.message.from.id, fileId);
        }).on('error', function (err) {
            ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
        }).on('close', function () {
            // the stream is closed
        });
    },

    updateAttendance: (ctx, callback) => {
      Weeks.findOne({}, {}, { sort: {_id:-1} }, function(err, doc) {
        var currentweek = doc.week
        Attendance.update(
            {
              name : ctx.session.name,
              svcattending: ctx.session.selected_svc
            },
            {
                name: ctx.session.name,
                svcattending: ctx.session.selected_svc,
                status: ctx.session.selected_status,
                updatedby: ctx.session.messagefrom,
                week: currentweek,
                tbc: "false"
            },
            { upsert : true },
            function(error,doc) {
                if (error) throw error;
                var message = ctx.session.name + " has been added to Service " + ctx.session.selected_svc + " as a " + ctx.session.selected_status;
                callback(message);
            }
        );
      });
    },

    getAttendance: (ctx, callback) => {
      Weeks.findOne({}, {}, { sort: {_id:-1} }, function(err, doc) {
        var currentweek = doc.week
            var svc1Rnames = ""; var svc1Rcount = 0; var svc1count = 0;
            var svc1Inames = ""; var svc1Icount = 0; var svc2count = 0;
            var svc1Nnames = ""; var svc1Ncount = 0; var svc3count = 0;
            var svc1Gnames = ""; var svc1Gcount = 0; var attdmsg = "";
            var svc2Rnames = ""; var svc2Rcount = 0;
            var svc2Inames = ""; var svc2Icount = 0;
            var svc2Nnames = ""; var svc2Ncount = 0;
            var svc2Gnames = ""; var svc2Gcount = 0;
            var svc3Rnames = ""; var svc3Rcount = 0;
            var svc3Inames = ""; var svc3Icount = 0;
            var svc3Nnames = ""; var svc3Ncount = 0;
            var svc3Gnames = ""; var svc3Gcount = 0;
            var stream = Attendance.find({}).stream();
            stream.on('data', function (doc) {
              if (doc.week == currentweek){
                if (doc.svcattending == "1"){
                    if (doc.status == "Regular"){
                        svc1Rnames = svc1Rnames + doc.name + "\n";
                        svc1Rcount = svc1Rcount + 1;
                        svc1count = svc1count + 1;
                    } else if (doc.status == "Integration"){
                        svc1Inames = svc1Inames + doc.name + "\n";
                        svc1Icount = svc1Icount + 1;
                        svc1count = svc1count + 1;
                    } else if (doc.status == "New Friend"){
                        svc1Nnames = svc1Nnames + doc.name + "\n";
                        svc1Ncount = svc1Ncount + 1;
                        svc1count = svc1count + 1;
                    } else if (doc.status == "Guest"){
                        svc1Gnames = svc1Gnames + doc.name + "\n";
                        svc1Gcount = svc1Gcount + 1;
                        svc1count = svc1count + 1;
                    }
                } else if (doc.svcattending == "2"){
                    if (doc.status == "Regular"){
                        svc2Rnames = svc2Rnames + doc.name + "\n";
                        svc2Rcount = svc2Rcount + 1;
                        svc2count = svc2count + 1;
                    } else if (doc.status == "Integration"){
                        svc2Inames = svc2Inames + doc.name + "\n";
                        svc2Icount = svc2Icount + 1;
                        svc2count = svc2count + 1;
                    } else if (doc.status == "New Friend"){
                        svc2Nnames = svc2Nnames + doc.name + "\n";
                        svc2Ncount = svc2Ncount + 1;
                        svc2count = svc2count + 1;
                    } else if (doc.status == "Guest"){
                        svc2Gnames = svc2Gnames + doc.name + "\n";
                        svc2Gcount = svc2Gcount + 1;
                        svc2count = svc2count + 1;
                    }
                } else if (doc.svcattending == "3"){
                    if (doc.status == "Regular"){
                        svc3Rnames = svc3Rnames + doc.name + "\n";
                        svc3Rcount = svc3Rcount + 1;
                        svc3count = svc3count + 1;
                    } else if (doc.status == "Integration"){
                        svc3Inames = svc3Inames + doc.name + "\n";
                        svc3Icount = svc3Icount + 1;
                        svc3count = svc3count + 1;
                    } else if (doc.status == "New Friend"){
                        svc3Nnames = svc3Nnames + doc.name + "\n";
                        svc3Ncount = svc3Ncount + 1;
                        svc3count = svc3count + 1;
                    } else if (doc.status == "Guest"){
                        svc3Gnames = svc3Gnames + doc.name + "\n";
                        svc3Gcount = svc3Gcount + 1;
                        svc3count = svc3count + 1;
                    }
                  }
                }
            }).on('error', function (err) {
                ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
            }).on('close', function () {
                attdmsg = "Here is the attendance for this week\n\n<b>Service 1 (" + svc1count + ")\nRegulars (" + svc1Rcount + ")</b>\n" + svc1Rnames + "\n"
                attdmsg = attdmsg + "<b>Integrations (" + svc1Icount + ")</b>\n" + svc1Inames + "\n"
                attdmsg = attdmsg + "<b>New Friends (" + svc1Ncount + ")</b>\n" + svc1Nnames + "\n"
                attdmsg = attdmsg + "<b>Guests (" + svc1Gcount + ")</b>\n" + svc1Gnames + "\n"

                attdmsg = attdmsg + "-----\n<b>Service 2 (" + svc2count+ ")</b>\n"
                attdmsg = attdmsg + "<b>Regulars (" + svc2Rcount + ")</b>\n" + svc2Rnames + "\n"
                attdmsg = attdmsg + "<b>Integrations (" + svc2Icount + ")</b>\n" + svc2Inames + "\n"
                attdmsg = attdmsg + "<b>New Friends (" + svc2Ncount + ")</b>\n" + svc2Nnames + "\n"
                attdmsg = attdmsg + "<b>Guests (" + svc2Gcount + ")</b>\n" + svc2Gnames + "\n"

                attdmsg = attdmsg + "-----\n<b>Service 3 (" + svc3count+ ")</b>\n"
                attdmsg = attdmsg + "<b>Regulars (" + svc3Rcount + ")</b>\n" + svc3Rnames + "\n"
                attdmsg = attdmsg + "<b>Integrations (" + svc3Icount + ")</b>\n" + svc3Inames + "\n"
                attdmsg = attdmsg + "<b>New Friends (" + svc3Ncount + ")</b>\n" + svc3Nnames + "\n"
                attdmsg = attdmsg + "<b>Guests (" + svc3Gcount + ")</b>\n" + svc3Gnames + "\n"
                callback(attdmsg)
            });
          });
        },

        checkIfAdmin: (ctx, callback) => {
              Users.findOne( {'telegram_id' : ctx.update.message.from.id }, function (err, userObject) {
                  callback(userObject);
              });
        },

        removeAttendance: (ctx, callback) => {
            if (ctx.update.message.text == "/remove") {
                var message = "Remove attendance in this format.\n/remove <b>name service</b>\n<code>e.g. /remove Bob 3</code>"
                callback(message);
            } else {
                var attd = ctx.update.message.text.replace('/remove ','');
                var attdinfo = attd.split(" ");
                var attdname = attdinfo[0];
                var svcattending = attdinfo[1];
                Attendance.remove({ 'name': attdname, 'svcattending': svcattending }, function(err) {
                    if (!err) {
                        var message = attdname + " has been removed from Service " + svcattending + " successfully"
                        callback(message);
                    } else {
                        message.type = 'error';
                    }
                });
          }
        },

        getBirthdayList: (ctx, callback) => {
            var birthdaymsg = "Here is the birthday list\nFormat: Name - Birthdate - Current Age\n\n"
            var stream = Birthdays.find({}).stream();
            stream.on('data', function (doc) {
                var birthdayname = doc.name;
                var birthdate = doc.birthdate;
                var birthdayage = doc.age;
                birthdaymsg = birthdaymsg + birthdayname + " - " + birthdate + " (" + birthdayage + ")\n"
            }).on('error', function (err) {
                ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
            }).on('close', function () {
                callback(birthdaymsg);
            });
        },

        addBirthday: (ctx, callback) => {
            if (ctx.update.message.text == "/addBirthday") {
                var message = "Add birthday in this format.\n/addBirthday <b>name birthdate age</b>\n<code>e.g. /addBirthday BunBun 01/01/2010 6</code>"
                callback(message);
            } else {
                var info = ctx.update.message.text.replace('/addBirthday ','');
                var birthdayinfo = info.split(" ");
                var birthdayname = birthdayinfo[0];
                var birthdate = birthdayinfo[1];
                var birthage = birthdayinfo[2];
                Birthdays.update(
                    {
                      name : birthdayname
                    },
                    {
                        name: birthdayname,
                        birthdate: birthdate,
                        age: birthage
                    },
                    { upsert : true },
                    function(error,doc) {
                        if (error) throw error;
                        var message = birthdayname + " has been added to the birthday list";
                        callback(message);
                    }
                );
          }
        },

        addWeek: (ctx, callback) => {
            if (ctx.update.message.text == "/addWeek") {
                //Do Nothing
            } else {
                var weektoadd = ctx.update.message.text.replace('/addWeek ','');
                Weeks.update(
                    {
                       week : weektoadd
                    },
                    {
                        week : weektoadd,
                        weekid : weektoadd
                    },
                    { upsert : true },
                    function(error,doc) {
                        if (error) throw error;
                        var message = "Week " + weektoadd + " has been added successfully."
                        callback(message);
                    }
                );
            }
        },

        pastAttendance: (ctx) => {
            let choose_week_buttons = []
            // Turn all of the challenges into buttons
            Weeks.find({},(err, weeks) => {
                if (err) throw err;
                // Create the button menu
                let choose_week_menu_markup = Extra
                .HTML()
                .markup((m) => {
                    let choose_week_menu_buttons = weeks.map((week) => {
                        return m.callbackButton("Week " + week.week + "", 'choose_a_week_menu:'+ week.weekid + '')
                    })
                    return m.inlineKeyboard( choose_week_menu_buttons , {columns: 2})
                })
                ctx.editMessageText('Choose week for attendance to display:', choose_week_menu_markup)
            })
        },

        getSelectedWeekAttendance: (ctx, callback) => {
          var currentweek = ctx.session.selected_week
              var svc1Rnames = ""; var svc1Rcount = 0; var svc1count = 0;
              var svc1Inames = ""; var svc1Icount = 0; var svc2count = 0;
              var svc1Nnames = ""; var svc1Ncount = 0; var svc3count = 0;
              var svc1Gnames = ""; var svc1Gcount = 0; var attdmsg = "";
              var svc2Rnames = ""; var svc2Rcount = 0;
              var svc2Inames = ""; var svc2Icount = 0;
              var svc2Nnames = ""; var svc2Ncount = 0;
              var svc2Gnames = ""; var svc2Gcount = 0;
              var svc3Rnames = ""; var svc3Rcount = 0;
              var svc3Inames = ""; var svc3Icount = 0;
              var svc3Nnames = ""; var svc3Ncount = 0;
              var svc3Gnames = ""; var svc3Gcount = 0;
              var stream = Attendance.find({}).stream();
              stream.on('data', function (doc) {
                if (doc.week == currentweek){
                  if (doc.svcattending == "1"){
                      if (doc.status == "Regular"){
                          svc1Rnames = svc1Rnames + doc.name + "\n";
                          svc1Rcount = svc1Rcount + 1;
                          svc1count = svc1count + 1;
                      } else if (doc.status == "Integration"){
                          svc1Inames = svc1Inames + doc.name + "\n";
                          svc1Icount = svc1Icount + 1;
                          svc1count = svc1count + 1;
                      } else if (doc.status == "New Friend"){
                          svc1Nnames = svc1Nnames + doc.name + "\n";
                          svc1Ncount = svc1Ncount + 1;
                          svc1count = svc1count + 1;
                      } else if (doc.status == "Guest"){
                          svc1Gnames = svc1Gnames + doc.name + "\n";
                          svc1Gcount = svc1Gcount + 1;
                          svc1count = svc1count + 1;
                      }
                  } else if (doc.svcattending == "2"){
                      if (doc.status == "Regular"){
                          svc2Rnames = svc2Rnames + doc.name + "\n";
                          svc2Rcount = svc2Rcount + 1;
                          svc2count = svc2count + 1;
                      } else if (doc.status == "Integration"){
                          svc2Inames = svc2Inames + doc.name + "\n";
                          svc2Icount = svc2Icount + 1;
                          svc2count = svc2count + 1;
                      } else if (doc.status == "New Friend"){
                          svc2Nnames = svc2Nnames + doc.name + "\n";
                          svc2Ncount = svc2Ncount + 1;
                          svc2count = svc2count + 1;
                      } else if (doc.status == "Guest"){
                          svc2Gnames = svc2Gnames + doc.name + "\n";
                          svc2Gcount = svc2Gcount + 1;
                          svc2count = svc2count + 1;
                      }
                  } else if (doc.svcattending == "3"){
                      if (doc.status == "Regular"){
                          svc3Rnames = svc3Rnames + doc.name + "\n";
                          svc3Rcount = svc3Rcount + 1;
                          svc3count = svc3count + 1;
                      } else if (doc.status == "Integration"){
                          svc3Inames = svc3Inames + doc.name + "\n";
                          svc3Icount = svc3Icount + 1;
                          svc3count = svc3count + 1;
                      } else if (doc.status == "New Friend"){
                          svc3Nnames = svc3Nnames + doc.name + "\n";
                          svc3Ncount = svc3Ncount + 1;
                          svc3count = svc3count + 1;
                      } else if (doc.status == "Guest"){
                          svc3Gnames = svc3Gnames + doc.name + "\n";
                          svc3Gcount = svc3Gcount + 1;
                          svc3count = svc3count + 1;
                      }
                    }
                  }
              }).on('error', function (err) {
                  ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
              }).on('close', function () {
                  attdmsg = "Here is the attendance for week " + currentweek + "\n\n<b>Service 1 (" + svc1count + ")\nRegulars (" + svc1Rcount + ")</b>\n" + svc1Rnames + "\n"
                  attdmsg = attdmsg + "<b>Integrations (" + svc1Icount + ")</b>\n" + svc1Inames + "\n"
                  attdmsg = attdmsg + "<b>New Friends (" + svc1Ncount + ")</b>\n" + svc1Nnames + "\n"
                  attdmsg = attdmsg + "<b>Guests (" + svc1Gcount + ")</b>\n" + svc1Gnames + "\n"

                  attdmsg = attdmsg + "-----\n<b>Service 2 (" + svc2count+ ")</b>\n"
                  attdmsg = attdmsg + "<b>Regulars (" + svc2Rcount + ")</b>\n" + svc2Rnames + "\n"
                  attdmsg = attdmsg + "<b>Integrations (" + svc2Icount + ")</b>\n" + svc2Inames + "\n"
                  attdmsg = attdmsg + "<b>New Friends (" + svc2Ncount + ")</b>\n" + svc2Nnames + "\n"
                  attdmsg = attdmsg + "<b>Guests (" + svc2Gcount + ")</b>\n" + svc2Gnames + "\n"

                  attdmsg = attdmsg + "-----\n<b>Service 3 (" + svc3count+ ")</b>\n"
                  attdmsg = attdmsg + "<b>Regulars (" + svc3Rcount + ")</b>\n" + svc3Rnames + "\n"
                  attdmsg = attdmsg + "<b>Integrations (" + svc3Icount + ")</b>\n" + svc3Inames + "\n"
                  attdmsg = attdmsg + "<b>New Friends (" + svc3Ncount + ")</b>\n" + svc3Nnames + "\n"
                  attdmsg = attdmsg + "<b>Guests (" + svc3Gcount + ")</b>\n" + svc3Gnames + "\n"
                  callback(attdmsg)
              });
        }

}
