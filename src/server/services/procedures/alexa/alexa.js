const _ = require('lodash');

const Alexa = {};

const AlexaSMAPI = require('ask-smapi-sdk');

const devLogger = require('../utils/dev-logger');

var clientID = process.env.ALEXA_CLIENT_ID,
    clientSecret = process.env.ALEXA_CLIENT_SECRET,
    refreshToken = process.env.ALEXA_REFRESH_TOKEN,
    accessToken = process.env.ALEXA_ACCESS_TOKEN,
    vendorID = process.env.ALEXA_VENDOR_ID;

//temp
var refreshTokenConfig = {
    "clientId" : clientID,
    "clientSecret": clientSecret,
    "refreshToken": refreshToken,
    "accessToken": accessToken,
};

//creates SMAPI client
var smapiClient = new AlexaSMAPI.StandardSmapiClientBuilder()
    .withRefreshTokenConfig(refreshTokenConfig)
    .client();

const ensureLoggedIn = function(caller) {
    if (!caller.username) {
        throw new Error('Login required.');
    }
};

//update tokens
Alexa.getTokens = function() {
    refreshToken = process.env.ALEXA_REFRESH_TOKEN;
    accessToken = process.env.ALEXA_ACCESS_TOKEN;

    refreshTokenConfig.refreshToken = refreshToken;
    refreshTokenConfig.accessToken = accessToken;

    devLogger.log(refreshTokenConfig.refreshToken);
    devLogger.log(refreshTokenConfig.accessToken);

    smapiClient = new AlexaSMAPI.StandardSmapiClientBuilder()
        .withRefreshTokenConfig(refreshTokenConfig)
        .client();

    return refreshTokenConfig;
};

Alexa.getVendorList = async function () {
    const response = await smapiClient.getVendorListV1();
    devLogger.log(JSON.stringify(response));

    return response;
};

//basic listSkills RPC
Alexa.listSkills = async function() {
    const response = await smapiClient.listSkillsForVendorV1(vendorID);
    devLogger.log(JSON.stringify(response));

    return response.skills;
};

//gets skill Info
Alexa.getSkillInfo = async function(skillId, stage) {
    const response = await smapiClient.getSkillManifestV1(skillId, stage);
    devLogger.log(JSON.stringify(response));

    return response;
};

createManifest = function(summary, description, examplePhrases, keywords, name) {
    let skillRequest =
        {
            "vendorId": vendorID,
            "manifest": {
                "publishingInformation": {
                    "locales": {
                        "en-US": {
                            "summary": summary,
                            "examplePhrases": examplePhrases,
                            "keywords": keywords,
                            "name": name,
                            "description": description
                        }
                    },
                    "isAvailableWorldwide": false,
                    "testingInstructions": "CUSTOM",
                    "category": "",
                    "distributionCountries": [
                        "US",
                    ]
                },
                "apis": {
                    "custom": {}
                },
                "manifestVersion": "1.0",
                "privacyAndCompliance": {
                    "allowsPurchases": false,
                    "usesPersonalInfo": false,
                    "isChildDirected": false,
                    "isExportCompliant": true,
                    "containsAds": false,
                    "locales": {
                        "en-US": {
                            "privacyPolicyUrl": "https://editor.netsblox.org/privacy.html",
                            "termsOfUseUrl": "https://editor.netsblox.org/tos.html"
                        }
                    }
                },
            }
        };

    devLogger.log(JSON.stringify(skillRequest));

    return skillRequest;
};

Alexa.updateSkillManifest = async function(skillId, stage, summary, description, examplePhrases, keywords, name) {
    const response = await smapiClient.createSkillForVendorV1(
        createManifest(summary, description, examplePhrases, keywords, name));
    devLogger.log(JSON.stringify(response));

    return response;
};

//untested createSkill RPC
Alexa.createSkill = async function(summary, description, examplePhrases, keywords, name) {
    const response = await smapiClient.createSkillForVendorV1(
        createManifest(summary, description, examplePhrases, keywords, name));
    devLogger.log(JSON.stringify(response));

    return response;
};

//get interaction model of skill
Alexa.getInteractionModel = async function (skillId, stage) {
    const response = await smapiClient.getInteractionModelV1(skillId, stage, 'en-US');
    devLogger.log(JSON.stringify(response));

    return response;
};

Alexa.createSlot = function(intent, name, samples, prompts) {
    let list = [];

    list.push([intent, name, samples, prompts]);
    return list;
};

const createSlotsObject = function(intent, name, samples, prompts) {
    let variations = [];
    for (let i in prompts) {
        variations.push(
            {
                "type": "PlainText",
                "value": i
            }
        );
    }
    let slotInfo =
        {
            "intentSlotInfo" : {
                "name": name,
                "type": "AMAZON.SearchQuery",
                "samples": samples,
            },
            "slotInfo" : {
                "name": name,
                "type": "AMAZON.SearchQuery",
                "confirmationRequired": false,
                "elicitationRequired": true,
                "prompts": {
                    "elicitation": "Elicit.Intent-:" + intent + ".IntentSlot-" + name
                }
            },
            "promptInfo" : {
                "id": "Elicit.Intent-:" + intent + ".IntentSlot-" + name,
                "variations": variations
            }
        };


    devLogger.log(JSON.stringify(slotInfo));

    return slotInfo;
};

Alexa.createIntent = function (name, slots, samples) {
    let list = [];

    list.push([name, slots, samples]);
    return list;
};

const createIntentsObject = function(name, slots, samples) {
    let slotsObjectsList = [];
    for (let i in slots) {
        slotsObjectsList.push(createSlotsObject(i[0], i[1], i[2], i[3]));
    }

    let intent =
        {
            "name": name,
            "slots": [],
            "samples": samples
        };

    for (let i in slotsObjectsList) {
        intent.slots.push(i.intentSlotInfo);
    }
    devLogger.log(JSON.stringify(intent));

    return intent;
};

const createSecondIntentsObject = function(name, slots, samples) {
    let slotsObjectsList = [];
    let slotObjectsReturn = [];

    for (let i in slots) {
        slotsObjectsList.push(createSlotsObject(i[0], i[1], i[2], i[3]));
    }

    for (let i in slotsObjectsList) {
        slotObjectsReturn.push([i.slotInfo, i.promptInfo]);
    }

    devLogger.log(JSON.stringify(slotObjectsReturn));

    return slotObjectsReturn;
};

Alexa.createInteractionModel = async function (skillId, stage, intents) {
    let intentsList = [];
    let slotInfos = [];
    for (let i of intents) {
        intentsList.push(createIntentsObject(i[0], i[1], i[2]));
        slotInfos.push(createSecondIntentsObject(i[0], i[1], i[2]));
    }

    let intentsArray = [];
    let intentsSlots = [];
    let promptsSlots = [];

    for (let i of intentsList) {

        intentsArray.push(
            {
                "name": i.name,
                "slots": i.slots,
                "samples": i.samples
            }
        );
    }

    for (let i of slotInfos) {
        intentsSlots.push(
            {
                "name": "GetTravelTime",
                "confirmationRequired": false,
                "prompts": {},
                "slots": i[0]
            }
        );
        promptsSlots.push(i[1]);
    }

    const interactionModel =
        {
            "interactionModel": {
                "languageModel": {
                    "invocationName": name,
                    "modelConfiguration": {
                        "fallbackIntentSensitivity": {
                            "level": "LOW"
                        }
                    },
                    "intents": intentsArray,
                },
                "dialog": {
                    "intents": intentsSlots,
                    "delegationStrategy": "ALWAYS"
                },
                "prompts": promptsSlots
            }
        };

    devLogger.log(JSON.stringify(interactionModel));

    const response = await smapiClient.setInteractionModelV1(skillId, stage, 'en-US', interactionModel);
    devLogger.log(response);

    return response;
};

/**
 * Return the caller info as detected by the server.
 * This was added to test the github action and is hopefully useful! :)
 */
Alexa.callerInfo = function() {
    return _.omit(this.caller, ['response', 'request', 'socket', 'apiKey']);
};

//further RPCs for testing only
Alexa.getVendorId = function () {
    return vendorID;
};

module.exports = Alexa;