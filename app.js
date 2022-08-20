const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const pug = require('pug');
const _ = require('lodash');
const path = require('path');
const {Donor} = require('./models/donor');
const { response } = require('express');
const {initializePayment, verifyPayment} = require('./config/paystack')(request);

const port = process.env.PORT || 3000;

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public/')));
app.set('view engine', 'pug');

app.get('/', (req, res) => {
    res.render('index.pug');
})

app.post('/paystack/pay', (req, res) => {
    const form = _.pick(req.body, ['amount', 'email', 'full_name']);
    form.metadata = {
        full_name: form.full_name
    }
    form.amount *= 100;
    initializePayment(form, (error, body) => {
        if(error){
            console.log(error);
            return;
        }
        const dataPay = JSON.parse(body);
        if(dataPay.status){
            res.redirect(dataPay.data.authorization_url);
        }
    });
});

app.get('/paystack/callback', (req, res) => {
    const ref = req.query.reference;
    verifyPayment(ref, (error, body) => {
        if(error){
            console.log(error)
            return res.redirect('/error');
        }
        const dataCallback = JSON.parse(body);
        if(dataCallback.status){
            res.redirect(dataCallback.data.authorization_url);
        }
        const data = _.at(dataCallback.data, ['reference', 'amount', 'customer.email', 'metadata.full_name']);

        [reference, amount, email, full_name] = data;
        newDonor = {reference, amount, email, full_name}
        const donor = new Donor(newDonor)

        donor.save().then((donor) => {
            if(!donor){
                res.redirect('/error');
            }
            res.redirect('/receipt/' + donor._id);
        }).catch((err) => {
            res.redirect('/error');
        })
    })
});

app.get('/receipt/:id', (req, res) => {
    const id = req.params.id;
    Donor.findById(id).then((donor) => {
        if(!donor){
            res.redirect('/error');
        }
        res.render('success.pug', {donor});
    }).catch((e) => {
        res.redirect('/error');
    })
});

app.get('/error', (req, res) => {
    res.render('error.pug');
})


app.listen(port, () => {
    console.log(`App running on port ${port}`);
})