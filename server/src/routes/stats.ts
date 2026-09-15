import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { query, one } from "../db.js";
import { requireAdmin, requireFullAuth, userId } from "../auth.js";

/**
 * Statistika: tashkilotchi (Ro'yxat → Statistika) va superadmin (tashkilotchilar kesimida) uchun.
 * Davr — ariza yaratilgan sana bo'yicha (Toshkent vaqti), arxivdagilar ham hisobga olinadi.
 */

const rangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const TZ = "Asia/Tashkent";

/** CEFR Multilevel (75 ballik): C1 ≥ 65, B2 ≥ 51, B1 ≥ 38, aks holda A2 */
const LEVEL_CASE = `CASE WHEN overall IS NULL THEN NULL WHEN overall >= 65 THEN 'C1' WHEN overall >= 51 THEN 'B2' WHEN overall >= 38 THEN 'B1' ELSE 'A2' END`;

/** Overall SQL: topshirilgan (skip=false) ko'nikmalar o'rtachasi, hammasi kiritilgan bo'lsa; aks holda NULL */
const OVERALL_SQL = `
  CASE
    WHEN (NOT r.skip_listening AND r.score_listening IS NULL) OR (NOT r.skip_reading AND r.score_reading IS NULL)
      OR (NOT r.skip_writing AND r.score_writing IS NULL) OR (NOT r.skip_speaking AND r.score_speaking IS NULL) THEN NULL
    WHEN (CASE WHEN r.skip_listening THEN 0 ELSE 1 END + CASE WHEN r.skip_reading THEN 0 ELSE 1 END
        + CASE WHEN r.skip_writing THEN 0 ELSE 1 END + CASE WHEN r.skip_speaking THEN 0 ELSE 1 END) = 0 THEN NULL
    ELSE ROUND((
        COALESCE(CASE WHEN r.skip_listening THEN 0 ELSE r.score_listening END, 0)
      + COALESCE(CASE WHEN r.skip_reading THEN 0 ELSE r.score_reading END, 0)
      + COALESCE(CASE WHEN r.skip_writing THEN 0 ELSE r.score_writing END, 0)
      + COALESCE(CASE WHEN r.skip_speaking THEN 0 ELSE r.score_speaking END, 0)
    ) / (CASE WHEN r.skip_listening THEN 0 ELSE 1 END + CASE WHEN r.skip_reading THEN 0 ELSE 1 END
        + CASE WHEN r.skip_writing THEN 0 ELSE 1 END + CASE WHEN r.skip_speaking THEN 0 ELSE 1 END))
  END`;

interface RangeWhere {
  where: string;
  params: unknown[];
}

function rangeWhere(from: string | undefined, to: string | undefined, startIdx: number): RangeWhere {
  const parts: string[] = [];
  const params: unknown[] = [];
  if (from) {
    params.push(from);
    parts.push(`(r.created AT TIME ZONE '${TZ}')::date >= $${startIdx + params.length - 1}`);
  }
  if (to) {
    params.push(to);
    parts.push(`(r.created AT TIME ZONE '${TZ}')::date <= $${startIdx + params.length - 1}`);
  }
  return { where: parts.length ? " AND " + parts.join(" AND ") : "", params };
}

/** Bitta tashkilotchi (yoki hammasi, ownerId = null) uchun to'liq statistika */
async function buildStats(ownerId: string | null, from?: string, to?: string) {
  const base = ownerId ? "r.user_id = $1" : "TRUE";
  const startIdx = ownerId ? 2 : 1;
  const rw = rangeWhere(from, to, startIdx);
  const params = ownerId ? [ownerId, ...rw.params] : [...rw.params];
  const W = `${base}${rw.where}`;

  // Asosiy jadval: har ariza uchun overall va speaking mavjudligi
  const cte = `
    WITH base AS (
      SELECT r.*, ${OVERALL_SQL} AS overall,
             EXISTS (SELECT 1 FROM recordings rec WHERE rec.registration_id = r.id) AS has_speaking,
             (r.created AT TIME ZONE '${TZ}')::date AS day
      FROM registrations r WHERE ${W}
    )`;

  const totals = await one<Record<string, number | string | null>>(
    `${cte}
     SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
            COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
            COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
            COUNT(*) FILTER (WHERE amount = 0)::int AS free_count,
            COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0)::bigint AS revenue,
            COUNT(*) FILTER (WHERE has_speaking)::int AS with_speaking,
            COUNT(*) FILTER (WHERE results_published_at IS NOT NULL)::int AS published,
            COUNT(*) FILTER (WHERE archived_at IS NOT NULL)::int AS archived,
            ROUND(AVG(overall), 1) AS avg_overall,
            ROUND(AVG(score_listening) FILTER (WHERE NOT skip_listening), 1) AS avg_listening,
            ROUND(AVG(score_reading) FILTER (WHERE NOT skip_reading), 1) AS avg_reading,
            ROUND(AVG(score_writing) FILTER (WHERE NOT skip_writing), 1) AS avg_writing,
            ROUND(AVG(score_speaking) FILTER (WHERE NOT skip_speaking), 1) AS avg_speaking,
            ROUND(AVG(attempts) FILTER (WHERE attempts > 0), 2) AS avg_attempts,
            COUNT(*) FILTER (WHERE attempts >= attempt_limit)::int AS attempts_exhausted
     FROM base`,
    params,
  );

  const levels = await query<{ level: string; n: number }>(
    `${cte} SELECT ${LEVEL_CASE} AS level, COUNT(*)::int AS n FROM base WHERE overall IS NOT NULL GROUP BY 1 ORDER BY 1`,
    params,
  );

  const daily = await query<{ day: string; total: number; approved: number; speaking: number }>(
    `${cte}
     SELECT to_char(day, 'YYYY-MM-DD') AS day, COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
            COUNT(*) FILTER (WHERE has_speaking)::int AS speaking
     FROM base GROUP BY day ORDER BY day`,
    params,
  );

  // Guruh (markaz / ustoz) kesimi — ko'nikmalar bo'yicha o'rtachalar ham qo'shilgan
  const GROUP_METRICS = `
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
            COUNT(*) FILTER (WHERE has_speaking)::int AS with_speaking,
            COUNT(*) FILTER (WHERE results_published_at IS NOT NULL)::int AS published,
            ROUND(AVG(overall), 1) AS avg_overall,
            ROUND(AVG(score_listening) FILTER (WHERE NOT skip_listening), 1) AS avg_listening,
            ROUND(AVG(score_reading) FILTER (WHERE NOT skip_reading), 1) AS avg_reading,
            ROUND(AVG(score_writing) FILTER (WHERE NOT skip_writing), 1) AS avg_writing,
            ROUND(AVG(score_speaking) FILTER (WHERE NOT skip_speaking), 1) AS avg_speaking,
            COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0)::bigint AS revenue,
            COUNT(*) FILTER (WHERE ${LEVEL_CASE} = 'C1')::int AS c1,
            COUNT(*) FILTER (WHERE ${LEVEL_CASE} = 'B2')::int AS b2,
            COUNT(*) FILTER (WHERE ${LEVEL_CASE} = 'B1')::int AS b1,
            COUNT(*) FILTER (WHERE ${LEVEL_CASE} = 'A2')::int AS a2`;
  const groupSql = (col: string) => `${cte}
     SELECT COALESCE(NULLIF(TRIM(${col}), ''), '—') AS name, ${GROUP_METRICS}
     FROM base GROUP BY 1 ORDER BY total DESC, name`;
  type GroupRow = {
    name: string; total: number; approved: number; with_speaking: number; published: number;
    avg_overall: string | null; avg_listening: string | null; avg_reading: string | null;
    avg_writing: string | null; avg_speaking: string | null;
    revenue: number; c1: number; b2: number; b1: number; a2: number;
  };
  const byCenter = await query<GroupRow>(groupSql("center_name"), params);
  const byTeacher = await query<GroupRow>(groupSql("teacher_name"), params);

  // Markaz -> ustozlar: statistikada markaz ustiga bosilganda shu markazning
  // ustozlari va ularning o'quvchilari ko'rinadi.
  const byCenterTeacher = await query<GroupRow & { center: string }>(
    `${cte}
     SELECT COALESCE(NULLIF(TRIM(center_name), ''), '—') AS center,
            COALESCE(NULLIF(TRIM(teacher_name), ''), '—') AS name, ${GROUP_METRICS}
     FROM base GROUP BY 1, 2 ORDER BY center, total DESC, name`,
    params,
  );

  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const grp = (g: GroupRow) => ({
    ...g,
    avg_overall: num(g.avg_overall),
    avg_listening: num(g.avg_listening),
    avg_reading: num(g.avg_reading),
    avg_writing: num(g.avg_writing),
    avg_speaking: num(g.avg_speaking),
    revenue: Number(g.revenue),
  });

  return {
    range: { from: from ?? null, to: to ?? null },
    totals: {
      total: Number(totals?.total ?? 0),
      approved: Number(totals?.approved ?? 0),
      pending: Number(totals?.pending ?? 0),
      rejected: Number(totals?.rejected ?? 0),
      free_count: Number(totals?.free_count ?? 0),
      revenue: Number(totals?.revenue ?? 0),
      with_speaking: Number(totals?.with_speaking ?? 0),
      published: Number(totals?.published ?? 0),
      archived: Number(totals?.archived ?? 0),
      avg_overall: num(totals?.avg_overall),
      avg_listening: num(totals?.avg_listening),
      avg_reading: num(totals?.avg_reading),
      avg_writing: num(totals?.avg_writing),
      avg_speaking: num(totals?.avg_speaking),
      avg_attempts: num(totals?.avg_attempts),
      attempts_exhausted: Number(totals?.attempts_exhausted ?? 0),
    },
    levels: { C1: 0, B2: 0, B1: 0, A2: 0, ...Object.fromEntries(levels.map((l) => [l.level, Number(l.n)])) },
    daily,
    by_center: byCenter.map(grp),
    by_teacher: byTeacher.map(grp),
    by_center_teacher: byCenterTeacher.map((g) => ({ ...grp(g), center: g.center })),
  };
}

const studentsSchema = rangeSchema.extend({
  center: z.string().max(200).optional(),
  teacher: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(300),
});

/** Markaz yoki ustoz kesimidagi o'quvchilar ro'yxati (statistikada qator ochilganda). */
async function listStudents(
  ownerId: string | null,
  f: { center?: string; teacher?: string; from?: string; to?: string; limit: number },
) {
  const conds: string[] = [];
  const params: unknown[] = [];
  const push = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (ownerId) conds.push(`r.user_id = ${push(ownerId)}`);
  // "—" = nomi kiritilmaganlar
  if (f.center !== undefined) {
    conds.push(f.center === "—" ? "COALESCE(NULLIF(TRIM(r.center_name), ''), '—') = '—'" : `TRIM(r.center_name) = ${push(f.center.trim())}`);
  }
  if (f.teacher !== undefined) {
    conds.push(f.teacher === "—" ? "COALESCE(NULLIF(TRIM(r.teacher_name), ''), '—') = '—'" : `TRIM(r.teacher_name) = ${push(f.teacher.trim())}`);
  }
  if (f.from) conds.push(`(r.created AT TIME ZONE '${TZ}')::date >= ${push(f.from)}`);
  if (f.to) conds.push(`(r.created AT TIME ZONE '${TZ}')::date <= ${push(f.to)}`);
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const rows = await query<Record<string, unknown>>(
    `SELECT r.id, r.seq, r.full_name, r.phone, r.center_name, r.teacher_name, r.status,
            r.score_listening, r.score_reading, r.score_writing, r.score_speaking,
            r.skip_listening, r.skip_reading, r.skip_writing, r.skip_speaking,
            r.attempts, r.attempt_limit, r.amount, r.archived_at, r.results_published_at, r.created,
            ${OVERALL_SQL} AS overall,
            EXISTS (SELECT 1 FROM recordings rec WHERE rec.registration_id = r.id) AS has_speaking
       FROM registrations r
       ${where}
       ORDER BY ${OVERALL_SQL} DESC NULLS LAST, r.full_name
       LIMIT ${f.limit}`,
    params,
  );
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    items: rows.map((r) => ({
      id: r.id as string,
      seq: Number(r.seq),
      full_name: r.full_name as string,
      phone: r.phone as string,
      center_name: r.center_name as string,
      teacher_name: r.teacher_name as string,
      status: r.status as string,
      listening: n(r.score_listening),
      reading: n(r.score_reading),
      writing: n(r.score_writing),
      speaking: n(r.score_speaking),
      skip_listening: !!r.skip_listening,
      skip_reading: !!r.skip_reading,
      skip_writing: !!r.skip_writing,
      skip_speaking: !!r.skip_speaking,
      overall: n(r.overall),
      has_speaking: !!r.has_speaking,
      attempts: Number(r.attempts ?? 0),
      attempt_limit: Number(r.attempt_limit ?? 0),
      amount: Number(r.amount ?? 0),
      archived: !!r.archived_at,
      published: !!r.results_published_at,
      created: r.created as Date,
    })),
    limit: f.limit,
  };
}

export async function statsRoutes(app: FastifyInstance) {
  // Tashkilotchi statistikasi (Ro'yxat → Statistika)
  app.get("/api/registrations/stats", { preHandler: requireFullAuth }, async (req, reply) => {
    const parsed = rangeSchema.safeParse(req.query ?? {});
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid range" });
    return buildStats(userId(req), parsed.data.from, parsed.data.to);
  });

  // Tashkilotchi: markaz/ustoz kesimidagi o'quvchilar (statistikada qator ochilganda)
  app.get("/api/registrations/stats/students", { preHandler: requireFullAuth }, async (req, reply) => {
    const parsed = studentsSchema.safeParse(req.query ?? {});
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid filter" });
    return listStudents(userId(req), parsed.data);
  });

  // Superadmin: xuddi shu, lekin butun tizim bo'yicha
  app.get("/api/admin/stats/students", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = studentsSchema.safeParse(req.query ?? {});
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid filter" });
    return listStudents(null, parsed.data);
  });

  // Superadmin: butun tizim + tashkilotchilar kesimida
  app.get("/api/admin/stats/report", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = rangeSchema.safeParse(req.query ?? {});
    if (!parsed.success) return reply.code(400).send({ code: 400, message: "Invalid range" });
    const { from, to } = parsed.data;
    const overall = await buildStats(null, from, to);
    const rw = rangeWhere(from, to, 1);
    const byOrg = await query<{ user_id: string; organizer: string; email: string; total: number; approved: number; with_speaking: number; published: number; avg_overall: string | null; revenue: number }>(
      `SELECT u.id AS user_id,
              COALESCE(NULLIF(s.center_name, ''), NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.username) AS organizer,
              u.email,
              COUNT(r.id)::int AS total,
              COUNT(r.id) FILTER (WHERE r.status = 'approved')::int AS approved,
              COUNT(r.id) FILTER (WHERE EXISTS (SELECT 1 FROM recordings rec WHERE rec.registration_id = r.id))::int AS with_speaking,
              COUNT(r.id) FILTER (WHERE r.results_published_at IS NOT NULL)::int AS published,
              ROUND(AVG(${OVERALL_SQL}), 1) AS avg_overall,
              COALESCE(SUM(r.amount) FILTER (WHERE r.status = 'approved'), 0)::bigint AS revenue
       FROM users u
       LEFT JOIN registration_settings s ON s.user_id = u.id
       LEFT JOIN registrations r ON r.user_id = u.id ${rw.where.replace(/^ AND /, " AND ")}
       WHERE u.role <> 'developer'
       GROUP BY u.id, s.center_name, u.first_name, u.last_name, u.username, u.email
       ORDER BY total DESC, organizer`,
      rw.params,
    );
    return { ...overall, by_organizer: byOrg.map((o) => ({ ...o, avg_overall: o.avg_overall === null ? null : Number(o.avg_overall), revenue: Number(o.revenue) })) };
  });
}
