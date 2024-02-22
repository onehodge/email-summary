const GPT_API_KEY = "hidden";
const BASE_URL = "https://api.openai.com/v1/chat/completions";

function buildAddOn() {
  //var summary = "summary";
  var summary = summarizeEmails();
  Logger.log(summary);
  var card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle("Email Summary"))
      .addSection(CardService.newCardSection()
          .addWidget(CardService.newTextParagraph().setText(summary))
      )
      .build();
  return [card];
}

function summarizeEmails() {
  var emails = fetchEmails();
  var summary = callGPT(emails);
  return summary;
}

function fetchEmails() {
  var now = new Date();
  var oneDayAgo = new Date(now.getTime() - 24*60*60*1000);
  var query = 'after:' + oneDayAgo.toISOString().split('T')[0];
  var threads = GmailApp.search(query);
  var email_prompt = "Summarize the following emails:\n";
  
  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    for (var j = 0; j < messages.length; j++) {
      var message = messages[j];
      email_prompt += "Subject: " + message.getSubject() + "\n" + "Message: " + message.getPlainBody() + "\n\n";
      if (email_prompt.length > 10000) {
        Logger.log("Emails: " + email_prompt);
        return email_prompt;
      }
    }
  }
  Logger.log("Emails: " + email_prompt);
  return email_prompt;
}

function callGPT(email_prompt) {
  var openaiUrl = BASE_URL;
  var apiKey = GPT_API_KEY;
  
  var payload = {
    model: "gpt-3.5-turbo-0125",
    messages: [{
      role: "system",
      content: "You are a personal assistant, reporting an overview of the user's email inbox today. Keep each summary to one line or as short as possible. No style, just use ordered list format."
    }, {
      role: "user",
      content: email_prompt
    }],
    temperature: 0.2,
    max_tokens: 2000,
  };
  
  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true 
  };
  
  try {
    var response = UrlFetchApp.fetch(openaiUrl, options);
    var jsonResponse = JSON.parse(response.getContentText());
    if (response.getResponseCode() == 200) {
    if (jsonResponse.choices && jsonResponse.choices.length > 0) {
      return jsonResponse.choices[0].message.content;
    } else {
      Logger.log("API response does not contain choices.");
      return "The API returned an unexpected response format.";
    }
    } else {
      Logger.log("API returned an error: " + jsonResponse.error.message);
      return "Error from API: " + jsonResponse.error.message;
    }
  } catch (e) {
    Logger.log("Error calling ChatGPT API: " + e.toString());
    return "Exception occurred: " + e.toString();
  }
}
