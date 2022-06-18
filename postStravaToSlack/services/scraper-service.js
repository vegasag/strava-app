const request = require('request-promise-native');
const $ = require('cheerio');

const stravaSessionCookieName = '_strava4_session';

const toEpoch = (date) => (date.getTime() / 1000).toFixed(0);

async function getSession() {
  const loginViewResponse = await request({
    uri: 'https://www.strava.com/login',
    resolveWithFullResponse: true
  });

  const initialCookie = new RegExp(`${stravaSessionCookieName}=(.*?);`).exec(loginViewResponse.headers['set-cookie'])[1];
  const authenticityToken = $('input[name="authenticity_token"]', loginViewResponse.body).val();

  const loginResponse = await request({
    uri: 'https://www.strava.com/session',
    simple: false,
    method: 'POST',
    resolveWithFullResponse: true,
    headers: {
      'Cookie': `${stravaSessionCookieName}=${initialCookie}`
    },
    formData: {
      'authenticity_token': authenticityToken,
      'email': process.env.STRAVA_EMAIL,
      'password': process.env.STRAVA_PWD
    }
  });

  return new RegExp(`${stravaSessionCookieName}=(.*?);`).exec(loginResponse.headers['set-cookie'])[1];
};

async function getActivitiesBefore(session, clubId, date) {
  return await request({
    uri: `https://www.strava.com/clubs/${clubId}/feed?feed_type=club&cursor=${toEpoch(date)}`,
    headers: {
      'Cookie': `${stravaSessionCookieName}=${session}`
    }
  });
}

function toActivity($el) {
  return {
    athlete: $el.find('.entry-athlete').text().replace($el.find('.icon-badge-premium').text(), '').trim(),
    dist: $el.find('[title="Distance"]').text().replace($el.find('.unit').text(), '').trim(),
    date: new Date($el.find('.timestamp').attr('datetime'))
  }
}

async function getLeaderboard(clubId, icon, weeksAgo) {

  const from = new Date();
  from.setDate(from.getDate() - 7 * weeksAgo);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  const activities = [];
  const athletes = {};
  const session = await getSession();
  let before = new Date(to);
  let doneFetchingActivities = false;
  let handbrake = 42;

  while (!doneFetchingActivities && handbrake !== 0) {
    const recentActivity = await getActivitiesBefore(session, clubId, before);
    const $activities = $('.activity', recentActivity);
    if ($activities.length === 0) {
      doneFetchingActivities = true;
    } else {
      $activities.each((idx, el) => {
        const $el = $(el);
        const activity = toActivity($el);
        if (activity.date > from) {
          if ($el.has(`.app-icon.icon-${icon}`).length > 0) {
            activities.push(activity);
          }
          if (activity.date < before) {
            before = activity.date;
          }
        } else {
          doneFetchingActivities = true;
        }
      });
    }
    handbrake--;
  }

  activities.forEach(activity => {
    if (!athletes[activity.athlete]) {
      athletes[activity.athlete] = {
        totalDistance: 0,
        activityCount: 0
      };
    }
    athletes[activity.athlete].totalDistance += parseFloat(activity.dist);
    athletes[activity.athlete].activityCount++;
  });

  return {
    data: Object.keys(athletes).map(athlete => {
      return {
        athlete_id: athlete,
        athlete_firstname: athlete.split(' ')[0],
        athlete_lastname: athlete.split(' ').slice(1).join(' '),
        distance: athletes[athlete].totalDistance * 1000,
        num_activities: athletes[athlete].activityCount
      }
    }).sort((a, b) => b.distance - a.distance)
  }
}

module.exports.getLeaderboard = getLeaderboard;
