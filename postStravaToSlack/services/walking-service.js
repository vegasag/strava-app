const scraperService = require('./scraper-service');

async function getLeaderboard(clubId, weeksAgo) {
  return await scraperService.getLeaderboard(clubId, 'walk', weeksAgo);
}

module.exports.getLeaderboard = getLeaderboard;
