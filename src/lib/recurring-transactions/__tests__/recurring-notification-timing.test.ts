import assert from 'node:assert/strict';
import { daysBetween } from '../utils/dates';
import { shouldSendUpcomingReminder } from '../recurring-notification-check';

// Reminder timing
assert.equal(shouldSendUpcomingReminder(2, 2), true, '2 days before when reminder is 2');
assert.equal(shouldSendUpcomingReminder(0, 2), true, 'due today always reminds');
assert.equal(shouldSendUpcomingReminder(1, 2), false, '1 day before when reminder is 2');
assert.equal(shouldSendUpcomingReminder(3, 2), false, '3 days before when reminder is 2');

// daysBetween uses calendar dates
assert.equal(daysBetween('2026-06-01', '2026-06-03'), 2);

console.log('✓ Recurring notification timing tests passed');
