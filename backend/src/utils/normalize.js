function n(obj) {
  if (!obj) return null;
  if (Array.isArray(obj)) return obj.map(n);
  const r = { ...obj };
  if (r._id !== undefined) r.id = r._id;
  ['caterer','school','reviewer','sender','headmaster','caterer2','district','region','user','creator'].forEach(k => {
    if (r[k] && typeof r[k]==='object' && !Array.isArray(r[k])) r[k]=n(r[k]);
  });
  return r;
}
module.exports = { n };
