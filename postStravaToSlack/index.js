module.exports = async function (context, myTimer) {
    var timeStamp = new Date().toISOString();

    if (myTimer.IsPastDue) {
        context.log('JavaScript is running late!');
    }
    context.log('JavaScript timer trigger function ran!', timeStamp);

    const { WebClient } = require('@slack/client');
    const apiService = require('./services/api-service');

    // const slackToken = process.env.SLACK_TOKEN;
    const slackToken = '';

    const webClient = new WebClient(slackToken);
    const conversationId = 'løpegruppen';

    const clubs = [
        { id: '526085', name: 'ITverket Løpeklubb', emoji: '🏃‍♀️', service: apiService },
        // { id: '', name: '', emoji: '🚴', service: apiService },
    ];

    async function getLeaderboardWithTrend(clubId, service) {
        let lastWeek = await service.getLeaderboard(clubId, 1).then(response => response.data);
        let theWeekBefore = await service.getLeaderboard(clubId, 2).then(response => response.data);
        let prevDistance = {};
        theWeekBefore.forEach(a => prevDistance[a.athlete_id] = a.distance);
        function trendMoji(lastWeek, weekBefore) {
            let diff = lastWeek - weekBefore;
            return diff > 0 ? '📈' :
                diff < 0 ? '📉' : '';
        }
        return lastWeek.map(a => Object.assign({}, a, {
            trend: trendMoji(a.distance, prevDistance[a.athlete_id] || 0)
        }));
    }

    clubs.forEach(c => {
        getLeaderboardWithTrend(c.id, c.service)
            .then(entries => entries.map((e, idx) => {
                const name = `${e.athlete_firstname} ${e.athlete_lastname}`;
                const dist = (e.distance / 1000).toFixed(2);
                const activities = e.num_activities;
                return `*${idx + 1}* ${name}: *${dist} km* (${activities} ${activities === 1 ? 'aktivitet' : 'aktiviteter'}) ${e.trend}`;
            }))
            .then(list => {
                if (list.length !== 0) {
                    let message = `*Forrige ukes toppliste for _${c.name}_ ${c.emoji}*\n${list.join('\n')}`;
                    webClient.chat.postMessage({ channel: conversationId, text: message })
                        .then((res) => {
                            console.log('Message sent: ', res.ts);
                        })
                        .catch(console.error);
                }
            })
    });

};