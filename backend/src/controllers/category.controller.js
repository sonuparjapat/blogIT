const pool = require("../config/db");
const slugify = require("slugify");

/* ================= GET ALL CATEGORIES ================= */

exports.getCategories = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        COUNT(pc.post_id) AS "postCount"
      FROM categories c
      LEFT JOIN post_categories pc 
      ON c.id = pc.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to fetch categories"
    });

  }
};


/* ================= CREATE CATEGORY ================= */

exports.createCategory = async (req, res) => {

  try {

    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Category name required"
      });
    }

    const slug = slugify(name, { lower: true });
const existing = await pool.query(
  "SELECT id FROM categories WHERE slug=$1",
  [slug]
);

if (existing.rows.length) {
  return res.status(400).json({
    message: "Category already exists"
  });
}
    const result = await pool.query(
      `
   INSERT INTO categories(name, slug, description)
VALUES($1,$2,$3)
      RETURNING *
      `,
   [name, slug, description || null]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to create category"
    });

  }

};


/* ================= UPDATE CATEGORY ================= */

exports.updateCategory = async (req, res) => {

  try {

    const { id } = req.params;
    const { name,description } = req.body;

    const slug = slugify(name, { lower: true });

    const result = await pool.query(
      `
     UPDATE categories
SET name=$1, slug=$2, description=$3
WHERE id=$4
      RETURNING *
      `,
   [name, slug, description || null, id]
    );

    res.json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to update category"
    });

  }

};


/* ================= DELETE CATEGORY ================= */

exports.deleteCategory = async (req, res) => {

  try {

    const { id } = req.params;

    await pool.query(
      `DELETE FROM categories WHERE id=$1`,
      [id]
    );

    res.json({
      message: "Category deleted"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to delete category"
    });

  }

};