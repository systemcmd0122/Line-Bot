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

/**
 * Fetches events for a specific month.
 * @param {string[]} calendarIds Array of Google Calendar IDs.
 * @param {number} year
 * @param {number} month 1-12
 * @returns {Promise<Array>} List of events for the month.
 */
async function getEventsForMonth(calendarIds, year, month) {
    const allEvents = [];
    const targetMonthStart = DateTime.fromObject({ year, month, day: 1 }).setZone('Asia/Tokyo').startOf('month');
    const targetMonthEnd = targetMonthStart.endOf('month');

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

                // If event overlaps with target month
                if (start <= targetMonthEnd && end >= targetMonthStart) {
                    allEvents.push({
                        summary: event.summary,
                        location: event.location,
                        description: event.description,
                        start: start.toISO(),
                        end: end.toISO(),
                        isAllDay: event.startDate.isDate,
                        calendarId: id
                    });
                }
            });
        } catch (error) {
            console.error(`Error fetching calendar ${id}:`, error.message);
        }
    }
    // Sort events by start date
    return allEvents.sort((a, b) => DateTime.fromISO(a.start).toMillis() - DateTime.fromISO(b.start).toMillis());
}

module.exports = {
    getEventsForDate,
    getEventsForMonth
};
