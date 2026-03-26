const pool = require("../src/config/db");
const slugify=require("./slugify")

const generateUniqueSlug = async (title, excludeId = null) => {
  const base = slugify(title, { lower: true, strict: true, trim: true });
 
  let candidate = base;
  let counter   = 1;
 
  while (true) {
    const query = excludeId
      ? `SELECT id FROM posts WHERE slug = $1 AND id != $2 LIMIT 1`
      : `SELECT id FROM posts WHERE slug = $1 LIMIT 1`;
 
    const params = excludeId ? [candidate, excludeId] : [candidate];
    const { rows } = await pool.query(query, params);
 
    if (!rows.length) return candidate;   // unique — done
 
    counter   += 1;
    candidate  = `${base}-${counter}`;
  }
};
 
module.exports = {generateUniqueSlug};