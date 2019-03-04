'use strict';

/**
 * Standard response builders
 * 
 */

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}

// --------------- Functions that control the skill's behavior -----------------------

/**
 * Welcome to CA APIM Alexa demo greeting
 *  
 */
function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to the CA Alexa demo.';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Please say: hello gateway: or, request with token: or, M. F. A. service';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

/**
 * Client requested end session
 * 
 */
function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for trying the CA Alexa demo.';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

/**
 * Called from pinAction
 * Establishes valid secure session based on OTP
 */
function createAccNoAttributes(accNo) {
    return {
        accNo,
    };
}

/**
 * Say hello to API gateway
 * 
 */
function helloGateway(intent, session, callback) {
    const cardTitle = intent.name;
    var request = require('request');
    var mqtt = require('mqtt');
    const userID = session.user.userId;
    const sessionAttributes = {};
    let repromptText = '';
    let speechOutput = '';
    var MagServer = process.env.MagServer;
    let query ='';
    query = "https://" + MagServer + "/alexa/helloGateway";
    
    console.log('intent.name: ', cardTitle);
    console.log('UserID: ', session.user.userId);
    console.log('CA OTK Token: ', session.user.accessToken);
    console.log('AppID: ', session.application.applicationId);
    console.log('sessionAttributes: ', sessionAttributes);
    
    request({
      url: query,
      rejectUnauthorized: false,
      requestCert: true,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: ''
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        speechOutput = body;
        repromptText = 'Reaady for next command. Say: hello gateway: or: request with token: or: ,M. F. A. service';
        callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, false));
      }
      
      else {
        speechOutput = "Error.  Please try again";
        callback(session.attributes,
         buildSpeechletResponse(cardTitle, speechOutput, '', false));
      }
    });
}

/**
 * Request to API gateway with OAuth token validation
 * 
 */
function requireOauth(intent, session, callback) {
    const cardTitle = intent.name;
    let repromptText = '';
    var MagServer = process.env.MagServer;
    const shouldEndSession = false;
    let sessionAttributes = {};
    let query ='';
    var request = require('request');
    let speechOutput = '';
    console.log('intent.name: ', cardTitle);
    console.log('CA OTK Token: ', session.user.accessToken);
    
    query = "https://" + MagServer + "/alexa/addToken";
    
    request({
      url: query,
      rejectUnauthorized: false,
      requestCert: true,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' +  session.user.accessToken
      },
      body: ''
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        speechOutput = body;  
        repromptText = 'Say: hello gateway: or: request with token: or: ,M. F. A. service';
        callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, false));
      }
      if (response.statusCode == 403) {
        speechOutput = 'Sorry, need access token for that.';
        repromptText = 'Please link accounts for a CA OAuth access token';
        callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, false));
      }
      if (response.statusCode == 401) {
        speechOutput = 'Unauthorized user. Device user not found in the alexa group';
        repromptText = 'Device user not found in the alexa group';
        callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, false));
      }
      else {
        speechOutput = "Error. Say: hello gateway: or: request with token: or: ,M. F. A. service";
        repromptText = 'Sorry, I am seeing an error response';
        callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, false));
      }
    });
}

/**
 * MFA Service,  This service rquires OAuth and PIN session to access.
 * 
 */
function mfaService(intent, session, callback) {
    const cardTitle = intent.name;
    let speechOutput = '';
    var request = require('request');
    let query ='';
    let accNo;
    
    if (session.attributes) {
      accNo = session.attributes.accNo;
    }
    if (accNo) {
        query = "https://" + process.env.MagServer + "/alexa/secureService?pin=" + session.attributes.accNo;
        request({
          url: query,
          rejectUnauthorized: false,
          requestCert: true,
          method: 'GET',
          headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' +  session.user.accessToken
          },
          body: ''
          }, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            speechOutput = body;        
            callback(session.attributes,
            buildSpeechletResponse(cardTitle, speechOutput, '', false));
            }
          else {
            speechOutput = "Error retrieving the secure message with PIN.  Please try that again.";
            callback(session.attributes,
            buildSpeechletResponse(cardTitle, speechOutput, '', false));}
            });
            }
    else {
        query = "https://" + process.env.MagServer + "/alexa/sendPIN";
        request({
          url: query,
          rejectUnauthorized: false,
          requestCert: true,
          method: 'GET',
          headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' +  session.user.accessToken
          },
          body: ''
          }, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            speechOutput = body;        
            callback(session.attributes,
            buildSpeechletResponse(cardTitle, speechOutput, '', false));
            }
          else {
            speechOutput = "Error in validation of the sent multi factor authenticator.  Please try that again.";
            callback(session.attributes,
            buildSpeechletResponse(cardTitle, speechOutput, '', false));}
            });
    } 
  }

/**
 * Send PIN recieved to Alexa for validation
 * 
 */
function pinAction(intent, session, callback) {
    const PIN = intent.slots.PIN.value;
    const cardTitle = intent.name;
    let repromptText = '';
    var MagServer = process.env.MagServer;
    const shouldEndSession = false;
    let sessionAttributes = {};
    let query ='';
    var request = require('request');
    let speechOutput = '';
    console.log('intent.name: ', cardTitle);
    console.log('CA OTK Token: ', session.user.accessToken);
    
    query = "https://" + MagServer + "/alexa/pinAction?pin=" + PIN;
    
    request({
      url: query,
      rejectUnauthorized: false,
      requestCert: true,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' +  session.user.accessToken
      },
      body: ''
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log('BODY: ', body);
        var jsonResponse = JSON.parse(body); // turn response into JSON
        sessionAttributes = createAccNoAttributes(jsonResponse.accNo);
        speechOutput = jsonResponse.speechOutput; 
        repromptText = 'secure service is now enabled';
        callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, false));
      }
      if (response.statusCode == 401) {
        speechOutput = 'Sorry, need pin validation for that operation.';
        repromptText = 'Please say: pin number. then read the pin delivered';
        callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, false));
      }
      else {
        speechOutput = "Error. Say: hello gateway: or: request with token: or: ,O.T.P. service";
        repromptText = '';
        callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, false));
      }
    });
}

/**
 * Logout of session
 * 
 */
function logoutSession(intent, session, callback) {
    let speechOutput = `Goodbye friends of CA, we hope you have enjoyed this Alexa demo`;
    let repromptText = ``;
    const sessionAttributes = {};
    
    callback(sessionAttributes,
         buildSpeechletResponse(intent.name, speechOutput, repromptText, true));
}

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}, deviceId=${launchRequest.deviceId},`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent intentName=${intentRequest.intent.name} requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
   if (intentName === 'MyLogoutIntent') {
        logoutSession(intent, session, callback);
    }
    else if (intentName === 'HelloGatewayIntent') {
        helloGateway(intent, session, callback);
    }
    else if (intentName === 'PinActionIntent') {
        pinAction(intent, session, callback);
    }
    else if (intentName === 'AddTokenIntent') {
        requireOauth(intent, session, callback);
    }
    else if (intentName === 'MFAServiceIntent') {
        mfaService(intent, session, callback);
    }
    else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
