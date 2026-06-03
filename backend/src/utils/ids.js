const { randomBytes } = require('crypto');
const newId = (prefix='id') => `${prefix}-${randomBytes(5).toString('hex')}`;
const nowISO = () => new Date().toISOString();
const todayISO = () => new Date().toISOString().split('T')[0];
const daysAgoISO = (n) => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; };
module.exports = { newId, nowISO, todayISO, daysAgoISO };
