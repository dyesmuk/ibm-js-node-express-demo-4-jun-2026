// src/utils/queryHelper.js
// Demonstrates: Sorting, Pagination, and Filtering (Task App topic)
// JavaScript: Objects, Functions, Operators, Control Flow

/**
 * Parse common query params and return a Mongoose-ready options object.
 *
 * Supported query params:
 *   ?page=2&limit=10          – pagination
 *   ?sortBy=salary:desc       – sorting  (field:asc|desc)
 *   ?isActive=true            – filtering (key=value, applied to query directly)
 *   ?fields=firstName,email   – field projection
 *
 * Usage:
 *   const { filter, sort, skip, limit, projection } = parseQuery(req.query, ['isActive', 'department']);
 */
const parseQuery = (query = {}, allowedFilters = []) => {
  const page   = Math.max(parseInt(query.page)  || 1, 1);
  const limit  = Math.min(parseInt(query.limit) || 10, 100); // cap at 100
  const skip   = (page - 1) * limit;

  // ── Sort ──────────────────────────────────────────────────
  let sort = { createdAt: -1 }; // default: newest first
  if (query.sortBy) {
    const [field, order] = query.sortBy.split(':');
    sort = { [field]: order === 'desc' ? -1 : 1 };
  }

  // ── Filter ────────────────────────────────────────────────
  const filter = {};
  allowedFilters.forEach((key) => {
    if (query[key] !== undefined) {
      // Convert 'true'/'false' strings to booleans
      if (query[key] === 'true')  filter[key] = true;
      else if (query[key] === 'false') filter[key] = false;
      else filter[key] = query[key];
    }
  });

  // ── Search (text) ─────────────────────────────────────────
  if (query.search) {
    filter.$or = [
      { firstName: { $regex: query.search, $options: 'i' } },
      { lastName:  { $regex: query.search, $options: 'i' } },
      { email:     { $regex: query.search, $options: 'i' } },
    ];
  }

  // ── Field Projection ──────────────────────────────────────
  let projection = null;
  if (query.fields) {
    projection = query.fields.split(',').join(' ');
  }

  return { filter, sort, skip, limit, page, projection };
};

/**
 * Build a standard paginated response envelope.
 */
const paginatedResponse = (data, total, page, limit) => ({
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  },
});

module.exports = { parseQuery, paginatedResponse };
