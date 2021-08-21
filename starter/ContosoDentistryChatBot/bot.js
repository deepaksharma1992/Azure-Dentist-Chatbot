// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

const { QnAMaker } = require('botbuilder-ai');
const DentistScheduler = require('./dentistscheduler');
const IntentRecognizer = require("./intentrecognizer")

class DentaBot extends ActivityHandler {
    constructor(configuration, qnaOptions) {
        // call the parent constructor
        super();
        if (!configuration) throw new Error('[QnaMakerBot]: Missing parameter. configuration is required');

        // create a QnAMaker connector
        this.qnaMaker = new QnAMaker(configuration.QnAConfiguration, qnaOptions);
       
        // create a DentistScheduler connector
        this.schedulerConnector = new DentistScheduler(configuration.SchedulerConfiguration)
        // create a IntentRecognizer connector
        // create a LUIS connector
        this.intentRecognizer = new IntentRecognizer(configuration.LuisConfiguration);

        this.onMessage(async (context, next) => {
            // send user input to QnA Maker and collect the response in a variable
            // don't forget to use the 'await' keyword
            const qnaResults = await this.qnaMaker.getAnswers(context);
            const LuisResult = await this.intentRecognizer.executeLuisQuery(context);


            if (LuisResult.luisResult.prediction.topIntent === "GetAvailability" &&
                LuisResult.intents.GetAvailability.score > .6 &&
                LuisResult.entities.$instance && 
                LuisResult.entities.$instance.daytime && 
                LuisResult.entities.$instance.daytime[0]
            ) {
                const dateTime = LuisResult.entities.$instance.daytime[0].text;
                // call api with location entity info
                const getTimeOfDentist = "I found dentist clinic location at " + dateTime;
                console.log(getTimeOfDentist)
                await context.sendActivity(getTimeOfDentist);
                await next();
                return;
            }            
            // If an answer was received from QnA Maker, send the answer back to the user.
            if (qnaResults[0]) {
                console.log(qnaResults[0])
                await context.sendActivity(`${qnaResults[0].answer}`);
            }
            else {
                // If no answers were returned from QnA Maker, reply with help.
                await context.sendActivity(`I'm not sure`
                    + 'I found an answer to your question'
                    + `You can ask me questions about can I schedule an Dentist appointment?"`);
            }
            await next();
        });
           
        this.onMembersAdded(async (context, next) => {
        const membersAdded = context.activity.membersAdded;
        //write a custom greeting
        const welcomeText = 'Hello Greeting from Dentist Bot. How can I help you today?';
        for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
            if (membersAdded[cnt].id !== context.activity.recipient.id) {
                await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
            }
        }
        // by calling next() you ensure that the next BotHandler is run.
        await next();
    });
    }
}

module.exports.DentaBot = DentaBot;
