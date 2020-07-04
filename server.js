const express = require('express');
const bodyParser = require('body-parser');
const cors= require('cors');
var knex = require('knex');
const moment = require('moment');
const app =express();
var Pusher = require('pusher');
app.use(bodyParser.urlencoded({extented:true}));
app.use(bodyParser.json());
app.use(cors());

const db=knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : 'super',
    database : 'touristerdb'
  }
});

var pusher = new Pusher({
  appId: '911366',
  key: 'dc0a97d420312dc803d2',
  secret: '44deb653446eb7091f66',
  cluster: 'ap2',
  encrypted: true
});


app.post('/',(req,res) =>{
  console.log(req.body);
  res.send("success");
});
// db.select('*').from('users').then((data) => {
// console.log(data);
// });

// signin endpoint
app.post('/signin',(req,res) =>{
  console.log(req.body);
  const mobileno = req.body.mobileno;
  db('users').where('mobileno', '=', mobileno).then((data) => {
    if (data.length==0) {

      res.send({
        mobileno:'',
        name:'',
        email:'',
        existence:'notexist'
      });
    }
    else {
        res.send({
          mobileno:data[0].mobileno,
          name:data[0].name,
          email:data[0].email,
          existence:'exist'
        });
    }
  });
});


//registeruser endpoint
app.post('/registeruser',(req,res) =>{
  console.log(req.body);
  const { mobileno,name,email }=req.body;
 db('users').insert({mobileno: mobileno,
                         name:name,
                        email:email
                      }).then();

// res.send("ok");
    db.schema.createTable('user'+mobileno, function (table) {
    table.string('groupcode');
    table.string('groupname');
  }).then(data=>{
        if (data.command=='CREATE') {
          res.send({
            mobileno:mobileno,
            name:name,
            email:email,
            existence:'exist'
          });
        }
  });
});

//create group endpoint
app.post('/creategroup',(req,res) =>{
  console.log(req.body);
  const { groupname,mobileno,name }=req.body;
  db.select('*').from('allgroups').then((data) => {
    var groupcode;
    while (true) {
      var no=0;
      const groupcodeint = Math.floor(Math.random() * (9999 - 1001)) + 1001;
      groupcode= groupcodeint.toString();
      console.log(groupcode);
      for (var i = 0; i < data.length; i++) {
        if (groupcode!=data[i].groupcode) {
          no++;
        }
      }
      if (no == data.length) {
        break;
      }
    }
    db('allgroups').insert({groupcode: groupcode,
                            groupname:groupname,
                         }).then();

    db('user'+mobileno).insert({groupcode: groupcode,
                            groupname:groupname,
                         }).then();

                         db.schema.createTable('group'+groupcode, function (table) {
                         table.string('name');
                         table.string('mobileno');
                         table.string('paidmoney');
                         }).then(data=>{
                               if (data.command=='CREATE') {
                                 db('group'+groupcode).insert({name: name,
                                                         mobileno:mobileno,
                                                         paidmoney:'0'
                                                      }).then();
                               }
                         });

                         db.schema.createTable('groupchat'+groupcode, function (table) {
                         table.string('name');
                         table.string('mobileno');
                         table.string('message');
                         // table.timestamp('time');
                         table.string('time');
                         }).then();

                         db.schema.createTable('groupsplitwise'+groupcode, function (table) {
                         table.string('name');
                         table.string('mobileno');
                         table.string('paidmoney');
                         table.string('description');
                         }).then();
    res.send({
      groupcode:groupcode,
      groupname:groupname
    });

  });
});

// homepage end point
app.post('/homepage',(req,res) =>{
  console.log(req.body);
  const mobileno = req.body.mobileno;
  db('users').where('mobileno', '=', mobileno).then((data) => {
    if (data.length==0) {
      res.send("notexist");
    }
    else {
      db.select('*').from('user'+mobileno).then((data) => {
      console.log(data);
      res.send(data);
      });
    }
  });
});


//join group endpoint
app.post('/joingroup',(req,res) =>{
  console.log(req.body);
  const { groupcode,mobileno,name }=req.body;
  db('allgroups').where('groupcode', '=', groupcode).then((data) => {
    if (data.length==0) {
      res.send("no such group exist");
    }
    else {
        db('group'+groupcode).insert({name: name,
                                mobileno:mobileno,
                                paidmoney:'0'
                             }).then();
        const groupname = data[0].groupname;
        db('user'+mobileno).insert({groupcode: groupcode,
                                groupname:groupname,
                             }).then();
         //pusher to inform other group members
         pusher.trigger('channel'+groupcode, 'joingroupevent', {
                        "name":name,
                        "mobileno":mobileno
                      });
        res.send(data[0]);

    }
  });
});

// group detail endpoint
app.post('/groupdetail',(req,res) =>{
  console.log(req.body);
  const { groupcode }=req.body;
  db.select('*').from('group'+groupcode).then((data) => {
  console.log(data);
  res.send(data);
  });
});


//group chat end point
app.post('/groupchat',(req,res) =>{
  console.log(req.body);
  const { groupcode }=req.body;
  db.select('*').from('groupchat'+groupcode).then((data) => {
  console.log(data);
  res.send(data);
  });
});

// group splitwise end point
app.post('/groupsplitwise',(req,res) =>{
  console.log(req.body);
  const { groupcode }=req.body;
  db.select('*').from('groupsplitwise'+groupcode).then((data) => {
  console.log(data);
  res.send(data);
  });
});

// send message end point
app.post('/sendmsg',(req,res) =>{
  console.log(req.body);
  const { name,message,groupcode,mobileno,time }=req.body;
  // const time = moment().utc().toString();
  db('groupchat'+groupcode).insert({name: name,
                          message:message,
                          time:time
                       }).then();
  //pusher for groupchat
  pusher.trigger('channel'+groupcode, 'sendmsgevent', {
                 "name":name,
                 "mobileno":mobileno,
                 "message":message,
                 "time":time
               });
  res.send('message sent');
});

// pay money end point
app.post('/paymoney',(req,res) =>{
  console.log(req.body);
  const { name,mobileno,groupcode,paidmoney,description }=req.body;
  db('groupsplitwise'+groupcode).insert({name: name,
      mobileno:mobileno,
      paidmoney:paidmoney,
      description:description
   }).then((no)=>{
     db('group'+groupcode).where('mobileno', '=', mobileno).then((data) => {
       if (data.length==0) {
         res.send("no such user exist");
       }
       else {
           const newmoney = parseInt(data[0].paidmoney)+parseInt(paidmoney);
           console.log(newmoney);
           db('group'+groupcode)
             .where({ mobileno: mobileno })
             .update({ paidmoney:newmoney.toString() }).then();
             //pusher to inform other group members
             pusher.trigger('channel'+groupcode, 'paymoneyevent', {
                            "name":name,
                            "mobileno":mobileno,
                            "paidmoney":paidmoney,
                            "description":description
                          });
           res.send('money successfully paid');

       }
     });
   });
});

//upload image end point
app.post('/uploadimage',(req,res) =>{
  console.log(req.body);
  const { groupcode,mobileno,name }=req.body;
  pusher.trigger('channel'+groupcode, 'uploadimageevent', {
                  "mobileno":mobileno
               });
});














app.listen(3000);
