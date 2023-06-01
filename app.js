//  - - - - - - - - -D E P E N D A N C E S- - - - - - - - - - //

// express & express-session
const express = require('express');
const session = require('express-session');
const app = express();

// bcrypt
const bcrypt = require('bcrypt');

// MongoDB Mongoose et dotenv
require('dotenv').config();
var mongoose = require('mongoose');
const Message = require('./models/Message');
const User = require('./models/User');
const { log } = require('console');
const url = process.env.DATABASE_URL;
mongoose.connect(url, {useNewUrlParser: true,useUnifiedTopology: true})
.then(() => {console.log("MongoDB connected");})
.catch(err => {console.log(err);});

// EJS : 
app.set('view engine', 'ejs');

// BodyParser
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
secret: 'your-secret-key',
resave: false,
saveUninitialized: false
}));

// Method-override :
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// get datetime
// npm install moment --save
const moment = require('moment'); 

//  - - - - - - - - - - R O U T E - - - - - - - - - - - //

// GET HOME
app.get('/', (req, res) => {
  const user = req.session.user;
  const heure = moment().format('DD-MM-YYYY, h:mm:ss');
  res.render('home', { user: user, heure: heure} ); 
});

// GET REGISTER
app.get('/register', (req, res) => {
  const user = req.session.user;
  res.render('RegisterForm', { user: user });
});

// POST REGISTER
app.post('/register', function(req, res){
const userData = new User({
  pseudo: req.body.pseudo,
  email: req.body.email,
  password: bcrypt.hashSync(req.body.password,10),
  role: req.body.role
  })
  userData.save()
    .then(()=>{ res.redirect('/login')})
    .catch((err)=>{console.log(err); 
  });
});

// GET LOGIN
app.get('/login', (req, res) => {const user = req.session.user;
res.render('LoginForm', { user: user });});

// POST LOGIN
app.post('/login', (req, res) => {
User.findOne({ pseudo: req.body.pseudo }).then(user => {
  if (!user) {res.send('Pseudo invalide');}
  if (!bcrypt.compareSync(req.body.password, user.password)) {
    res.send('Mot de passe invalide');}
  req.session.user = user;
  res.redirect('/userpage');
})
.catch(err => console.log(err));
});

// GET LOGOUT
app.get('/logout', (req, res) => {
req.session.destroy((err) => {
  if (err) {console.log(err);} 
  else {res.redirect('/login');}
});
});

// GET USER PAGE

app.get('/userpage', (req, res) => {
  
  if (!req.session.user) { return res.redirect('/login');}
  const user = req.session.user;
  Message.find({$or: [{ expediteur: user.pseudo }, { destinataire: user.pseudo }]
  }).then(messages => {
    const messagesSent = messages.filter(message => message.expediteur === user.pseudo);
    const messagesReceived = messages.filter(message => message.destinataire === user.pseudo);
    const ContactsMsg = messages.filter(message => message.destinataire === user.pseudo );
    res.render('userpage', {  
      user: user, messagesSent: messagesSent,
      messagesReceived: messagesReceived, ContactsMsg: ContactsMsg, });
  })
  .catch(err => {console.log(err);}); 
});

app.get('/userpage/:pseudo', (req, res) => {
  
  if (!req.session.user) {
    return res.redirect('/login');
  }
  const user = req.session.user;
  const pseudo = req.params.pseudo;
  
  Message.find({$or: [{ expediteur: user.pseudo }, { destinataire: user.pseudo }]
  }).then(messages => {
    const heure = moment().format('DD-MM-YYYY, h:mm:ss');
    const messagesSent = messages.filter(message => message.expediteur === user.pseudo && message.destinataire === pseudo);
    const messagesReceived = messages.filter(message => message.destinataire === user.pseudo && message.expediteur === pseudo);
    const ContactsMsg = messages.filter(message => message.destinataire === user.pseudo);
  
    // effectue un tri des messages en fonction de l'heure
    const AfficheMsg = messages.sort((a, b) => {
      const heureA = new Date(a.heure);
      const heureB = new Date(b.heure);
      return heureA - heureB;// la fonction de comparaison soustrait heureA de heureB. La soustraction des objets Date renvoie la différence en millisecondes entre les deux dates. En utilisant cette différence, sort() organise les messages en fonction de l'ordre croissant de leurs heures.
    });
  
    res.render('Dialogue', {
      heure: heure,
      user: user,
      messagesSent: messagesSent,
      messagesReceived: messagesReceived,
      ContactsMsg: ContactsMsg,
      AfficheMsg: AfficheMsg,
      pseudo: pseudo
    });
  })
  .catch(err => {
    console.log(err);
  });  
});

// GET NEW MESSAGE
app.get('/message/new', (req, res) => {
if (!req.session.user) {return res.redirect('/login');}
const user = req.session.user;
const heure = moment().format('DD-MM-YYYY, h:mm:ss');
res.render('MessageForm', { user: user, heure: heure});
});

// POST NEW MESSAGE
app.post('/message', (req, res) => {
  if (!req.session.user) {return res.redirect('/login');}
  const user = req.session.user;
  const heure = moment().format('DD-MM-YYYY, h:mm:ss');
  const messageData = new Message({
    expediteur: user.pseudo,
    destinataire: req.body.destinataire,
    message: req.body.message,
    datetime: heure
  });
  messageData.save()
    .then(() => res.redirect(`/userpage/${req.body.destinataire}`))
    .catch(err => {
      console.log(err);
    });
});

// GET EDIT PAGE 
app.get('/edit-message/:id', (req, res) => {
const user = req.session.user;
const heure = moment().format('DD-MM-YYYY, h:mm:ss');
Message.findById(req.params.id)
  .then((message) => {res.render('edit', { 
    message: message , user: user, heure: heure });})
  .catch(err => {console.log(err);});
});

// PUT EDIT PAGE
app.put('/edit-message/:id', (req, res) => {
const heure = moment().format('DD-MM-YYYY, h:mm:ss');
const messageData = {
  destinataire: req.body.destinataire,
  message: req.body.message,
  datetime: heure
};
Message.findByIdAndUpdate(req.params.id, messageData)
  .then(() => {res.redirect('/userpage');})
  .catch(err => {console.log(err);});
});

// DELETE 
app.delete('/delete-message/:messageId', (req, res) => {
Message.findByIdAndRemove(req.params.messageId)
  .then(() => {res.redirect('/userpage');})
  .catch(err => {console.log(err);});
});

// Démarrage du serveur
var server = express(); app.listen(5000, function () {
console.log("server listening : http://localhost:5000");
});
