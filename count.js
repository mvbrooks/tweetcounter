// Google Apps Script for counting tweets from a list of handles


TWITTER_CONSUMER_KEY = '[YOUR TWITTER KEY]';
TWITTER_CONSUMER_SECRET = '[YOUR TWITTER SECRET]';
HANDLE_IMPORT_SHEET = '[NAME OF TAB WITH HANDLES]';
HANDLE_IMPORT_RANGE = '[COL WITH HANDLES E.G. A:A]'; //handles should be in this column with the format @handle
EXPORT_SHEET = '[NAME OF TAB FOR OUTPUT]';
HASHTAG = '[HASTHAG TO TRACK]'


//
// Count the tweets and write stats to export sheet
//
function countTweets() {
  // Encode consumer key and secret
  var tokenUrl = "https://api.twitter.com/oauth2/token";
  var tokenCredential = Utilities.base64EncodeWebSafe(
    TWITTER_CONSUMER_KEY + ":" + TWITTER_CONSUMER_SECRET);
  
  //  Obtain a bearer token with HTTP POST request
  var tokenOptions = {
    headers : {
      Authorization: "Basic " + tokenCredential,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" 
    },
    method: "post",
    payload: "grant_type=client_credentials"
  };
  
  var responseToken = UrlFetchApp.fetch(tokenUrl, tokenOptions);
  var parsedToken = JSON.parse(responseToken);
  var token = parsedToken.access_token;
  
  // Get the tab to dump raw counts, create header row
  var sheet = SpreadsheetApp.getActive().getSheetByName(EXPORT_SHEET);
  sheet.clearContents();
  sheet.appendRow([new Date()]);
  sheet.appendRow(["handle","day tweets","week tweets","day HT","week HT","day favs","week favs","day RT","week RT"]);
  
  // Grab twitter handles from appropriate tab, strip @, count tweets for each and append rows
  var handles = SpreadsheetApp.getActive().getSheetByName(HANDLE_IMPORT_SHEET).getRange(HANDLE_IMPORT_RANGE).getValues();
  for (var i = 0; i < handles.length; i++) {
    if(handles[i] != "" && handles[i].toString().charAt(0) == "@") {
      var handle = handles[i].toString().replace("@","");
      var counts = count(handle, token);
      sheet.appendRow(["@"+handle, counts[0], counts[1], counts[2], counts[3], counts[4], counts[5], counts[6], counts[7]]);
    }
  }
}


// Get midnight on Monday of this week
function getMonday() {
  var yesterday = (new Date()).getDay() - 1 || 7;
  var monday = new Date();
  monday.setHours(-24 * yesterday,0,0,0);
  return monday;
}


// Get midnight yesterday
function getYesterday() {
  var yesterday = new Date();
  yesterday.setHours(-24,0,0,0);
  return yesterday;
}


// Check if a tweet object has the hashtag
function hasHashtag(tweet, hashtag) {
  if (tweet.entities && tweet.entities.hashtags) {
    var hashtags = tweet.entities.hashtags;
    for (var i = 0; i < hashtags.length; i++) {
      if (hashtags[i].text == hashtag) {
        return true;
      }
    }
  }
  
  return false;
}


function count(handle, token) {
  // Authenticate Twitter API requests with the bearer token
  var apiUrl = "https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=" + handle + "&count=200&tweet_mode=extended";
  var apiOptions = {
    headers : {
      Authorization: 'Bearer ' + token
    },
    "method" : "get"
  };
  
  try {
    var responseApi = UrlFetchApp.fetch(apiUrl, apiOptions);
    
    var result = "";
    
    if (responseApi.getResponseCode() == 200) {
      
      // Parse the JSON encoded Twitter API response
      var tweets = JSON.parse(responseApi.getContentText());
      var tweetCounter = [];
      var dayTweets = 0;
      var weekTweets = 0;
      var dayHTs = 0;
      var weekHTs = 0;
      var dayFavs = 0;
      var weekFavs = 0;
      var dayRetweets = 0;
      var weekRetweets = 0;
      if (tweets) {
        for (var i = 0; i < tweets.length; i++) {
          
          var created = new Date(tweets[i].created_at);

          // Only count this week's tweets
          if (created >= getMonday()) {
            
            // Yesterday
            if (created >= getYesterday()) {
              
              // Only count favorites/retweets on tweets that aren't themselves retweets
              if (!tweets[i].retweeted_status) {
                dayFavs += tweets[i].favorite_count;
                dayRetweets += tweets[i].retweet_count;
              }
              
              if (hasHashtag(tweets[i], HASHTAG)) {
                  dayHTs++;
              }
              dayTweets++;
            }
            
            // This week
            // Only count favorites/retweets on tweets that aren't themselves retweets
            if (!tweets[i].retweeted_status) {
              weekFavs += tweets[i].favorite_count;
              weekRetweets += tweets[i].retweet_count;
            }
            
            if (hasHashtag(tweets[i], HASHTAG)) {
              weekHTs++;
            }
            weekTweets++;
          }
        }
        
        tweetCounter.push(dayTweets);
        tweetCounter.push(weekTweets);
        tweetCounter.push(dayHTs);
        tweetCounter.push(weekHTs);
        tweetCounter.push(dayFavs);
        tweetCounter.push(weekFavs);
        tweetCounter.push(dayRetweets);
        tweetCounter.push(weekRetweets);
        return tweetCounter;
      }
    }
  }
  catch (e) {
    var sheet = SpreadsheetApp.getActive().getSheetByName('counts');
    sheet.appendRow(["error",e]);
  }
  
  return [];
}
