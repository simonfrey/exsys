"use strict";

var bcrypt = require('bcryptjs');

//var Customer = require('./CustomerSchema');
var Customer = require('./CustomerSchema');
var Product = require('./ProductSchema');
var Trans = require('./TransactionSchema');
var aws = require('./util');
var rand = require('../components/random');
var response = require('../components/response');



module.exports.SeedCustomers = async function () {
    try {
        const newCustomers = [{
            email: "demouser@demo.ch",
            password: bcrypt.hashSync("test", bcrypt.genSaltSync(10))
        },
        {
            email: "demouser2@demo.ch",
            password: bcrypt.hashSync("test", bcrypt.genSaltSync(10))
        },
        {
            email: "demouser3@demo.ch",
            password: bcrypt.hashSync("test", bcrypt.genSaltSync(10))
        },
        {
            email: "demouser4@demo.ch",
            password: bcrypt.hashSync("test", bcrypt.genSaltSync(10))
        }
        ];


        await aws.ClearTable("customers")

        var customersPromises = [];

        for (var i = 0; i < newCustomers.length; i++) {
            var p = newCustomers[i];
            customersPromises.push(Customer.PutCustomer(p.email, p.password));
        }

        console.log("wait for all promisies")
        await Promise.all(customersPromises)



        console.log('seeding %s customers', newCustomers.length);
        console.log(newCustomers);
    } catch (err) {
        console.log("Err: ", err)
        return response.httpError(err)
    }
    return response.httpResponse(200)
}


module.exports.SeedProducts = async function () {
    try {

        const PRODUCTS_COUNT = 100;

        var productsTemplates = [
            {
                name: 'Product A',
                category: 'Home Appliance',
                description: 'Had denoting properly jointure you occasion directly raillery. In said to of poor full be post face snug. Introduced imprudence see say unpleasing devonshire acceptance son. Exeter longer wisdom gay nor design age. Am weather to entered norland no in showing service. Nor repeated speaking shy appetite. Excited it hastily an pasture it observe. Snug hand how dare here too. ',
                image: '1.jpg'
            },
            {
                name: 'Product B',
                category: 'Home Appliance',
                description: 'Now eldest new tastes plenty mother called misery get. Longer excuse for county nor except met its things. Narrow enough sex moment desire are. Hold who what come that seen read age its. Contained or estimable earnestly so perceived. Imprudence he in sufficient cultivated. Delighted promotion improving acuteness an newspaper offending he. Misery in am secure theirs giving an. Design on longer thrown oppose am. ',
                image: '2.jpg'
            },
            {
                name: 'Product C',
                category: 'Home Appliance',
                description: 'Those an equal point no years do. Depend warmth fat but her but played. Shy and subjects wondered trifling pleasant. Prudent cordial comfort do no on colonel as assured chicken. Smart mrs day which begin. Snug do sold mr it if such. Terminated uncommonly at at estimating. Man behaviour met moonlight extremity acuteness direction. ',
                image: '3.jpg'
            },
            {
                name: 'Product D',
                category: 'Home Appliance',
                description: 'Improve him believe opinion offered met and end cheered forbade. Friendly as stronger speedily by recurred. Son interest wandered sir addition end say. Manners beloved affixed picture men ask. Explain few led parties attacks picture company. On sure fine kept walk am in it. Resolved to in believed desirous unpacked weddings together. Nor off for enjoyed cousins herself. Little our played lively she adieus far sussex. Do theirs others merely at temper it nearer. ',
                image: '1.jpg'
            },
            {
                name: 'Product E',
                category: 'Home Appliance',
                description: 'And produce say the ten moments parties. Simple innate summer fat appear basket his desire joy. Outward clothes promise at gravity do excited. Sufficient particular impossible by reasonable oh expression is. Yet preference connection unpleasant yet melancholy but end appearance. And excellence partiality estimating terminated day everything. ',
                image: '2.jpg'
            },
            {
                name: 'Product F',
                category: 'Home Appliance',
                description: 'Apartments simplicity or understood do it we. Song such eyes had and off. Removed winding ask explain delight out few behaved lasting. Letters old hastily ham sending not sex chamber because present. Oh is indeed twenty entire figure. Occasional diminution announcing new now literature terminated. Really regard excuse off ten pulled. Lady am room head so lady four or eyes an. He do of consulted sometimes concluded mr. An household behaviour if pretended. ',
                image: '3.jpg'
            },
            {
                name: 'Product G',
                category: 'Home Appliance',
                description: 'Dependent certainty off discovery him his tolerably offending. Ham for attention remainder sometimes additions recommend fat our. Direction has strangers now believing. Respect enjoyed gay far exposed parlors towards. Enjoyment use tolerably dependent listening men. No peculiar in handsome together unlocked do by. Article concern joy anxious did picture sir her. Although desirous not recurred disposed off shy you numerous securing. ',
                image: '1.jpg'
            }
        ];

        await aws.ClearTable("products")
        await Trans.ClearTransactions()
        var productsPromises = [];

        for (var i = 0; i < PRODUCTS_COUNT; i++) {
            var p = productsTemplates[i%productsTemplates.length];
            productsPromises.push(Product.PutProduct(p.name, p.category, p.description, p.image));
        }

        console.log("wait for all promisies")
        await Promise.all(productsPromises)

        console.log('seeding %s products', productsPromises.length);
    } catch (err) {
        console.log("Err: ", err)
        return response.httpError(err)
    }
    return response.httpResponse(200)
}