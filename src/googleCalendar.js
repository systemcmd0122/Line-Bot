const axios = require('axios');
const ICAL = require('ical.js');
const { DateTime } = require('luxon');

/**
 * Fetches and parses Google Calendar iCal feeds.
 * @param {string[]} calendarIds Array of Google Calendar IDs.
 * @param {DateTime} targetDate The date to filter events for.
 * @returns {Promise<Array>} List of events for the target date.
 */
async function getEventsForDate(calendarIds, targetDate) {
    const allEvents = [];

    for (const id of calendarIds) {
        try {
            const url = `https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`;
            const response = await axios.get(url);
            const jcalData = ICAL.parse(response.data);
            const comp = new ICAL.Component(jcalData);
            const vevents = comp.getAllSubcomponents('vevent');

            vevents.forEach(vevent => {
                const event = new ICAL.Event(vevent);
                const dtstart = event.startDate.toJSDate();
                const dtend = event.endDate.toJSDate();

                const start = DateTime.fromJSDate(dtstart).setZone('Asia/Tokyo');
                const end = DateTime.fromJSDate(dtend).setZone('Asia/Tokyo');

                const targetStart = targetDate.startOf('day');
                const targetEnd = targetDate.endOf('day');

                if (start <= targetEnd && end >= targetStart) {
                    allEvents.push({
                        summary: event.summary,
                        location: event.location,
                        description: event.description,
                        start: start.toISO(),
                        end: end.toISO(),
                        isAllDay: event.startDate.isDate
                    });
                }
            });
        } catch (error) {
            console.error(`Error fetching calendar ${id}:`, error.message);
        }
    }
    return allEvents;
}

module.exports = {
    getEventsForDate
};
