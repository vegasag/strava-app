const request = require('request-promise-native');

async function getLeaderboard(clubId, weeksAgo) {
  console.log(clubId, weeksAgo);
  const options = {
    json: true,
    headers: {
      'X-Requested-With': 'XmlHttpRequest',
      'Accept': 'text/javascript'
    }
  };

  const url = `https://www.strava.com/clubs/${clubId}/leaderboard?accesscode=lmao&week_offset=${weeksAgo}`;
  return await request(url, options);
}

module.exports.getLeaderboard = getLeaderboard;
